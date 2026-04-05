from datetime import datetime, timedelta
import pytest


@pytest.fixture
def auth_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"wallet_address": "0xridedriver"},
    )
    return response.json()["access_token"]


def test_create_ride(client, auth_token):
    payload = {
        "source": "Downtown",
        "destination": "Airport",
        "ride_time": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
        "price": 50.0,
        "seats_available": 4,
    }
    response = client.post(
        "/api/v1/rides",
        json=payload,
        headers={"Authorization": f"Bearer {auth_token}"},
    )

    assert response.status_code == 201
    ride = response.json()
    assert ride["source"] == "Downtown"
    assert ride["destination"] == "Airport"
    assert ride["status"] == "available"


def test_list_rides(client):
    response = client.get("/api/v1/rides")
    assert response.status_code == 200
    rides = response.json()
    assert isinstance(rides, list)


def test_list_rides_with_filter(client):
    response = client.get("/api/v1/rides?source=Downtown")
    assert response.status_code == 200
    rides = response.json()
    assert isinstance(rides, list)


def test_get_ride_by_id(client, auth_token):
    create_response = client.post(
        "/api/v1/rides",
        json={
            "source": "Park",
            "destination": "Station",
            "ride_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "price": 25.0,
            "seats_available": 3,
        },
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    ride_id = create_response.json()["id"]

    response = client.get(f"/api/v1/rides/{ride_id}")
    assert response.status_code == 200
    ride = response.json()
    assert ride["id"] == ride_id


def test_get_nonexistent_ride(client):
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/rides/{fake_id}")
    assert response.status_code == 404
