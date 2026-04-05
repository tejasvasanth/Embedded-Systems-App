from fastapi import APIRouter

from app.api.v1.endpoints import auth, blockchain, bookings, ratings, rides, users


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(rides.router)
api_router.include_router(bookings.router)
api_router.include_router(ratings.router)
api_router.include_router(blockchain.router)
