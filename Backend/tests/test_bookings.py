from datetime import datetime, timedelta
import pytest


@pytest.fixture
def setup_ride_and_user(client):
    driver_response = client.post(
        "/api/v1/auth/login",
        json={"wallet_address": "0xdriver123"},
    )
    driver_token = driver_response.json()["access_token"]

    ride_response = client.post(
        "/api/v1/rides",
        json={
            "source": "Location A",
            "destination": "Location B",
            "ride_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "price": 100.0,
            "seats_available": 2,
        },
        headers={"Authorization": f"Bearer {driver_token}"},
    )
    ride = ride_response.json()

    passenger_response = client.post(
        "/api/v1/auth/login",
        json={"wallet_address": "0xpassenger123"},
    )
    passenger_token = passenger_response.json()["access_token"]

    return {
        "ride_id": ride["id"],
        "passenger_token": passenger_token,
        "driver_token": driver_token,
    }


def test_book_ride(client, setup_ride_and_user, mock_blockchain_service):
    ride_id = setup_ride_and_user["ride_id"]
    token = setup_ride_and_user["passenger_token"]

    payload = {"ride_id": str(ride_id), "seats_booked": 1}
    response = client.post(
        "/api/v1/bookings",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    booking = response.json()
    assert booking["ride_id"] == str(ride_id)
    assert booking["seats_booked"] == 1
    assert booking["status"] == "booked"


def test_get_booking(client, setup_ride_and_user, mock_blockchain_service):
    ride_id = setup_ride_and_user["ride_id"]
    token = setup_ride_and_user["passenger_token"]

    create_response = client.post(
        "/api/v1/bookings",
        json={"ride_id": str(ride_id), "seats_booked": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    booking_id = create_response.json()["id"]

    response = client.get(
        f"/api/v1/bookings/{booking_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    booking = response.json()
    assert booking["id"] == booking_id


def test_book_ride_insufficient_seats(client, setup_ride_and_user, mock_blockchain_service):
    ride_id = setup_ride_and_user["ride_id"]
    token = setup_ride_and_user["passenger_token"]

    response = client.post(
        "/api/v1/bookings",
        json={"ride_id": str(ride_id), "seats_booked": 10},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
