"""HomeVal model registry, inference, history, training and sandbox billing."""
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Literal
import hashlib
import hmac
import json
import os
import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from deps import get_admin, get_current_user, optional_user
from models import User, ModelVersion, TrainingJob, Prediction, Checkout, Subscription, utcnow
from security import SECRET
from ml import MODEL_GUIDES, FEATURES, dataset_info, train_model, predict_artifact

router=APIRouter(prefix="/api",tags=["HomeVal"])
training_lock=threading.Lock()
publication_lock=threading.Lock()

def premium(user,db):
    if not user:return False
    if user.role=="admin":return True
    sub=db.get(Subscription,user.id)
    return bool(sub and sub.expires_at.replace(tzinfo=timezone.utc)>utcnow())

def entitlement(user,db):
    sub=db.get(Subscription,user.id)
    return dict(plan="premium" if premium(user,db) else "free",role=user.role,
        expires_at=sub.expires_at.isoformat() if sub else None,
        sandbox=os.getenv("HOMEVAL_DEMO_BILLING")=="1",
        can_train=user.role=="admin",can_edit_weights=False)

def model_out(m):
    r=m.report
    return dict(id=m.id,version=m.id,name=r["name"],algorithm=r["algorithm"],key=m.algorithm,
        tier=m.tier,state=m.state,summary=r["summary"],pros=r["pros"],cons=r["cons"],suitable=r["suitable"],
        metrics=r["metrics"],mae=r["metrics"]["mae_vnd"],r2=r["metrics"]["r2"],
        dataset=r["dataset"]["name"],dataset_info=r["dataset"],segments=r.get("segments",[]),
        upload_date=m.created_at.isoformat(),evaluated_at=r["evaluated_at"])

@lru_cache(maxsize=1)
def dataset_cached():return dataset_info()

@router.get("/models")
def public_models(db:Session=Depends(get_db)):
    records=db.scalars(select(ModelVersion).where(ModelVersion.state=="Active").order_by(ModelVersion.created_at)).all()
    return dict(items=[model_out(m) for m in records],dataset=dataset_cached(),runtime="trained")

@router.get("/locations")
def locations():return {"locations":dataset_cached()["locations"]}

@router.get("/me/entitlements")
def my_entitlements(user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    return entitlement(user,db)

@router.get("/admin/models")
def models(user:User=Depends(get_admin),db:Session=Depends(get_db)):
    return dict(items=[model_out(m) for m in db.scalars(select(ModelVersion).order_by(ModelVersion.created_at.desc())).all()])

@router.get("/admin/datasets")
def datasets(user:User=Depends(get_admin)):
    return {"items":[dataset_cached()]}

class TrainIn(BaseModel):
    model_config=ConfigDict(extra="forbid")
    algorithm: Literal["ridge","random_forest","hist_gradient"]
    trees: int=Field(default=100,ge=20,le=200)
    max_depth: int=Field(default=18,ge=4,le=24)
    iterations: int=Field(default=160,ge=30,le=250)
    alpha: float=Field(default=10,ge=.1,le=100,allow_inf_nan=False)

def run_training(job_id):
    with SessionLocal() as db:
        job=db.get(TrainingJob,job_id)
        try:
            job.status="running";db.commit()
            config=job.config.copy()
            model_id,artifact,report=train_model(config.pop("algorithm"),config)
            db.add(ModelVersion(id=model_id,algorithm=report["key"],tier=report["tier"],artifact=artifact,report=report,state="Validated"))
            job.status="completed";job.result={"model_id":model_id}
            db.commit()
        except Exception as e:
            db.rollback();job=db.get(TrainingJob,job_id);job.status="failed";job.error=str(e)[:500];db.commit()
        finally:training_lock.release()

@router.post("/admin/training",status_code=202)
def start_training(payload:TrainIn,tasks:BackgroundTasks,user:User=Depends(get_admin),db:Session=Depends(get_db)):
    if not training_lock.acquire(blocking=False):raise HTTPException(409,"Đã có tác vụ huấn luyện đang chạy.")
    try:
        job=TrainingJob(id="job-"+uuid.uuid4().hex,owner_id=user.id,config=payload.model_dump())
        db.add(job);db.commit()
        tasks.add_task(run_training,job.id)
        return {"id":job.id,"status":"queued"}
    except Exception:
        training_lock.release();raise

@router.get("/admin/training/{job_id}")
def training_status(job_id:str,user:User=Depends(get_admin),db:Session=Depends(get_db)):
    job=db.get(TrainingJob,job_id)
    if not job:raise HTTPException(404,"Không tìm thấy tác vụ.")
    return {"id":job.id,"status":job.status,"result":job.result,"error":job.error}

@router.post("/admin/models/{model_id}/activate")
def activate(model_id:str,user:User=Depends(get_admin),db:Session=Depends(get_db)):
    with publication_lock:
        m=db.get(ModelVersion,model_id)
        if not m:raise HTTPException(404,"Không có mô hình này.")
        # One published version per algorithm, allowing several prediction models.
        for other in db.scalars(select(ModelVersion).where(ModelVersion.algorithm==m.algorithm,ModelVersion.state=="Active")).all():other.state="Archived"
        m.state="Active";db.commit()
    return model_out(m)

@router.post("/admin/models/{model_id}/archive")
def archive(model_id:str,user:User=Depends(get_admin),db:Session=Depends(get_db)):
    with publication_lock:
        m=db.get(ModelVersion,model_id)
        if not m:raise HTTPException(404,"Không có mô hình này.")
        if m.state=="Active" and m.tier=="free":raise HTTPException(409,"Hãy phát hành phiên bản Free thay thế trước khi lưu trữ phiên bản hiện tại.")
        m.state="Archived";db.commit()
    return model_out(m)

class PredictIn(BaseModel):
    model_config=ConfigDict(extra="forbid",allow_inf_nan=False)
    model_id:str|None=Field(default=None,max_length=64)
    city:str=Field(default="Hồ Chí Minh",min_length=2,max_length=80)
    district:str=Field(min_length=1,max_length=100)
    property_type:Literal["Nhà phố","Căn hộ","Biệt thự","Đất nền","Thửa đất"]
    area_m2:float=Field(ge=15,le=10000)
    bedrooms:int|None=Field(default=None,ge=0,le=50)
    bathrooms:int|None=Field(default=None,ge=0,le=50)
    floors:int|None=Field(default=None,ge=1,le=100)
    frontage_m:float|None=Field(default=None,gt=0,le=200)
    road_width_m:float|None=Field(default=None,ge=0,le=200)
    land_use:str|None=Field(default=None,max_length=80)
    legal_status:str|None=Field(default=None,max_length=100)
    parcel_number:str|None=Field(default=None,max_length=20)
    map_sheet:str|None=Field(default=None,max_length=20)
    planning_status:str|None=Field(default=None,max_length=100)
    source_listing_id:str|None=Field(default=None,max_length=64)
    @model_validator(mode="after")
    def rooms(self):
        if self.bedrooms is not None and self.bathrooms is not None and self.bathrooms>self.bedrooms+2:
            raise ValueError("Số phòng tắm không được vượt số phòng ngủ quá 2.")
        return self

def draft_proof(id):
    return hmac.new(SECRET.encode(),("prediction:"+id).encode(),hashlib.sha256).hexdigest()

@router.post("/predictions")
def predict(payload:PredictIn,user:User|None=Depends(optional_user),db:Session=Depends(get_db)):
    if payload.property_type in ["Đất nền","Thửa đất"]:
        raise HTTPException(422,"Chưa có mô hình đất được kiểm định. Dataset Kaggle không có nhãn đất hoặc ranh thửa. Xem trang nguồn dữ liệu.")
    if payload.model_id:m=db.get(ModelVersion,payload.model_id)
    else:m=db.scalar(select(ModelVersion).where(ModelVersion.tier=="free",ModelVersion.state=="Active"))
    if not m or m.state!="Active":raise HTTPException(404,"Mô hình chưa được phát hành hoặc đã lưu trữ.")
    if m.tier=="premium" and not premium(user,db):raise HTTPException(403,"Mô hình này cần Premium. Bạn chỉ được chọn mô hình, không thay đổi tham số.")
    inputs=payload.model_dump(exclude_none=True,exclude={"model_id"})
    pairs=m.report["support"]["pairs"]
    if [inputs["city"],inputs["district"]] not in pairs:
        raise HTTPException(422,"Khu vực chưa có trong tập huấn luyện của mô hình này. Hãy chọn lại từ danh sách được hỗ trợ.")
    try:value,lower,upper,support=predict_artifact(m.artifact,m.report["artifact_sha256"],inputs)
    except ValueError as error:raise HTTPException(503,str(error))
    warnings=["Ước tính theo giá rao 2024, không phải giá giao dịch hoặc cập nhật thị trường hiện tại.",
        "Dataset không có nhãn loại hình; lựa chọn nhà phố/căn hộ/biệt thự được lưu nhưng chưa dùng làm đặc trưng."]
    if not support["area_min"]<=payload.area_m2<=support["area_max"]:
        warnings.append("Diện tích nằm ngoài phạm vi huấn luyện; không nên dựa vào kết quả này.")
    missing=[f for f in FEATURES if f not in inputs]
    if missing:warnings.append("Một số thông tin chưa nhập được thay bằng trung vị của tập huấn luyện.")
    id="pred-"+uuid.uuid4().hex
    result=dict(id=id,estimated_price=round(value),currency="VND",
        confidence_interval=dict(lower=round(lower),upper=round(upper),confidence_level=.9,method="Split conformal trên tập calibration riêng"),
        model=dict(id=m.id,version=m.id,algorithm=m.report["algorithm"]),
        input=inputs,created_at=utcnow().isoformat(),is_mock=False,warnings=warnings,
        disclaimer="Ước tính bằng mô hình được huấn luyện trên dữ liệu rao bán 2024; không phải khuyến nghị đầu tư.",
        draft_token=draft_proof(id))
    db.add(Prediction(id=id,owner_id=user.id if user else None,payload=result))
    db.commit()
    return result

class SaveIn(BaseModel):
    model_config=ConfigDict(extra="forbid")
    prediction:dict
    label:str=Field(default="",max_length=80)

def saved_out(p):
    data=p.payload
    return dict(**{k:v for k,v in data.items() if k!="draft_token"},label=p.label,owner_id=p.owner_id,
        district=data["input"]["district"],property_type=data["input"]["property_type"],area_m2=data["input"]["area_m2"],model_version=data["model"]["version"])

@router.post("/me/predictions")
def save(payload:SaveIn,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    id=payload.prediction.get("id","")
    token=payload.prediction.get("draft_token","")
    if not isinstance(id,str) or not isinstance(token,str) or not hmac.compare_digest(token,draft_proof(id)):raise HTTPException(403,"Kết quả không có chữ ký hợp lệ.")
    p=db.get(Prediction,id)
    if not p or (p.owner_id is not None and p.owner_id!=user.id):raise HTTPException(404,"Không tìm thấy dự đoán.")
    if p.owner_id is None and (utcnow()-p.created_at.replace(tzinfo=timezone.utc)).total_seconds()>86400:raise HTTPException(410,"Dự đoán khách đã hết hạn, vui lòng tạo lại.")
    p.owner_id=user.id;p.label=payload.label.strip();p.saved=True;db.commit()
    return saved_out(p)

@router.get("/me/predictions")
def history(q:str="",page:int=Query(1,ge=1),page_size:int=Query(20,ge=1,le=100),user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    records=db.scalars(select(Prediction).where(Prediction.owner_id==user.id,Prediction.saved==True).order_by(Prediction.created_at.desc())).all()
    results=[saved_out(p) for p in records]
    if q:results=[r for r in results if q.lower() in (r["label"]+" "+r["district"]+" "+r["property_type"]).lower()]
    return dict(items=results[(page-1)*page_size:page*page_size],total=len(results),page=page,page_size=page_size)

@router.get("/me/predictions/{prediction_id}")
def detail(prediction_id:str,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.get(Prediction,prediction_id)
    if not p or p.owner_id!=user.id or not p.saved:raise HTTPException(404,"Không tìm thấy dự đoán.")
    return saved_out(p)

@router.delete("/me/predictions/{prediction_id}",status_code=204)
def delete(prediction_id:str,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    p=db.get(Prediction,prediction_id)
    if not p or p.owner_id!=user.id or not p.saved:raise HTTPException(404,"Không tìm thấy dự đoán.")
    p.saved=False;db.commit()

class CheckoutIn(BaseModel):
    model_config=ConfigDict(extra="forbid")
    plan:Literal["premium-monthly"]="premium-monthly"

class CompleteIn(BaseModel):
    model_config=ConfigDict(extra="forbid")
    outcome:Literal["success","failed","cancelled"]

def sandbox_only():
    if os.getenv("HOMEVAL_DEMO_BILLING")!="1":raise HTTPException(403,"Thanh toán thử nghiệm đang tắt.")

@router.post("/billing/checkout",status_code=201)
def checkout(payload:CheckoutIn,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    sandbox_only()
    item=Checkout(id="test-"+uuid.uuid4().hex,owner_id=user.id)
    db.add(item);db.commit()
    return dict(id=item.id,amount=item.amount,currency="VND",sandbox=True,status=item.status,description="Premium 30 ngày — giao dịch thử, không thu tiền")

@router.post("/billing/checkout/{checkout_id}/complete")
def complete(checkout_id:str,payload:CompleteIn,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    sandbox_only()
    item=db.get(Checkout,checkout_id)
    if not item or item.owner_id!=user.id:raise HTTPException(404,"Không có giao dịch.")
    if item.status!="pending":
        if item.status!=payload.outcome:raise HTTPException(409,"Giao dịch đã kết thúc.")
        return dict(id=item.id,status=item.status,entitlement=entitlement(user,db))
    changed=db.execute(update(Checkout).where(Checkout.id==checkout_id,Checkout.status=="pending").values(status=payload.outcome))
    if changed.rowcount!=1:db.rollback();raise HTTPException(409,"Giao dịch đã được xử lý.")
    if payload.outcome=="success":
        sub=db.get(Subscription,user.id)
        if not sub:sub=Subscription(user_id=user.id,expires_at=utcnow());db.add(sub)
        sub.expires_at=utcnow()+timedelta(days=30)
    db.commit()
    return dict(id=checkout_id,status=payload.outcome,entitlement=entitlement(user,db))

@router.get("/admin/stats")
def stats(user:User=Depends(get_admin),db:Session=Depends(get_db)):
    all_predictions=db.scalars(select(Prediction)).all()
    recent=[p for p in all_predictions if p.created_at.date()==utcnow().date()]
    m=db.scalar(select(ModelVersion).where(ModelVersion.state=="Active",ModelVersion.tier=="free"))
    return dict(users_total=db.scalar(select(func.count(User.id))),predictions_today=len(recent),predictions_week=sum(p.created_at.replace(tzinfo=timezone.utc)>=utcnow()-timedelta(days=7) for p in all_predictions),
        active_model=dict(version=m.id if m else "Chưa có",algorithm=m.report["algorithm"] if m else "",r2=m.report["metrics"]["r2"] if m else 0),
        published_models=db.scalar(select(func.count(ModelVersion.id)).where(ModelVersion.state=="Active")),predictions_per_day=[dict(date=(utcnow()-timedelta(days=i)).strftime("%m-%d"),count=sum(p.created_at.date()==(utcnow()-timedelta(days=i)).date() for p in all_predictions)) for i in reversed(range(7))],
        recent_activity=[dict(text="Đã huấn luyện "+x.report["name"],created_at=x.created_at.isoformat()) for x in db.scalars(select(ModelVersion).order_by(ModelVersion.created_at.desc()).limit(5))])

@router.get("/map-listings")
def map_listings():
    # Keep illustrative map separate from the real ML dataset.
    return json.loads((Path(__file__).resolve().parents[2]/"frontend/mock/map-listings.json").read_text(encoding="utf-8"))
