"""End-to-end API/security checks against an isolated DB and real trained artifacts.
Requires python backend/bootstrap.py first. No writes to the review database.
"""
import os
import sys
import json
import shutil
import sqlite3
import tempfile
from pathlib import Path
from datetime import timedelta
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TEMP = tempfile.TemporaryDirectory(prefix='homeval-test-')
TEST_ROOT = Path(TEMP.name)
os.environ['DATABASE_URL'] = 'sqlite:///' + (TEST_ROOT/'test.db').as_posix()
os.environ['MODEL_ARTIFACT_DIR'] = str(TEST_ROOT/'artifacts')
os.environ['JWT_SECRET'] = 'isolated-test-secret-never-use-in-production'
os.environ['HOMEVAL_DEMO_BILLING'] = '1'
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, engine
from models import ModelVersion, Subscription, TrainingJob, utcnow
from bootstrap import seed_accounts
from ml import load_dataset, NUMERIC, ARTIFACTS

@pytest.fixture(scope='module')
def client():
    seed_accounts()
    with sqlite3.connect(ROOT/'homeval.db') as source, SessionLocal() as db:
        for id, algorithm, tier, artifact, report in source.execute("select id,algorithm,tier,artifact,report from model_versions where state='Active'"):
            shutil.copyfile(ROOT/'artifacts'/artifact, ARTIFACTS/artifact)
            db.add(ModelVersion(id=id,algorithm=algorithm,tier=tier,artifact=artifact,report=json.loads(report),state='Active'))
        db.commit()
    with TestClient(app) as c:
        yield c
    engine.dispose()
    TEMP.cleanup()

@pytest.fixture
def users(client):
    import uuid
    result=[]
    for i in range(2):
        response=client.post('/api/auth/register',json={'email':f'{uuid.uuid4().hex}@example.com','password':'secure-password','display_name':'Test User'})
        assert response.status_code==201,response.text
        result.append({'Authorization':'Bearer '+response.json()['access_token']})
    admin=client.post('/api/auth/login',json={'email':'admin@homeval.vn','password':'admin123'}).json()
    return *result,{'Authorization':'Bearer '+admin['access_token']}

INPUT={'city':'Hồ Chí Minh','district':'Bình Thạnh','property_type':'Nhà phố','area_m2':72,'bedrooms':3,'bathrooms':2,'floors':2}

def test_real_prediction_catalog_and_validation(client):
    catalog=client.get('/api/models').json()
    assert len(catalog['items'])==3
    assert catalog['dataset']['original_rows']==30229
    r=client.post('/api/predictions',json=INPUT)
    assert r.status_code==200,r.text
    p=r.json(); assert not p['is_mock']
    assert p['confidence_interval']['lower']<p['estimated_price']<p['confidence_interval']['upper']
    assert p['estimated_price']>100_000_000 and p['warnings']
    for invalid in [{'area_m2':0},{'bathrooms':10},{'district':'Unknown District'},{'property_type':'Đất nền'},{'alpha':1},{'weights':[1,2]}]:
        assert client.post('/api/predictions',json={**INPUT,**invalid}).status_code==422
    assert client.post('/api/predictions',json=INPUT,headers={'Authorization':'Bearer invalid'}).status_code==401
    assert client.get('/docs').status_code==200
    assert '/api/admin/training' in client.get('/openapi.json').json()['paths']

def test_premium_payment_permissions_and_expiry(client,users):
    user,other,admin=users
    model=next(m for m in client.get('/api/models').json()['items'] if m['tier']=='premium')
    payload={**INPUT,'model_id':model['id']}
    assert client.post('/api/predictions',json=payload).status_code==403
    assert client.post('/api/predictions',json=payload,headers=user).status_code==403
    assert client.post('/api/admin/training',json={'algorithm':'ridge'}).status_code==401
    assert client.post('/api/admin/training',json={'algorithm':'ridge'},headers=user).status_code==403
    for route in ['/api/admin/models','/api/admin/stats','/api/admin/datasets']:
        assert client.get(route,headers=user).status_code==403
    assert client.patch('/api/me',json={'display_name':'Test User','role':'admin'},headers=user).status_code==422
    assert client.post('/api/billing/checkout',json={'amount':0},headers=user).status_code==422
    for outcome in ['failed','cancelled','success']:
        checkout=client.post('/api/billing/checkout',json={},headers=user).json()
        assert checkout['amount']==199000 and checkout['sandbox']
        url=f"/api/billing/checkout/{checkout['id']}/complete"
        assert client.post(url,json={'outcome':outcome},headers=other).status_code==404
        response=client.post(url,json={'outcome':outcome},headers=user)
        assert response.status_code==200,response.text
        ent=response.json()['entitlement'];assert ent['role']=='user' and not ent['can_train']
        assert ent['plan']==('premium' if outcome=='success' else 'free')
        repeated=client.post(url,json={'outcome':outcome},headers=user).json()
        assert repeated['entitlement']['expires_at']==ent['expires_at']
        assert client.post(url,json={'outcome':'failed' if outcome=='success' else 'success'},headers=user).status_code==409
    assert client.post('/api/predictions',json=payload,headers=user).status_code==200
    assert client.post('/api/admin/training',json={'algorithm':'ridge'},headers=user).status_code==403
    assert client.post('/api/predictions',json={**payload,'weights':[1]},headers=user).status_code==422
    uid=client.get('/api/me',headers=user).json()['id']
    with SessionLocal() as db:
        db.get(Subscription,uid).expires_at=utcnow()-timedelta(days=1);db.commit()
    assert client.post('/api/predictions',json=payload,headers=user).status_code==403

def test_saved_result_cannot_be_forged_or_read_by_other_users(client,users):
    user,other,_=users
    p=client.post('/api/predictions',json=INPUT).json();original=p['estimated_price']
    p['estimated_price']=1;p['input']['area_m2']=9999
    saved=client.post('/api/me/predictions',json={'prediction':p,'label':'Test asset'},headers=user)
    assert saved.status_code==200,saved.text
    assert saved.json()['estimated_price']==original and saved.json()['input']['area_m2']==72
    url='/api/me/predictions/'+p['id']
    assert client.get(url,headers=other).status_code==404
    assert client.delete(url,headers=other).status_code==404
    assert client.post('/api/me/predictions',json={'prediction':p},headers=other).status_code==404
    p['draft_token']='forged'
    assert client.post('/api/me/predictions',json={'prediction':p},headers=user).status_code==403
    assert client.get('/api/me/predictions?q=Test',headers=user).json()['total']==1
    assert client.get('/api/me/predictions',headers=other).json()['total']==0
    assert client.delete(url,headers=user).status_code==204
    assert client.get(url,headers=user).status_code==404

def test_training_publish_archive_lifecycle(client,users):
    _,_,admin=users
    assert client.post('/api/admin/training',json={'algorithm':'ridge','weights':[1]},headers=admin).status_code==422
    before={m['id'] for m in client.get('/api/models').json()['items']}
    job=client.post('/api/admin/training',json={'algorithm':'ridge','alpha':8},headers=admin)
    assert job.status_code==202,job.text
    status=client.get('/api/admin/training/'+job.json()['id'],headers=admin).json()
    assert status['status']=='completed',status
    id=status['result']['model_id'];assert id not in before
    assert {m['id'] for m in client.get('/api/models').json()['items']}==before
    assert client.post('/api/predictions',json={**INPUT,'model_id':id}).status_code==404
    assert client.post(f'/api/admin/models/{id}/activate',headers=admin).status_code==200
    after=client.get('/api/models').json()['items'];assert len(after)==3
    assert sum(m['tier']=='free' for m in after)==1
    assert client.post(f'/api/admin/models/{id}/archive',headers=admin).status_code==409
    premium=next(m['id'] for m in after if m['tier']=='premium')
    assert client.post(f'/api/admin/models/{premium}/archive',headers=admin).status_code==200
    assert client.post('/api/predictions',json={**INPUT,'model_id':premium},headers=admin).status_code==404
    assert client.post(f'/api/admin/models/{premium}/activate',headers=admin).status_code==200

def test_training_partitions_have_no_group_overlap():
    data,partitions,info=load_dataset()
    groups=data[['address_group']+NUMERIC].fillna(-1).astype(str).agg('|'.join,axis=1)
    a,b,c=[set(groups.iloc[index]) for index in partitions]
    assert not a&b and not a&c and not b&c
    assert sum(map(len,partitions))==info['cleaned_rows']

def test_sandbox_off_cannot_grant_subscription(client,users,monkeypatch):
    user,_,_=users
    monkeypatch.setenv('HOMEVAL_DEMO_BILLING','0')
    assert client.post('/api/billing/checkout',json={},headers=user).status_code==403

def test_admin_users_and_dataset_preview(client,users):
    _,_,admin=users
    page=client.get('/api/admin/users',headers=admin).json()
    assert page['total']>=3
    assert all('prediction_count' in u and u.get('status')=='Active' for u in page['items'])
    assert client.get('/api/admin/users',headers=users[0]).status_code==403
    assert client.get('/api/admin/users').status_code==401
    found=client.get('/api/admin/users?q=admin@homeval',headers=admin).json()
    assert found['total']>=1 and all('admin@homeval' in u['email'] for u in found['items'])
    victim=client.post('/api/auth/register',json={'email':'victim@example.com','password':'secure-password','display_name':'Victim User'}).json()
    assert client.post('/api/auth/login',json={'email':'victim@example.com','password':'secure-password'}).status_code==200
    assert client.post(f"/api/admin/users/{victim['user']['id']}/deactivate",headers=admin).status_code==200
    assert client.post('/api/auth/login',json={'email':'victim@example.com','password':'secure-password'}).status_code==401
    assert client.post(f"/api/admin/users/{victim['user']['id']}/deactivate",headers=admin).status_code==409
    me=client.get('/api/me',headers=admin).json()
    assert client.post(f"/api/admin/users/{me['id']}/deactivate",headers=admin).status_code==422
    assert client.post('/api/admin/users/999999/deactivate',headers=admin).status_code==404
    good={'file':('housing.csv','Address,Area,Price,Bedrooms,Bathrooms,Floors\n"Quan 1, HCM",50,5,2,2,1\n','text/csv')}
    preview=client.post('/api/admin/datasets/preview',files=good,headers=admin)
    assert preview.status_code==200,preview.text
    assert preview.json()['rows']==1 and not preview.json()['missing_columns']
    assert len(preview.json()['preview'])==1
    bad={'file':('housing.csv','Area,Price\n50,5\n','text/csv')}
    missing=client.post('/api/admin/datasets/preview',files=bad,headers=admin)
    assert missing.status_code==200
    assert set(['Address','Bedrooms','Bathrooms','Floors'])<=set(missing.json()['missing_columns'])
    txt={'file':('housing.txt','Address\nX\n','text/plain')}
    assert client.post('/api/admin/datasets/preview',files=txt,headers=admin).status_code==422
    assert client.post('/api/admin/datasets/preview',files=good).status_code==401

def test_admin_users_filter_and_sort(client,users):
    _,_,admin=users
    extra=client.post('/api/auth/register',json={'email':'zebra@example.com','password':'secure-password','display_name':'Zebra User'})
    assert extra.status_code==201
    assert client.get('/api/admin/users?role=user',headers=admin).json()['total']>=2
    admins=client.get('/api/admin/users?role=admin',headers=admin).json()
    assert admins['total']>=1 and all(u['role']=='admin' for u in admins['items'])
    assert client.get('/api/admin/users?status=Active',headers=admin).json()['total']>=3
    assert all('prediction_count' in u for u in admins['items'])
    assert client.get('/api/admin/users?role=boss',headers=admin).status_code==422
    assert client.get('/api/admin/users?status=bogus',headers=admin).status_code==422
    assert client.get('/api/admin/users?sort=bogus',headers=admin).status_code==422
    assert client.get('/api/admin/users?order=sideways',headers=admin).status_code==422
    byname=client.get('/api/admin/users?sort=name&order=asc',headers=admin).json()
    names=[u['display_name'] for u in byname['items']]
    assert names==sorted(names)

def test_admin_user_deactivate_reactivate(client,users):
    _,_,admin=users
    victim=client.post('/api/auth/register',json={'email':'victim-reactivate@example.com','password':'secure-password','display_name':'Victim User'}).json()
    assert client.post('/api/auth/login',json={'email':'victim-reactivate@example.com','password':'secure-password'}).status_code==200
    assert client.post(f"/api/admin/users/{victim['user']['id']}/deactivate",headers=admin).status_code==200
    assert client.post('/api/auth/login',json={'email':'victim-reactivate@example.com','password':'secure-password'}).status_code==401
    assert client.post(f"/api/admin/users/{victim['user']['id']}/deactivate",headers=admin).status_code==409
    assert client.post(f"/api/admin/users/{victim['user']['id']}/reactivate",headers=admin).status_code==200
    assert client.post('/api/auth/login',json={'email':'victim-reactivate@example.com','password':'secure-password'}).status_code==200
    assert client.post(f"/api/admin/users/{victim['user']['id']}/reactivate",headers=admin).status_code==409
    me=client.get('/api/me',headers=admin).json()
    assert client.post(f"/api/admin/users/{me['id']}/deactivate",headers=admin).status_code==422
    assert client.post('/api/admin/users/999999/deactivate',headers=admin).status_code==404
    assert client.post('/api/admin/users/999999/reactivate',headers=admin).status_code==404
