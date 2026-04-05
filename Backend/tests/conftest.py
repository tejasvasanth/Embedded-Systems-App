import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql+asyncpg", "sqlite+aiosqlite", 1),
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(test_engine):
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session


@pytest.fixture
def client(db_session):
    def override_get_db():
        return db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_blockchain_service(monkeypatch):
    async def mock_initiate_booking_transaction(ride_id, user_wallet):
        return "0x123456789abcdef"

    async def mock_complete_ride_transaction(ride_id):
        return "0x987654321fedcba"

    async def mock_refund_transaction(ride_id):
        return "0xabcdef123456789"

    from app.services import blockchain_service

    monkeypatch.setattr(
        blockchain_service,
        "initiate_booking_transaction",
        mock_initiate_booking_transaction,
    )
    monkeypatch.setattr(
        blockchain_service,
        "complete_ride_transaction",
        mock_complete_ride_transaction,
    )
    monkeypatch.setattr(
        blockchain_service,
        "refund_transaction",
        mock_refund_transaction,
    )
