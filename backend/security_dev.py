from fastapi import FastAPI

from backend.api.scan import router

app = FastAPI(title="Security Engine (dev only)")
app.include_router(router)