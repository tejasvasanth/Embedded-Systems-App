"""
Blockchain service — mocks Ethereum smart-contract interactions.

When a real node / Hardhat is available set USE_REAL_CHAIN=true in .env and
supply CONTRACT_ADDRESS + RPC_URL.  Until then every function returns a
realistic-looking fake transaction hash and logs what would have happened
on-chain.

Contract ABI (RideSharing.sol) is embedded here so the service is
self-contained; copy it to the frontend as well.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from uuid import UUID

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
#  Contract ABI  (mirrors contracts/RideSharing.sol)
# ─────────────────────────────────────────────────────────────

RIDE_SHARING_ABI: list[dict] = [
    {
        "name": "createRide",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "source",        "type": "string"},
            {"name": "destination",   "type": "string"},
            {"name": "pricePerSeat",  "type": "uint256"},
            {"name": "seats",         "type": "uint8"},
            {"name": "departureTime", "type": "uint256"},
        ],
        "outputs": [{"name": "rideId", "type": "bytes32"}],
    },
    {
        "name": "bookRide",
        "type": "function",
        "stateMutability": "payable",
        "inputs": [
            {"name": "rideId",         "type": "bytes32"},
            {"name": "seatsRequested", "type": "uint8"},
        ],
        "outputs": [{"name": "bookingId", "type": "bytes32"}],
    },
    {
        "name": "completeRide",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "rideId", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "name": "cancelBooking",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "bookingId", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "name": "cancelRide",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "rideId", "type": "bytes32"}],
        "outputs": [],
    },
    {
        "name": "getRide",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "rideId", "type": "bytes32"}],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "components": [
                    {"name": "id",             "type": "bytes32"},
                    {"name": "driver",         "type": "address"},
                    {"name": "source",         "type": "string"},
                    {"name": "destination",    "type": "string"},
                    {"name": "pricePerSeat",   "type": "uint256"},
                    {"name": "seatsAvailable", "type": "uint8"},
                    {"name": "totalSeats",     "type": "uint8"},
                    {"name": "status",         "type": "uint8"},
                    {"name": "departureTime",  "type": "uint256"},
                    {"name": "createdAt",      "type": "uint256"},
                ],
            }
        ],
    },
    {
        "name": "RideCreated",
        "type": "event",
        "inputs": [
            {"name": "rideId",        "type": "bytes32",  "indexed": True},
            {"name": "driver",        "type": "address",  "indexed": True},
            {"name": "source",        "type": "string",   "indexed": False},
            {"name": "destination",   "type": "string",   "indexed": False},
            {"name": "pricePerSeat",  "type": "uint256",  "indexed": False},
            {"name": "seats",         "type": "uint8",    "indexed": False},
            {"name": "departureTime", "type": "uint256",  "indexed": False},
        ],
    },
    {
        "name": "RideBooked",
        "type": "event",
        "inputs": [
            {"name": "bookingId",   "type": "bytes32", "indexed": True},
            {"name": "rideId",      "type": "bytes32", "indexed": True},
            {"name": "passenger",   "type": "address", "indexed": True},
            {"name": "seatsBooked", "type": "uint8",   "indexed": False},
            {"name": "totalAmount", "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "RideCompleted",
        "type": "event",
        "inputs": [
            {"name": "rideId",       "type": "bytes32", "indexed": True},
            {"name": "driver",       "type": "address", "indexed": True},
            {"name": "driverPayout", "type": "uint256", "indexed": False},
            {"name": "platformFee",  "type": "uint256", "indexed": False},
        ],
    },
    {
        "name": "BookingCancelled",
        "type": "event",
        "inputs": [
            {"name": "bookingId",    "type": "bytes32", "indexed": True},
            {"name": "rideId",       "type": "bytes32", "indexed": True},
            {"name": "passenger",    "type": "address", "indexed": True},
            {"name": "refundAmount", "type": "uint256", "indexed": False},
        ],
    },
]

CONTRACT_ADDRESS: str = os.getenv("CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000")
USE_REAL_CHAIN:   bool = os.getenv("USE_REAL_CHAIN", "false").lower() == "true"


def _fake_tx() -> str:
    return f"0x{uuid.uuid4().hex}{uuid.uuid4().hex[:8]}"


def _log_mock(fn: str, **kwargs: object) -> None:
    logger.info(
        "[MOCK CHAIN] %s | contract=%s | %s",
        fn,
        CONTRACT_ADDRESS,
        json.dumps({k: str(v) for k, v in kwargs.items()}),
    )


async def create_ride_transaction(
    ride_id: UUID,
    driver_wallet: str,
    source: str,
    destination: str,
    price_wei: int,
    seats: int,
    departure_timestamp: int,
) -> str:
    _log_mock(
        "createRide",
        ride_id=ride_id,
        driver=driver_wallet,
        source=source,
        destination=destination,
        price_wei=price_wei,
        seats=seats,
        departure=departure_timestamp,
    )
    return _fake_tx()


async def initiate_booking_transaction(
    ride_id: UUID,
    user_wallet: str,
    seats: int = 1,
    price_wei: int = 0,
) -> str:
    _log_mock(
        "bookRide",
        ride_id=ride_id,
        passenger=user_wallet,
        seats=seats,
        value_wei=price_wei * seats,
    )
    return _fake_tx()


async def complete_ride_transaction(ride_id: UUID, driver_wallet: str = "") -> str:
    _log_mock("completeRide", ride_id=ride_id, driver=driver_wallet)
    return _fake_tx()


async def cancel_booking_transaction(booking_id: UUID, passenger_wallet: str = "") -> str:
    _log_mock("cancelBooking", booking_id=booking_id, passenger=passenger_wallet)
    return _fake_tx()


async def refund_transaction(ride_id: UUID, driver_wallet: str = "") -> str:
    _log_mock("cancelRide", ride_id=ride_id, driver=driver_wallet)
    return _fake_tx()


def get_contract_info() -> dict:
    return {
        "address": CONTRACT_ADDRESS,
        "network": os.getenv("CHAIN_NAME", "localhost"),
        "chain_id": int(os.getenv("CHAIN_ID", "1337")),
        "abi": RIDE_SHARING_ABI,
    }
