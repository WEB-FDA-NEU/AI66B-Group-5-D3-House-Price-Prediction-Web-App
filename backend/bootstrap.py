"""Explicit local setup: demo accounts and initial trained/published models."""
import json
from sqlalchemy import select
from database import Base, engine, SessionLocal
from models import User, ModelVersion
from security import hash_password
from ml import train_model, dataset_info, runtime_versions_match

def seed_accounts():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for email,password,name,role in [
            ("anh@example.com","password123","Nguyễn Minh Anh","user"),
            ("admin@homeval.vn","admin123","Quản trị viên","admin"),
        ]:
            if not db.scalar(select(User).where(User.email==email)):
                db.add(User(email=email,password_hash=hash_password(password),display_name=name,role=role,phone=""))
        db.commit()

def bootstrap_models():
    with SessionLocal() as db:
        for algorithm in ["ridge","random_forest","hist_gradient"]:
            active_models=db.scalars(select(ModelVersion).where(
                ModelVersion.algorithm==algorithm,ModelVersion.state=="Active"
            )).all()
            if len(active_models)==1 and runtime_versions_match(
                active_models[0].report.get("runtime_versions")
                if isinstance(active_models[0].report,dict) else None
            ):
                print(algorithm+": already trained",flush=True);continue
            if active_models:
                print(algorithm+": active model runtime is missing or incompatible; retraining",flush=True)
            print("Training "+algorithm,flush=True)
            id,artifact,report=train_model(algorithm)
            for active in active_models:
                active.state="Archived"
            db.add(ModelVersion(id=id,algorithm=algorithm,tier=report["tier"],state="Active",artifact=artifact,report=report))
            db.commit()
            print(json.dumps({"id":id,"metrics":report["metrics"]}),flush=True)

if __name__=="__main__":
    seed_accounts()
    bootstrap_models()
    print(json.dumps(dataset_info(),ensure_ascii=True),flush=True)
