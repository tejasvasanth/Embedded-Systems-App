// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RideSharing — Decentralized ride-sharing escrow contract
/// @notice Handles ride creation, booking (with ETH escrow), completion and cancellation
contract RideSharing {
    // ─────────────────────────────────────────────────────────
    //  Enums & Structs
    // ─────────────────────────────────────────────────────────

    enum RideStatus    { Available, Booked, InProgress, Completed, Cancelled }
    enum BookingStatus { Pending, Confirmed, Completed, Cancelled, Refunded }

    struct Ride {
        bytes32  id;
        address  driver;
        string   source;
        string   destination;
        uint256  pricePerSeat;   // in wei
        uint8    seatsAvailable;
        uint8    totalSeats;
        RideStatus status;
        uint256  departureTime;
        uint256  createdAt;
    }

    struct Booking {
        bytes32       id;
        bytes32       rideId;
        address       passenger;
        uint8         seatsBooked;
        uint256       totalAmount;  // in wei
        BookingStatus status;
        uint256       createdAt;
    }

    // ─────────────────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────────────────

    address public owner;
    uint256 public platformFeeBps = 250; // 2.5 %

    mapping(bytes32 => Ride)    public rides;
    mapping(bytes32 => Booking) public bookings;

    /// ride → list of booking ids
    mapping(bytes32 => bytes32[]) public rideBookings;
    /// passenger → list of booking ids
    mapping(address => bytes32[]) public passengerBookings;
    /// driver   → list of ride ids
    mapping(address => bytes32[]) public driverRides;

    bytes32[] public allRideIds;

    // ─────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────

    event RideCreated(
        bytes32 indexed rideId,
        address indexed driver,
        string  source,
        string  destination,
        uint256 pricePerSeat,
        uint8   seats,
        uint256 departureTime
    );

    event RideBooked(
        bytes32 indexed bookingId,
        bytes32 indexed rideId,
        address indexed passenger,
        uint8   seatsBooked,
        uint256 totalAmount
    );

    event RideCompleted(
        bytes32 indexed rideId,
        address indexed driver,
        uint256 driverPayout,
        uint256 platformFee
    );

    event BookingCancelled(
        bytes32 indexed bookingId,
        bytes32 indexed rideId,
        address indexed passenger,
        uint256 refundAmount
    );

    event RideCancelled(bytes32 indexed rideId, address indexed driver);

    // ─────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────

    modifier onlyOwner()           { require(msg.sender == owner,                    "Not owner");            _; }
    modifier rideExists(bytes32 id){ require(rides[id].createdAt != 0,               "Ride not found");       _; }
    modifier bookingExists(bytes32 id){ require(bookings[id].createdAt != 0,         "Booking not found");    _; }

    // ─────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────
    //  Admin
    // ─────────────────────────────────────────────────────────

    function setPlatformFee(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Fee capped at 10%");
        platformFeeBps = bps;
    }

    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // ─────────────────────────────────────────────────────────
    //  Core: Create Ride
    // ─────────────────────────────────────────────────────────

    function createRide(
        string  calldata source,
        string  calldata destination,
        uint256 pricePerSeat,
        uint8   seats,
        uint256 departureTime
    ) external returns (bytes32 rideId) {
        require(pricePerSeat > 0,          "Price must be > 0");
        require(seats > 0,                 "Seats must be > 0");
        require(departureTime > block.timestamp, "Departure in the past");

        rideId = keccak256(abi.encodePacked(
            msg.sender, source, destination, block.timestamp, block.prevrandao
        ));

        rides[rideId] = Ride({
            id:             rideId,
            driver:         msg.sender,
            source:         source,
            destination:    destination,
            pricePerSeat:   pricePerSeat,
            seatsAvailable: seats,
            totalSeats:     seats,
            status:         RideStatus.Available,
            departureTime:  departureTime,
            createdAt:      block.timestamp
        });

        driverRides[msg.sender].push(rideId);
        allRideIds.push(rideId);

        emit RideCreated(rideId, msg.sender, source, destination, pricePerSeat, seats, departureTime);
    }

    // ─────────────────────────────────────────────────────────
    //  Core: Book Ride (ETH escrow)
    // ─────────────────────────────────────────────────────────

    function bookRide(bytes32 rideId, uint8 seatsRequested)
        external
        payable
        rideExists(rideId)
        returns (bytes32 bookingId)
    {
        Ride storage ride = rides[rideId];

        require(ride.status == RideStatus.Available, "Ride not available");
        require(seatsRequested > 0,                  "Seats must be > 0");
        require(ride.seatsAvailable >= seatsRequested, "Not enough seats");
        require(msg.sender != ride.driver,             "Driver cannot book own ride");

        uint256 required = ride.pricePerSeat * seatsRequested;
        require(msg.value >= required, "Insufficient ETH sent");

        // Refund overpayment
        if (msg.value > required) {
            payable(msg.sender).transfer(msg.value - required);
        }

        bookingId = keccak256(abi.encodePacked(
            rideId, msg.sender, block.timestamp, block.prevrandao
        ));

        bookings[bookingId] = Booking({
            id:           bookingId,
            rideId:       rideId,
            passenger:    msg.sender,
            seatsBooked:  seatsRequested,
            totalAmount:  required,
            status:       BookingStatus.Confirmed,
            createdAt:    block.timestamp
        });

        ride.seatsAvailable -= seatsRequested;
        if (ride.seatsAvailable == 0) {
            ride.status = RideStatus.Booked;
        }

        rideBookings[rideId].push(bookingId);
        passengerBookings[msg.sender].push(bookingId);

        emit RideBooked(bookingId, rideId, msg.sender, seatsRequested, required);
    }

    // ─────────────────────────────────────────────────────────
    //  Core: Complete Ride (release escrow to driver)
    // ─────────────────────────────────────────────────────────

    function completeRide(bytes32 rideId) external rideExists(rideId) {
        Ride storage ride = rides[rideId];

        require(
            msg.sender == ride.driver || msg.sender == owner,
            "Not authorised"
        );
        require(
            ride.status == RideStatus.Available ||
            ride.status == RideStatus.Booked    ||
            ride.status == RideStatus.InProgress,
            "Cannot complete in current state"
        );

        ride.status = RideStatus.Completed;

        // Aggregate escrow across all bookings for this ride
        bytes32[] storage bIds = rideBookings[rideId];
        uint256 total = 0;
        for (uint i = 0; i < bIds.length; i++) {
            Booking storage b = bookings[bIds[i]];
            if (b.status == BookingStatus.Confirmed) {
                b.status  = BookingStatus.Completed;
                total    += b.totalAmount;
            }
        }

        if (total > 0) {
            uint256 fee    = (total * platformFeeBps) / 10_000;
            uint256 payout = total - fee;
            payable(ride.driver).transfer(payout);
            emit RideCompleted(rideId, ride.driver, payout, fee);
        }
    }

    // ─────────────────────────────────────────────────────────
    //  Core: Cancel Booking (refund passenger)
    // ─────────────────────────────────────────────────────────

    function cancelBooking(bytes32 bookingId) external bookingExists(bookingId) {
        Booking storage booking = bookings[bookingId];
        Ride    storage ride    = rides[booking.rideId];

        require(
            msg.sender == booking.passenger || msg.sender == owner,
            "Not authorised"
        );
        require(booking.status == BookingStatus.Confirmed, "Booking not active");
        require(ride.status != RideStatus.Completed,       "Ride already completed");

        booking.status = BookingStatus.Refunded;
        ride.seatsAvailable += booking.seatsBooked;

        if (ride.status == RideStatus.Booked) {
            ride.status = RideStatus.Available;
        }

        payable(booking.passenger).transfer(booking.totalAmount);

        emit BookingCancelled(bookingId, booking.rideId, booking.passenger, booking.totalAmount);
    }

    // ─────────────────────────────────────────────────────────
    //  Core: Cancel entire Ride (driver)
    // ─────────────────────────────────────────────────────────

    function cancelRide(bytes32 rideId) external rideExists(rideId) {
        Ride storage ride = rides[rideId];

        require(
            msg.sender == ride.driver || msg.sender == owner,
            "Not authorised"
        );
        require(
            ride.status != RideStatus.Completed &&
            ride.status != RideStatus.Cancelled,
            "Cannot cancel"
        );

        ride.status = RideStatus.Cancelled;

        // Refund all confirmed bookings
        bytes32[] storage bIds = rideBookings[rideId];
        for (uint i = 0; i < bIds.length; i++) {
            Booking storage b = bookings[bIds[i]];
            if (b.status == BookingStatus.Confirmed) {
                b.status = BookingStatus.Refunded;
                payable(b.passenger).transfer(b.totalAmount);
                emit BookingCancelled(bIds[i], rideId, b.passenger, b.totalAmount);
            }
        }

        emit RideCancelled(rideId, ride.driver);
    }

    // ─────────────────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────────────────

    function getRide(bytes32 rideId)
        external
        view
        rideExists(rideId)
        returns (Ride memory)
    {
        return rides[rideId];
    }

    function getBooking(bytes32 bookingId)
        external
        view
        bookingExists(bookingId)
        returns (Booking memory)
    {
        return bookings[bookingId];
    }

    function getDriverRides(address driver) external view returns (bytes32[] memory) {
        return driverRides[driver];
    }

    function getPassengerBookings(address passenger) external view returns (bytes32[] memory) {
        return passengerBookings[passenger];
    }

    function getRideBookings(bytes32 rideId) external view returns (bytes32[] memory) {
        return rideBookings[rideId];
    }

    function getAllRideIds() external view returns (bytes32[] memory) {
        return allRideIds;
    }

    function getTotalRides() external view returns (uint256) {
        return allRideIds.length;
    }

    receive() external payable {}
}
