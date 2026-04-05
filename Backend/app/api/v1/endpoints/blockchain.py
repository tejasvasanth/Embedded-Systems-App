from fastapi import APIRouter
from app.services.blockchain_service import get_contract_info

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@router.get("/contract", status_code=200)
async def contract_info() -> dict:
    """Return the deployed contract address and ABI for frontend integration."""
    return get_contract_info()
