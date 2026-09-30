"""Explicit local setup: demo accounts and initial trained/published models."""
import json
from sqlalchemy import select
from database import Base, engine, SessionLocal
from models import User, ModelVersion
from security import hash_password
from ml import train_model, dataset_info

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

if __name__=="__main__":
    seed_accounts()
    with SessionLocal() as db:
        for algorithm in ["ridge","random_forest","hist_gradient"]:
            if db.scalar(select(ModelVersion).where(ModelVersion.algorithm==algorithm,ModelVersion.state=="Active")):
                print(algorithm+": already trained",flush=True);continue
            print("Training "+algorithm,flush=True)
            id,artifact,report=train_model(algorithm)
            db.add(ModelVersion(id=id,algorithm=algorithm,tier=report["tier"],state="Active",artifact=artifact,report=report))
            db.commit()
            print(json.dumps({"id":id,"metrics":report["metrics"]}),flush=True)
    print(json.dumps(dataset_info(),ensure_ascii=True),flush=True)
