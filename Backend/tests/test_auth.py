import pytest


def test_login_with_wallet(client):
    payload = {"wallet_address": "0x1234567890abcdef"}
    response = client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["wallet_address"] == payload["wallet_address"]


def test_login_creates_new_user(client):
    wallet = "0xneuwallet123"
    payload = {"wallet_address": wallet}
    response = client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == 200
    user = response.json()["user"]
    assert user["wallet_address"] == wallet
    assert user["rating"] == 0.0
    assert user["total_rides"] == 0


def test_get_current_user_authenticated(client):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"wallet_address": "0xauthtest"},
    )
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    user = response.json()
    assert user["wallet_address"] == "0xauthtest"


def test_get_current_user_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
