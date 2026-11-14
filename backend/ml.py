"""Reproducible training on the local Kaggle CSV. No arbitrary model uploads."""
from pathlib import Path
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import io
import json
import math
import os
import re
import sys
import uuid
import joblib
import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from threadpoolctl import threadpool_limits

ROOT = Path(__file__).resolve().parent
DATA_PATH = Path(os.getenv("HOUSING_DATASET_PATH", str(ROOT / "data/vietnam_housing_dataset.csv")))
ARTIFACTS = Path(os.getenv("MODEL_ARTIFACT_DIR", str(ROOT / "artifacts")))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
NUMERIC = ["area_m2", "bedrooms", "bathrooms", "floors", "frontage_m", "road_width_m"]
CATEGORICAL = ["city", "district"]
FEATURES = NUMERIC + CATEGORICAL
SOURCE = "https://www.kaggle.com/datasets/nguyentiennhan/vietnam-housing-dataset-2024"
MODEL_GUIDES = {
 "ridge": dict(name="Góc nhìn cơ bản", algorithm="Ridge Regression", tier="free",
   summary="Một mốc tham chiếu nhanh, dễ hiểu để bắt đầu đánh giá tài sản.",
   pros=["Dự đoán nhanh, ổn định", "Tạo mốc đối chiếu rõ ràng"],
   cons=["Khó nắm bắt quan hệ giá phức tạp", "Có thể bỏ sót khác biệt ở tài sản đặc biệt"],
   suitable="Người mua ở thực hoặc nhà đầu tư cần một mốc tham chiếu."),
 "random_forest": dict(name="Góc nhìn so sánh", algorithm="Random Forest", tier="premium",
   summary="Kết hợp nhiều cây quyết định để phản ánh quan hệ phi tuyến giữa các đặc điểm.",
   pros=["Nhận diện nhiều kiểu quan hệ trong dữ liệu", "Có thể đối chiếu với mô hình cơ bản"],
   cons=["Khó giải thích hơn hồi quy", "Không đáng tin khi tài sản nằm ngoài vùng dữ liệu"],
   suitable="Đối chiếu danh mục và khảo sát nhiều tài sản; không dự báo lợi nhuận."),
 "hist_gradient": dict(name="Góc nhìn chuyên sâu", algorithm="Histogram Gradient Boosting", tier="premium",
   summary="Học từ sai số của các bước trước để tạo thêm một góc nhìn định lượng.",
   pros=["Khai thác tương tác giữa các đặc điểm", "Hỗ trợ kiểm tra sự đồng thuận giữa mô hình"],
   cons=["Nhạy với chất lượng dữ liệu đầu vào", "Không đảm bảo tốt hơn mọi mô hình ở mọi khu vực"],
   suitable="Nhà đầu tư muốn so sánh kịch bản, không phải tín hiệu mua/bán."),
}

def normalize_location(value):
    return re.sub(r"\s+", " ", str(value or "").strip().rstrip(".")).strip()

def load_dataset():
    if not DATA_PATH.is_file():
        raise ValueError("Chưa có CSV. Chạy scripts/download_dataset.py hoặc đặt HOUSING_DATASET_PATH.")
    raw = pd.read_csv(DATA_PATH)
    required = {"Address", "Area", "Price", "Bedrooms", "Bathrooms", "Floors"}
    if not required.issubset(raw.columns):
        raise ValueError("CSV thiếu các cột bắt buộc của Vietnam Housing Dataset 2024.")
    out = pd.DataFrame(index=raw.index)
    address = raw.Address.fillna("").map(normalize_location)
    parts = address.str.split(",").apply(lambda values: [normalize_location(s) for s in values])
    out["city"] = parts.apply(lambda p: p[-1] if len(p) >= 2 else "")
    out["district"] = parts.apply(lambda p: p[-2] if len(p) >= 2 else "")
    mapping = {"Area":"area_m2","Bedrooms":"bedrooms","Bathrooms":"bathrooms","Floors":"floors","Frontage":"frontage_m","Access Road":"road_width_m"}
    for source, dest in mapping.items():
        out[dest] = pd.to_numeric(raw[source], errors="coerce") if source in raw else np.nan
    out["price"] = pd.to_numeric(raw.Price, errors="coerce") * 1_000_000_000
    out["address_group"] = address.str.lower()
    original = len(out)
    out = out[np.isfinite(out.price) & out.price.between(100_000_000, 200_000_000_000) & out.area_m2.between(15, 2000) & out.city.ne("") & out.district.ne("")].copy()
    for field, maximum in [("bedrooms",50),("bathrooms",50),("floors",100),("frontage_m",200),("road_width_m",200)]:
        out.loc[~out[field].between(0, maximum), field] = np.nan
    out = out.drop_duplicates().reset_index(drop=True)
    if len(out) < 300: raise ValueError("Cần ít nhất 300 bản ghi hợp lệ để tách train/calibration/test.")
    # Same address and structural attributes always stay in the same partition.
    groups = out[["address_group"] + NUMERIC].fillna(-1).astype(str).agg("|".join, axis=1)
    remaining, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(out, groups=groups))
    train_local, cal_local = next(GroupShuffleSplit(n_splits=1, test_size=.25, random_state=43).split(out.iloc[remaining], groups=groups.iloc[remaining]))
    train, cal = remaining[train_local], remaining[cal_local]
    digest = hashlib.sha256(DATA_PATH.read_bytes()).hexdigest()
    info = dict(id="vietnam-housing-2024", name="Vietnam Housing Dataset 2024", source=SOURCE,
        sha256=digest, original_rows=original, cleaned_rows=len(out), removed_rows=original-len(out),
        train_rows=len(train), calibration_rows=len(cal), test_rows=len(test),
        features=FEATURES, price_unit="CSV Price: tỷ VNĐ; API: VNĐ",
        price_min=float(out.price.min()),price_max=float(out.price.max()),
        area_min=float(out.area_m2.min()),area_max=float(out.area_m2.max()),
        split="60/20/20 theo nhóm địa chỉ + cấu trúc; seed 42/43. Không phải kiểm định theo thời gian.",
        target="Giá rao bán trong dữ liệu 2024, không phải giá giao dịch hoặc giá hiện tại.",
        limitations=["Không có tọa độ, ranh thửa hoặc lịch sử giao dịch.", "Không có cột loại hình để xác minh riêng nhà phố/căn hộ/biệt thự.", "Không huấn luyện định giá đất nền/thửa đất từ dữ liệu này."],
        missing={c:round(float(out[c].isna().mean()),4) for c in NUMERIC})
    return out, (train,cal,test), info

def dataset_info():
    data, (train, _, _), info = load_dataset()
    locations = {}
    for city, rows in data.iloc[train].groupby("city"):
        if len(rows) >= 30: locations[city] = sorted(rows.district.unique().tolist())
    return {**info, "locations":locations}

def build_pipeline(algorithm, config):
    numeric = Pipeline([("impute",SimpleImputer(strategy="median",add_indicator=True)),("scale",StandardScaler())])
    encoder = OneHotEncoder(handle_unknown="ignore", min_frequency=15, sparse_output=False)
    preprocessing = ColumnTransformer([("numeric",numeric,NUMERIC),("location",encoder,CATEGORICAL)])
    if algorithm == "ridge": estimator = Ridge(alpha=config.get("alpha",10.0))
    elif algorithm == "random_forest": estimator = RandomForestRegressor(n_estimators=config.get("trees",100),max_depth=config.get("max_depth",18),min_samples_leaf=4,max_features=.8,n_jobs=2,random_state=42)
    elif algorithm == "hist_gradient": estimator = HistGradientBoostingRegressor(max_iter=config.get("iterations",160),max_leaf_nodes=25,l2_regularization=5,learning_rate=.08,early_stopping=False,random_state=42)
    else: raise ValueError("Thuật toán không được hỗ trợ.")
    pipeline = Pipeline([("preprocess",preprocessing),("regressor",estimator)])
    return TransformedTargetRegressor(regressor=pipeline,func=np.log1p,inverse_func=np.expm1)

def train_model(algorithm, config=None):
    config = config or {}
    data, (train,cal,test), dataset = load_dataset()
    model = build_pipeline(algorithm, config)
    with threadpool_limits(limits=2):
        model.fit(data.iloc[train][FEATURES],data.iloc[train].price)
        cal_pred = np.maximum(1,model.predict(data.iloc[cal][FEATURES]))
        pred = np.maximum(1,model.predict(data.iloc[test][FEATURES]))
    actual = data.iloc[test].price.to_numpy()
    residual = np.abs(np.log(data.iloc[cal].price.to_numpy()) - np.log(cal_pred))
    level = min(1,math.ceil((len(residual)+1)*.9)/len(residual))
    radius = float(np.quantile(residual,level,method="higher"))
    metrics = dict(mae_vnd=float(mean_absolute_error(actual,pred)),
        rmse_vnd=float(np.sqrt(mean_squared_error(actual,pred))),r2=float(r2_score(actual,pred)),
        mape_percent=float(np.mean(np.abs(actual-pred)/actual)*100),
        within_20_percent=float(np.mean(np.abs(actual-pred)/actual<=.2)*100),
        interval_coverage_percent=float(np.mean((actual>=pred*np.exp(-radius))&(actual<=pred*np.exp(radius)))*100))
    segments=[]
    for city in data.iloc[test].city.unique():
        mask = data.iloc[test].city.to_numpy() == city
        if mask.sum()>=30: segments.append(dict(city=city,count=int(mask.sum()),mae_vnd=float(mean_absolute_error(actual[mask],pred[mask])),mape_percent=float(np.mean(np.abs(actual[mask]-pred[mask])/actual[mask])*100)))
    model_id = algorithm + "-" + uuid.uuid4().hex[:12]
    path = ARTIFACTS / (model_id+".joblib")
    trained = data.iloc[train]
    support = dict(area_min=float(trained.area_m2.min()),area_max=float(trained.area_m2.max()),
        cities=sorted(trained.city.unique().tolist()),pairs=trained.groupby(["city","district"]).size().reset_index().iloc[:,:2].values.tolist())
    joblib.dump(dict(model=model,log_radius=radius,support=support),path,compress=3)
    report = dict(**MODEL_GUIDES[algorithm],key=algorithm,metrics=metrics,dataset=dataset,
        segments=sorted(segments,key=lambda s:-s["count"]),config=config,support=support,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        runtime_versions=current_runtime_versions(),
        artifact_sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    return model_id,path.name,report

def current_runtime_versions():
    return {
        "python": f"{sys.version_info.major}.{sys.version_info.minor}",
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scikit-learn": sklearn.__version__,
        "scipy": scipy.__version__,
        "joblib": joblib.__version__,
    }

def runtime_versions_match(recorded):
    return isinstance(recorded, dict) and recorded == current_runtime_versions()

_MODEL_CACHE={}
def load_verified_artifact(artifact, expected_sha, recorded_runtime):
    """Return the deserialized artifact after checking its SHA-256.

    SY-9: hashing is done once per (expected hash, size, mtime) signature
    instead of on every prediction. Rewriting the file changes the
    signature, so a tampered or replaced artifact is re-hashed and refused.
    """
    if not runtime_versions_match(recorded_runtime):
        _MODEL_CACHE.pop(artifact,None)
        raise ValueError("Mô hình được tạo bằng phiên bản Python/thư viện khác hoặc thiếu thông tin tương thích. Chạy `python backend/bootstrap.py` để huấn luyện lại.")
    path=(ARTIFACTS/artifact).resolve()
    if path.parent != ARTIFACTS.resolve() or not path.is_file(): raise ValueError("Không tìm thấy phiên bản mô hình.")
    stat=path.stat()
    signature=(expected_sha,stat.st_size,stat.st_mtime_ns)
    cached=_MODEL_CACHE.get(artifact)
    if cached and cached[0]==signature: return cached[1]
    data=path.read_bytes()
    if hashlib.sha256(data).hexdigest()!=expected_sha:
        _MODEL_CACHE.pop(artifact,None)
        raise ValueError("Tệp mô hình không khớp dấu kiểm tra.")
    # Only artifacts built locally by this trainer may be deserialized,
    # and only the exact bytes that were just verified.
    stored=joblib.load(io.BytesIO(data))
    _MODEL_CACHE[artifact]=(signature,stored)
    return stored

def _feature_row(inputs):
    row={name:inputs.get(name,np.nan) for name in FEATURES}
    for name in NUMERIC:
        if row[name] is None:row[name]=np.nan
    return row

def predict_artifact(artifact, expected_sha, inputs, recorded_runtime):
    stored=load_verified_artifact(artifact, expected_sha, recorded_runtime)
    row=_feature_row(inputs)
    with threadpool_limits(limits=2):
        value=max(1,float(stored["model"].predict(pd.DataFrame([row]))[0]))
    r=stored["log_radius"]
    return value, value*math.exp(-r),value*math.exp(r),stored["support"]

# ---- GU-4: which inputs moved this estimate -------------------------------
FEATURE_LABELS={"area_m2":"Diện tích","bedrooms":"Số phòng ngủ","bathrooms":"Số phòng tắm","floors":"Số tầng",
    "frontage_m":"Mặt tiền","road_width_m":"Đường tiếp cận","district":"Quận/huyện"}
FEATURE_UNITS={"area_m2":"m²","frontage_m":"m","road_width_m":"m"}
EXPLANATION_METHOD=("Mỗi thanh cho biết giá ước tính thay đổi bao nhiêu khi CHỈ đặc điểm đó được thay bằng mức điển hình "
    "của tập huấn luyện (trung vị; với quận/huyện là khu vực có nhiều tin rao nhất trong cùng tỉnh/thành), "
    "các đặc điểm khác giữ nguyên. Các tác động được đo riêng lẻ nên không cộng dồn thành đúng giá ước tính.")

@lru_cache(maxsize=1)
def _typical_district_by_city():
    data,(train,_,_),_=load_dataset()
    counts=data.iloc[train].groupby(["city","district"]).size().reset_index(name="n")
    best=counts.sort_values(["city","n","district"],ascending=[True,False,True]).drop_duplicates("city")
    return dict(zip(best.city,best.district))

def _numeric_medians(model):
    # The fitted median imputer already stores the training medians the
    # model itself falls back to for missing inputs.
    imputer=model.regressor_.named_steps["preprocess"].named_transformers_["numeric"].named_steps["impute"]
    return {name:float(value) for name,value in zip(NUMERIC,imputer.statistics_)}

def _round_baseline(name,value):
    return round(value,1) if name in ("frontage_m","road_width_m","area_m2") else int(round(value))

def explain_artifact(artifact, expected_sha, inputs, value, recorded_runtime):
    """One-at-a-time local explanation of a single estimate (GU-4).

    For each input the user actually provided, re-run the model with only
    that input reset to a typical training value. The difference is how much
    this input moved the estimate relative to a typical property. Model
    agnostic, so it works for Ridge, Random Forest and Gradient Boosting.
    """
    stored=load_verified_artifact(artifact, expected_sha, recorded_runtime)
    model=stored["model"]
    base=_feature_row(inputs)
    medians=_numeric_medians(model)
    variants=[]
    for name in NUMERIC:
        if name in inputs and inputs[name] is not None:
            baseline=_round_baseline(name,medians[name])
            variants.append((name,inputs[name],baseline,{**base,name:baseline}))
    try:
        typical=_typical_district_by_city().get(inputs.get("city"))
    except ValueError:
        typical=None  # Dataset unavailable: skip location, keep structural inputs.
    if typical:
        variants.append(("district",inputs.get("district"),typical,{**base,"district":typical}))
    items=[]
    if variants:
        with threadpool_limits(limits=2):
            preds=model.predict(pd.DataFrame([row for *_,row in variants],columns=FEATURES))
        for (name,actual,baseline,_),without in zip(variants,preds):
            impact=float(value-max(1,float(without)))
            items.append(dict(feature=name,label=FEATURE_LABELS[name],unit=FEATURE_UNITS.get(name,""),
                value=actual,baseline=baseline,impact_vnd=round(impact),
                impact_percent=round(impact/value*100,1)))
    items.sort(key=lambda item:-abs(item["impact_vnd"]))
    skipped=[FEATURE_LABELS[n] for n in NUMERIC if n not in inputs or inputs[n] is None]
    return dict(method=EXPLANATION_METHOD,items=items,not_provided=skipped)

# ---- GU-6: descriptive market statistics from the same dataset -------------
PPM2_BINS=[(0,40,"< 40"),(40,70,"40–70"),(70,100,"70–100"),(100,130,"100–130"),(130,160,"130–160"),(160,200,"160–200"),(200,math.inf,"≥ 200")]
AREA_BINS=[(0,30,"< 30"),(30,45,"30–45"),(45,60,"45–60"),(60,80,"60–80"),(80,100,"80–100"),(100,150,"100–150"),(150,math.inf,"≥ 150")]
INSIGHT_MIN_LISTINGS=30
SCATTER_POINTS=400

def _histogram(values,bins):
    return [dict(range=label,lower=lower,upper=None if math.isinf(upper) else upper,
        count=int(((values>=lower)&(values<upper)).sum())) for lower,upper,label in bins]

@lru_cache(maxsize=64)
def market_insights(city=None):
    data,_,info=load_dataset()
    counts=data.city.value_counts()
    cities=[dict(city=c,count=int(n)) for c,n in counts.items() if n>=INSIGHT_MIN_LISTINGS]
    if not cities:raise ValueError("Chưa đủ dữ liệu để tổng hợp thị trường.")
    city=city or cities[0]["city"]
    rows=data[data.city==city].copy()
    if len(rows)<INSIGHT_MIN_LISTINGS:
        raise LookupError("Tỉnh/thành chưa đủ tin rao để thống kê.")
    rows["ppm2"]=rows.price/rows.area_m2
    districts=[]
    for district,group in rows.groupby("district"):
        if len(group)>=INSIGHT_MIN_LISTINGS:
            districts.append(dict(district=district,count=int(len(group)),
                median_price=round(float(group.price.median())),average_price=round(float(group.price.mean())),
                median_price_per_m2=round(float(group.ppm2.median())),median_area_m2=round(float(group.area_m2.median()),1)))
    districts.sort(key=lambda d:-d["median_price_per_m2"])
    # Scatter: deterministic sample inside the 1st-98th percentile view so a
    # few extreme listings do not flatten the chart. Disclosed in the payload.
    lo_a,hi_a=rows.area_m2.quantile([.01,.98]); lo_p,hi_p=rows.price.quantile([.01,.98])
    view=rows[rows.area_m2.between(lo_a,hi_a)&rows.price.between(lo_p,hi_p)]
    sample=view.sample(n=min(SCATTER_POINTS,len(view)),random_state=42)
    return dict(city=city,cities=cities,source=info["name"],source_url=info["source"],
        summary=dict(listings=int(len(rows)),districts=len(districts),
            median_price=round(float(rows.price.median())),median_price_per_m2=round(float(rows.ppm2.median())),
            median_area_m2=round(float(rows.area_m2.median()),1)),
        district_stats=districts,
        price_per_m2=dict(unit="triệu VNĐ/m²",bins=_histogram(rows.ppm2/1e6,PPM2_BINS)),
        area=dict(unit="m²",bins=_histogram(rows.area_m2,AREA_BINS)),
        price_vs_area=dict(points=[dict(area_m2=float(r.area_m2),price=round(float(r.price)),district=r.district) for r in sample.itertuples()],
            shown=int(len(sample)),in_view=int(len(view)),total=int(len(rows)),
            note="Mẫu ngẫu nhiên cố định; bỏ 1% tin nhỏ nhất và 2% tin lớn nhất về diện tích/giá để biểu đồ dễ đọc."),
        min_listings=INSIGHT_MIN_LISTINGS,
        disclaimer="Thống kê mô tả từ giá RAO BÁN năm 2024, không phải giá giao dịch hay giá hiện tại. Dataset không có cột loại hình nên không tách nhà phố/căn hộ/biệt thự.")
