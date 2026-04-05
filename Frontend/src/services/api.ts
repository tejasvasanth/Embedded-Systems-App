import { supabase } from './supabase';
import { Ride, Booking, Profile } from '@/src/context/AppContext';

const mapRideFromDb = (ride: any): Ride => {
  const availableSeats = Number(ride.seats_available ?? ride.available_seats ?? 0);
  const totalSeats = Number(ride.total_seats ?? availableSeats);

  return {
    id: ride.id,
    driver_id: ride.driver_id,
    from_location: ride.source ?? ride.from_location,
    to_location: ride.destination ?? ride.to_location,
    departure_time: ride.ride_time ?? ride.departure_time,
    price: Number(ride.price ?? 0),
    available_seats: availableSeats,
    total_seats: totalSeats,
    status: ride.status ?? 'available',
    vehicle_model: ride.vehicle_model ?? 'N/A',
    blockchain_tx: ride.blockchain_tx ?? ride.tx_hash ?? null,
    created_at: ride.created_at,
    driver: ride.driver
      ? {
          id: ride.driver.id,
          wallet_address: ride.driver.wallet_address ?? null,
          name: ride.driver.name ?? null,
          email: ride.driver.email ?? null,
          rating: Number(ride.driver.rating ?? 0),
          total_rides: ride.driver.total_rides ?? 0,
          created_at: ride.driver.created_at,
        }
      : undefined,
  };
};

const mapBookingFromDb = (booking: any): Booking => ({
  id: booking.id,
  ride_id: booking.ride_id,
  passenger_id: booking.passenger_id,
  seats_booked: booking.seats_booked,
  total_price:
    booking.total_price != null
      ? Number(booking.total_price)
      : Number(booking.ride?.price ?? 0) * Number(booking.seats_booked ?? 0),
  status: booking.status,
  blockchain_tx: booking.tx_hash ?? null,
  created_at: booking.created_at,
  ride: booking.ride ? mapRideFromDb(booking.ride) : undefined,
});

export class ApiService {
  async getRides(): Promise<Ride[]> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:users(*)
        `)
        .order('ride_time', { ascending: true });

      if (error) throw error;
      return (data || []).map(mapRideFromDb);
    } catch (error) {
      console.error('Error fetching rides:', error);
      throw error;
    }
  }

  async getRideById(id: string): Promise<Ride | null> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:users(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? mapRideFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching ride:', error);
      throw error;
    }
  }

  async createRide(rideData: {
    driver_id: string;
    from_location: string;
    to_location: string;
    departure_time: string;
    price: number;
    available_seats: number;
    total_seats: number;
    vehicle_model: string;
    blockchain_tx?: string;
  }): Promise<Ride | null> {
    try {
      const insertPayload = {
        driver_id: rideData.driver_id,
        source: rideData.from_location,
        destination: rideData.to_location,
        ride_time: rideData.departure_time,
        price: rideData.price,
        seats_available: rideData.available_seats,
        status: 'available',
      };

      const { data, error } = await supabase
        .from('rides')
        .insert([insertPayload])
        .select(`
          *,
          driver:users(*)
        `)
        .single();

      if (error) throw error;
      return data ? mapRideFromDb(data) : null;
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  }

  async bookRide(bookingData: {
    ride_id: string;
    passenger_id: string;
    seats_booked: number;
    total_price: number;
    blockchain_tx?: string;
  }): Promise<Booking | null> {
    try {
      const insertPayload = {
        ride_id: bookingData.ride_id,
        passenger_id: bookingData.passenger_id,
        seats_booked: bookingData.seats_booked,
        status: 'booked',
        tx_hash: bookingData.blockchain_tx ?? null,
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([insertPayload])
        .select(`
          *,
          ride:rides(
            *,
            driver:users(*)
          )
        `)
        .single();

      if (bookingError) throw bookingError;

      const { data: ride } = await supabase
        .from('rides')
        .select('seats_available')
        .eq('id', bookingData.ride_id)
        .single();

      if (ride) {
        const newAvailableSeats = ride.seats_available - bookingData.seats_booked;
        await supabase
          .from('rides')
          .update({
            seats_available: newAvailableSeats,
            status: newAvailableSeats === 0 ? 'in_progress' : 'available',
          })
          .eq('id', bookingData.ride_id);
      }

      return booking ? mapBookingFromDb(booking) : null;
    } catch (error) {
      console.error('Error booking ride:', error);
      throw error;
    }
  }

  async getMyBookings(userId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ride:rides(
            *,
            driver:users(*)
          )
        `)
        .eq('passenger_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapBookingFromDb);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          ride:rides(
            *,
            driver:users(*)
          )
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapBookingFromDb(data) : null;
    } catch (error) {
      console.error('Error fetching booking by id:', error);
      throw error;
    }
  }

  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();

