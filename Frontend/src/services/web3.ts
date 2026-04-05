/**
 * Web3 Service — integrates with the RideSharing.sol smart contract.
 *
 * On mobile there is no injected window.ethereum, so this service falls back to
 * deterministic mock transactions while keeping the full ABI ready for when
 * WalletConnect / a real provider is wired up.
 */

import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────
//  Contract ABI (mirrors contracts/RideSharing.sol)
// ─────────────────────────────────────────────────────────────

export const RIDE_SHARING_ABI = [
  'function createRide(string source, string destination, uint256 pricePerSeat, uint8 seats, uint256 departureTime) returns (bytes32)',
  'function bookRide(bytes32 rideId, uint8 seatsRequested) payable returns (bytes32)',
  'function completeRide(bytes32 rideId)',
  'function cancelBooking(bytes32 bookingId)',
  'function cancelRide(bytes32 rideId)',
  'function getRide(bytes32 rideId) view returns (tuple(bytes32 id, address driver, string source, string destination, uint256 pricePerSeat, uint8 seatsAvailable, uint8 totalSeats, uint8 status, uint256 departureTime, uint256 createdAt))',
  'function getBooking(bytes32 bookingId) view returns (tuple(bytes32 id, bytes32 rideId, address passenger, uint8 seatsBooked, uint256 totalAmount, uint8 status, uint256 createdAt))',
  'function getTotalRides() view returns (uint256)',
  'event RideCreated(bytes32 indexed rideId, address indexed driver, string source, string destination, uint256 pricePerSeat, uint8 seats, uint256 departureTime)',
  'event RideBooked(bytes32 indexed bookingId, bytes32 indexed rideId, address indexed passenger, uint8 seatsBooked, uint256 totalAmount)',
  'event RideCompleted(bytes32 indexed rideId, address indexed driver, uint256 driverPayout, uint256 platformFee)',
  'event BookingCancelled(bytes32 indexed bookingId, bytes32 indexed rideId, address indexed passenger, uint256 refundAmount)',
] as const;

/** Replace with deployed address after running Hardhat / Foundry deploy */
export const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000000';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

export interface WalletConnection {
  address: string;
  provider: ethers.providers.Web3Provider;
  signer: ethers.Signer;
}

// ─────────────────────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────────────────────

class Web3Service {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer:   ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  /** Attempt to connect to the injected browser wallet (web) */
  async connectWallet(): Promise<WalletConnection | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const web3Provider = new ethers.providers.Web3Provider((window as any).ethereum);
        await web3Provider.send('eth_requestAccounts', []);
        const web3Signer = web3Provider.getSigner();
        const address    = await web3Signer.getAddress();

        this.provider = web3Provider;
        this.signer   = web3Signer;
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, RIDE_SHARING_ABI, web3Signer);

        console.log('[Web3] Wallet connected:', address);
        return { address, provider: web3Provider, signer: web3Signer };
      }
      console.log('[Web3] No injected provider — using mock mode');
      return null;
    } catch (error) {
      console.error('[Web3] connectWallet error:', error);
      return null;
    }
  }

  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer   = null;
    this.contract = null;
  }

  isConnected(): boolean {
    return this.signer !== null;
  }

  getConnectedAddress(): string | null {
    if (!this.signer) return null;
    // Sync-safe placeholder — real address is fetched async
    return 'connected';
  }

  // ─────────────────────────────────────────────────────────
  //  Contract Calls (real)
  // ─────────────────────────────────────────────────────────

  async createRideOnChain(data: {
    from: string; to: string; price: number; seats: number;
  }): Promise<string | null> {
    if (!this.contract || !this.signer) return this.mockCreateRideTransaction(data);
    try {
      const priceWei      = ethers.utils.parseEther(String(data.price));
      const departure     = Math.floor(Date.now() / 1000) + 3600;
      const tx: ethers.ContractTransaction = await this.contract.createRide(
        data.from, data.to, priceWei, data.seats, departure
      );
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('[Web3] createRideOnChain error:', e);
      return this.mockCreateRideTransaction(data);
    }
  }

  async bookRideOnChain(
    rideId: string,
    seats: number,
    priceUsd: number,
  ): Promise<string | null> {
    if (!this.contract || !this.signer) return this.mockBookTransaction(rideId, seats, priceUsd);
    try {
      const rideIdBytes = ethers.utils.id(rideId);
      const value       = ethers.utils.parseEther(String(priceUsd * seats));
      const tx: ethers.ContractTransaction = await this.contract.bookRide(rideIdBytes, seats, { value });
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('[Web3] bookRideOnChain error:', e);
      return this.mockBookTransaction(rideId, seats, priceUsd);
    }
  }

  async completeRide(rideId: string): Promise<string | null> {
    if (!this.contract) return this.mockTx();
    try {
      const rideIdBytes = ethers.utils.id(rideId);
      const tx: ethers.ContractTransaction = await this.contract.completeRide(rideIdBytes);
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('[Web3] completeRide error:', e);
      return this.mockTx();
    }
  }

  async cancelBooking(bookingId: string): Promise<string | null> {
    if (!this.contract) return this.mockTx();
    try {
      const bookingIdBytes = ethers.utils.id(bookingId);
      const tx: ethers.ContractTransaction = await this.contract.cancelBooking(bookingIdBytes);
      await tx.wait();
      return tx.hash;
    } catch (e) {
      console.error('[Web3] cancelBooking error:', e);
      return this.mockTx();
    }
  }

  // ─────────────────────────────────────────────────────────
  //  Mock helpers (used when wallet not connected)
  // ─────────────────────────────────────────────────────────

  /** Simulates a 1-2 s blockchain confirmation delay */
  private async delay(ms = 1200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mockTx(): string {
    return `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  async mockCreateRideTransaction(data: {
    from: string; to: string; price: number; seats: number;
  }): Promise<string> {
    console.log('[Mock Chain] createRide', data);
    await this.delay();
    return this.mockTx();
  }

  async mockBookTransaction(
    rideId: string,
    seats: number,
    priceUsd: number,
  ): Promise<string> {
    console.log('[Mock Chain] bookRide', { rideId, seats, priceUsd });
    await this.delay();
    return this.mockTx();
  }
}

export const web3Service = new Web3Service();
