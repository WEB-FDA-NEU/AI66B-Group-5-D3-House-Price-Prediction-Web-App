"""Run the local review app. Sandbox billing never charges money."""
import os
import uvicorn

if __name__ == "__main__":
    os.environ.setdefault("HOMEVAL_DEMO_BILLING", "1")
    from bootstrap import seed_accounts
    seed_accounts()
    uvicorn.run("main:app", host="127.0.0.1", port=int(os.getenv("PORT", "8000")), access_log=False)
