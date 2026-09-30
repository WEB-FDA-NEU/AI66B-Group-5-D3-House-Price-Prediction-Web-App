"""Reproducible training on the local Kaggle CSV. No arbitrary model uploads."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import os
import re
import uuid
import joblib
import numpy as np
import pandas as pd
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
        artifact_sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    return model_id,path.name,report

_MODEL_CACHE={}
def predict_artifact(artifact, expected_sha, inputs):
    path=(ARTIFACTS/artifact).resolve()
    if path.parent != ARTIFACTS.resolve() or not path.is_file(): raise ValueError("Không tìm thấy phiên bản mô hình.")
    if hashlib.sha256(path.read_bytes()).hexdigest()!=expected_sha: raise ValueError("Tệp mô hình không khớp dấu kiểm tra.")
    if artifact not in _MODEL_CACHE:
        # Only artifacts built locally by this trainer may be deserialized.
        _MODEL_CACHE[artifact]=joblib.load(path)
    stored=_MODEL_CACHE[artifact]
    row={name:inputs.get(name,np.nan) for name in FEATURES}
    for name in NUMERIC:
        if row[name] is None:row[name]=np.nan
    with threadpool_limits(limits=2):
        value=max(1,float(stored["model"].predict(pd.DataFrame([row]))[0]))
    r=stored["log_radius"]
    return value, value*math.exp(-r),value*math.exp(r),stored["support"]
