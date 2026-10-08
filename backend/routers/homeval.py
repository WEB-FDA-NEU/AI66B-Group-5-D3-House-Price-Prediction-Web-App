"""HomeVal model registry, inference, history, training and sandbox billing."""
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Literal
import csv
import hashlib
import hmac
import io
import json
import os
import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, UploadFile, File
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select, func, update, or_
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from deps import get_admin, get_current_user, optional_user
from models import User, ModelVersion, TrainingJob, Prediction, Checkout, Subscription, utcnow
from security import SECRET
import schemas
from request_stats import snapshot as error_snapshot
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

DATASET_REQUIRED_COLUMNS = ["Address", "Area", "Price", "Bedrooms", "Bathrooms", "Floors"]
DATASET_MAX_BYTES = 20 * 1024 * 1024
DATASET_MAX_ROWS = 100_000

@router.post("/admin/datasets/preview", response_model=schemas.DatasetPreview)
def dataset_preview(file: UploadFile = File(...), user: User = Depends(get_admin)):
    # FE-07: validate + preview an uploaded training CSV. Stateless: the file
    # is never promoted to training data. Switching the training dataset is
    # a separate decision (retrain + re-evaluate), out of scope here.
    name = file.filename or ""
    if not name.lower().endswith(".csv"):
        raise HTTPException(422, "file: Chỉ chấp nhận file .csv")
    raw = file.file.read()
    if len(raw) > DATASET_MAX_BYTES:
        raise HTTPException(422, "file: File vượt quá 20 MB")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(422, "file: File phải là CSV mã hoá UTF-8")
    reader = csv.DictReader(io.StringIO(text))
    columns = [(c or "").strip() for c in (reader.fieldnames or [])]
    if not columns:
        raise HTTPException(422, "file: Không đọc được dòng tiêu đề của CSV")
    missing = [c for c in DATASET_REQUIRED_COLUMNS if c not in columns]
    rows, preview = 0, []
    for record in reader:
        rows += 1
        if rows > DATASET_MAX_ROWS:
            raise HTTPException(422, "file: File vượt quá 100.000 dòng")
        if len(preview) < 5:
            preview.append({k: (v or "") for k, v in record.items() if k})
    return schemas.DatasetPreview(filename=name, size_bytes=len(raw), rows=rows,
        columns=columns, required_columns=DATASET_REQUIRED_COLUMNS,
        missing_columns=missing, preview=preview)

USER_SORTS = ("newest", "oldest", "name", "predictions")

@router.get("/admin/users", response_model=schemas.AdminUserPage)
def admin_users(q: str = "", role: str = "", status: str = "",
        sort: str = "newest", order: str = "desc",
        page: int = 1, page_size: int = 20,
        user: User = Depends(get_admin), db: Session = Depends(get_db)):
    if role not in ("", "user", "admin"):
        raise HTTPException(422, "role: Chỉ nhận user hoặc admin.")
    if status not in ("", "Active", "Inactive"):
        raise HTTPException(422, "status: Chỉ nhận Active hoặc Inactive.")
    if sort not in USER_SORTS:
        raise HTTPException(422, "sort: Chỉ nhận newest, oldest, name hoặc predictions.")
    if order not in ("asc", "desc"):
        raise HTTPException(422, "order: Chỉ nhận asc hoặc desc.")
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    counts_sq = select(Prediction.owner_id, func.count().label("n")) \
        .where(Prediction.saved == True).group_by(Prediction.owner_id).subquery()
    base = select(User, func.coalesce(counts_sq.c.n, 0).label("pc")) \
        .outerjoin(counts_sq, counts_sq.c.owner_id == User.id)
    if q.strip():
        like = f"%{q.strip()}%"
        base = base.where(or_(User.display_name.ilike(like), User.email.ilike(like)))
    if role:
        base = base.where(User.role == role)
    if status:
        base = base.where(User.status == status if status == "Inactive" else or_(User.status == "Active", User.status.is_(None)))
    total = db.scalar(select(func.count()).select_from(base.subquery()))
    sort_col = {"newest": User.id, "oldest": User.id, "name": User.display_name,
        "predictions": func.coalesce(counts_sq.c.n, 0)}[sort]
    rows = db.execute(base.order_by(sort_col.asc() if order == "asc" else sort_col.desc())
        .offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [dict(id=u.id, display_name=u.display_name, email=u.email,
        phone=u.phone, role=u.role, status=u.status or "Active",
        prediction_count=pc, created_at=u.created_at) for u, pc in rows],
        "total": total, "page": page, "page_size": page_size}

@router.post("/admin/users/{user_id}/deactivate", response_model=schemas.UserOut)
def deactivate_user(user_id: int, user: User = Depends(get_admin), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "Không tìm thấy người dùng.")
    if target.id == user.id:
        raise HTTPException(422, "Không thể vô hiệu hoá chính tài khoản của mình.")
    if (target.status or "Active") != "Active":
        raise HTTPException(409, "Tài khoản này đã bị vô hiệu hoá.")
    if target.role == "admin":
        remaining = db.scalar(select(func.count(User.id)).where(
            User.role == "admin", User.status != "Inactive", User.id != target.id))
        if not remaining:
            raise HTTPException(409, "Không thể vô hiệu hoá admin cuối cùng còn hoạt động.")
    target.status = "Inactive"
    db.commit()
    db.refresh(target)
    return target

@router.post("/admin/users/{user_id}/reactivate", response_model=schemas.UserOut)
def reactivate_user(user_id: int, user: User = Depends(get_admin), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "Không tìm thấy người dùng.")
    if (target.status or "Active") == "Active":
        raise HTTPException(409, "Tài khoản này đang hoạt động.")
    target.status = "Active"
    db.commit()
    db.refresh(target)
    return target

@router.post("/admin/users/{user_id}/role", response_model=schemas.UserOut)
def change_user_role(user_id: int, payload: schemas.RoleUpdateIn,
        user: User = Depends(get_admin), db: Session = Depends(get_db)):
    # AD-9: promote/demote. Self-change is blocked so an admin can never
    # lock themselves out by accident; demoting the last active admin too.
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "Không tìm thấy người dùng.")
    if target.id == user.id:
        raise HTTPException(422, "Không thể tự đổi vai trò của chính mình.")
    if target.role == payload.role:
        raise HTTPException(409, f"Tài khoản này đã là {payload.role}.")
    if target.role == "admin" and payload.role == "user":
        remaining = db.scalar(select(func.count(User.id)).where(
            User.role == "admin", User.status != "Inactive", User.id != target.id))
        if not remaining:
            raise HTTPException(409, "Không thể hạ cấp admin cuối cùng còn hoạt động.")
    target.role = payload.role
    db.commit()
    db.refresh(target)
    return target

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
        recent_activity=[dict(text="Đã huấn luyện "+x.report["name"],created_at=x.created_at.isoformat()) for x in db.scalars(select(ModelVersion).order_by(ModelVersion.created_at.desc()).limit(5))],
        **error_snapshot())

@router.get("/map-listings")
def map_listings():
    # Keep illustrative map separate from the real ML dataset.
    return json.loads((Path(__file__).resolve().parents[2]/"frontend/mock/map-listings.json").read_text(encoding="utf-8"))
