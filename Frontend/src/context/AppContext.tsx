import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabase';

export interface Profile {
  id: string;
  wallet_address: string | null;
  name: string | null;
  email: string | null;
  rating: number;
  total_rides: number;
  created_at: string;
}

export interface Ride {
  id: string;
  driver_id: string;
  from_location: string;
  to_location: string;
  departure_time: string;
  price: number;
  available_seats: number;
  total_seats: number;
  status: 'available' | 'in_progress' | 'completed' | 'cancelled';
  vehicle_model: string;
  blockchain_tx: string | null;
  created_at: string;
  driver?: Profile;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'booked' | 'completed' | 'cancelled';
  blockchain_tx: string | null;
  created_at: string;
  ride?: Ride;
}

interface AppContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  walletAddress: string | null;
  rides: Ride[];
  bookings: Booking[];
  loading: boolean;
  setWalletAddress: (address: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchRides: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setRides([]);
        setBookings([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setWalletAddress(data.wallet_address);
      } else {
        const fallbackProfile = {
          id: userId,
          wallet_address: null,
          name: user?.user_metadata?.name ?? null,
          email: user?.email ?? null,
          rating: 0,
          total_rides: 0,
          created_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const fetchRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          driver:users(*)
        `)
        .order('ride_time', { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map((ride: any) => ({
        id: ride.id,
        driver_id: ride.driver_id,
        from_location: ride.source,
        to_location: ride.destination,
        departure_time: ride.ride_time,
        price: Number(ride.price ?? 0),
        available_seats: ride.seats_available,
        total_seats: ride.seats_available,
        status: ride.status,
        vehicle_model: ride.vehicle_model ?? 'N/A',
        blockchain_tx: ride.blockchain_tx ?? null,
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
      }));
      setRides(mapped);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;

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
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((booking: any) => ({
        id: booking.id,
        ride_id: booking.ride_id,
        passenger_id: booking.passenger_id,
        seats_booked: booking.seats_booked,
        total_price: Number(booking.total_price ?? booking.ride?.price ?? 0) * booking.seats_booked,
        status: booking.status,
        blockchain_tx: booking.tx_hash ?? null,
        created_at: booking.created_at,
        ride: booking.ride
          ? {
              id: booking.ride.id,
              driver_id: booking.ride.driver_id,
              from_location: booking.ride.source,
              to_location: booking.ride.destination,
              departure_time: booking.ride.ride_time,
              price: Number(booking.ride.price ?? 0),
              available_seats: booking.ride.seats_available,
              total_seats: booking.ride.seats_available,
              status: booking.ride.status,
              vehicle_model: booking.ride.vehicle_model ?? 'N/A',
              blockchain_tx: booking.ride.blockchain_tx ?? null,
              created_at: booking.ride.created_at,
              driver: booking.ride.driver
                ? {
                    id: booking.ride.driver.id,
                    wallet_address: booking.ride.driver.wallet_address ?? null,
                    name: booking.ride.driver.name ?? null,
                    email: booking.ride.driver.email ?? null,
                    rating: Number(booking.ride.driver.rating ?? 0),
                    total_rides: booking.ride.driver.total_rides ?? 0,
                    created_at: booking.ride.driver.created_at,
                  }
                : undefined,
            }
          : undefined,
      }));
      setBookings(mapped);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchRides(), fetchBookings()]);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        user,
        profile,
        walletAddress,
        rides,
        bookings,
        loading,
        setWalletAddress,
        setProfile,
        fetchRides,
        fetchBookings,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

