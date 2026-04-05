from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_v1_router
from app.utils.logger import logger

app = FastAPI(
    title="Decentralized Ride Sharing API",
    version="1.0.0",
    description="A blockchain-integrated ride sharing platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {"message": "API is running", "version": "1.0.0"}


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Application started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    logger.info("Application stopped")
