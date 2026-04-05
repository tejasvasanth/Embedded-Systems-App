import uuid
from datetime import datetime, timezone
from typing import Any


def generate_tx_hash() -> str:
    """Generate a fake blockchain transaction hash."""
    return f"0x{uuid.uuid4().hex}"


def format_response(data: Any, message: str = "success") -> dict:
    """Return a consistent API response structure."""
    return {
        "success": True,
        "message": message,
        "data": data,
    }


def paginate_query(items: list, page: int = 1, limit: int = 10) -> dict:
    """Apply pagination logic to a list of items."""
    if page < 1:
        page = 1
    if limit < 1:
        limit = 10

    start_idx = (page - 1) * limit
    end_idx = start_idx + limit

    paginated_items = items[start_idx:end_idx]
    total = len(items)
    total_pages = (total + limit - 1) // limit

    return {
        "items": paginated_items,
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def get_current_timestamp() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)
