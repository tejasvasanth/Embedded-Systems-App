import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteMapView } from '@/src/components/RouteMapView';
import {
  MapPin, Calendar, Users, Car, User, Star, Zap, Shield, X, CheckCircle,
} from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { InputField } from '@/src/components/InputField';
import { useApp } from '@/src/context/AppContext';
import { apiService } from '@/src/services/api';
import { web3Service } from '@/src/services/web3';
import { Ride } from '@/src/context/AppContext';
import { useLocalSearchParams, useRouter } from 'expo-router';

export const RideDetailsScreen: React.FC = () => {
  const { rideId }            = useLocalSearchParams<{ rideId: string }>();
  const { user, refreshData } = useApp();
  const router                = useRouter();
  const [ride, setRide]       = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState('1');
  const [contractModal, setContractModal] = useState<{
    txHash: string; bookingId: string; totalPrice: number; seats: number;
  } | null>(null);

  const canBook =
    !!ride &&
    ride.available_seats > 0 &&
    ride.status === 'available' &&
    ride.driver_id !== user?.id;

  useEffect(() => { if (rideId) loadRide(); }, [rideId]);

  const loadRide = async () => {
    try {
      const data = await apiService.getRideById(rideId);
      setRide(data);
    } catch {
      Alert.alert('Error', 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async () => {
    if (!user || !ride) return;
    const seats = parseInt(seatsToBook);
    if (isNaN(seats) || seats < 1 || seats > ride.available_seats) {
      Alert.alert('Invalid', `Enter 1–${ride.available_seats} seats`);
      return;
    }
    setBooking(true);
    try {
      const totalPrice = ride.price * seats;
      let blockchainTx: string | null = null;
      if (web3Service.isConnected()) {
        blockchainTx = await web3Service.bookRideOnChain(ride.id, seats, totalPrice);
      } else {
        blockchainTx = await web3Service.mockBookTransaction(ride.id, seats, totalPrice);
      }
      const created = await apiService.bookRide({
        ride_id: ride.id,
        passenger_id: user.id,
        seats_booked: seats,
        total_price: totalPrice,
        blockchain_tx: blockchainTx || undefined,
      });
      await refreshData();
      if (created?.id) {
        // Show contract event modal before navigating to receipt
        setContractModal({
          txHash: blockchainTx || '',
          bookingId: created.id,
          totalPrice,
          seats,
        });
      } else {
        Alert.alert('Success', 'Ride booked!');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to book ride');
    } finally {
      setBooking(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Ride Details" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.container}>
        <Header title="Ride Details" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Ride not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Ride Details" showBack />

      {/* Passenger contract event modal */}
      <Modal
        visible={!!contractModal}
        transparent
        animationType="slide"
        onRequestClose={() => setContractModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Success header */}
            <LinearGradient
              colors={['rgba(16,185,129,0.15)', 'rgba(99,102,241,0.08)']}
              style={styles.modalHeader}
            >
              <View style={styles.modalSuccessIcon}>
                <CheckCircle size={32} color={colors.success} />
              </View>
              <Text style={styles.modalTitle}>Booking Confirmed</Text>
              <Text style={styles.modalSub}>Smart contract event emitted</Text>
            </LinearGradient>

            {contractModal && (
              <View style={styles.modalBody}>
                {/* Contract details */}
                <View style={styles.contractBox}>
                  <View style={styles.contractRow}>
                    <Text style={styles.contractLabel}>Event</Text>
                    <Text style={[styles.contractValue, { color: colors.chain }]}>BookingCreated</Text>
                  </View>
                  <View style={styles.contractRow}>
                    <Text style={styles.contractLabel}>Contract</Text>
                    <Text style={styles.contractValue}>RideSharing.sol</Text>
                  </View>
                  <View style={styles.contractRow}>
                    <Text style={styles.contractLabel}>Seats</Text>
                    <Text style={styles.contractValue}>{contractModal.seats}</Text>
                  </View>
                  <View style={styles.contractRow}>
                    <Text style={styles.contractLabel}>Escrow amount</Text>
                    <Text style={[styles.contractValue, { color: colors.success }]}>
                      ${contractModal.totalPrice.toFixed(2)} locked
                    </Text>
                  </View>
                </View>

                {contractModal.txHash ? (
                  <View style={styles.txBox}>
                    <Zap size={12} color={colors.chain} />
                    <Text style={styles.txText} selectable numberOfLines={3}>
                      {contractModal.txHash}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.modalNote}>
                  Your payment is held in escrow. Funds are released to the driver after ride completion. You will receive a refund if cancelled.
                </Text>

                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => {
                    const id = contractModal.bookingId;
                    setContractModal(null);
                    router.push({ pathname: '/e-receipt', params: { bookingId: id } });
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={colors.gradientPrimary} style={styles.receiptBtnGrad}>
                    <Text style={styles.receiptBtnText}>View E-Receipt</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { setContractModal(null); router.back(); }}
                  style={styles.dismissBtn}
                >
                  <Text style={styles.dismissText}>Back to rides</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero price card */}
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Price per seat</Text>
              <Text style={styles.heroPrice}>${ride.price}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>{ride.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.heroRoute}>
            <View style={styles.heroRouteItem}>
              <MapPin size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroRouteText} numberOfLines={1}>{ride.from_location}</Text>
            </View>
            <Text style={styles.heroArrow}>→</Text>
            <View style={styles.heroRouteItem}>
              <MapPin size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroRouteText} numberOfLines={1}>{ride.to_location}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Route Map */}
        <View style={styles.mapSection}>
          <Text style={styles.mapSectionTitle}>Route Map</Text>
          <RouteMapView
            from={ride.from_location}
            to={ride.to_location}
            height={230}
          />
        </View>

        <View style={styles.body}>
          {/* Details */}
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.detailCard}>
            <DetailRow icon={<Calendar size={18} color={colors.textMuted} />}
              label="Departure" value={formatDate(ride.departure_time)} />
            <View style={styles.rowDivider} />
            <DetailRow icon={<Users size={18} color={colors.textMuted} />}
              label="Seats Available" value={`${ride.available_seats} seats`} />
            <View style={styles.rowDivider} />
            <DetailRow icon={<Car size={18} color={colors.textMuted} />}
              label="Vehicle" value={ride.vehicle_model} />
          </View>

          {/* Blockchain */}
          {ride.blockchain_tx && (
            <>
              <Text style={styles.sectionTitle}>Blockchain</Text>
              <View style={[styles.detailCard, styles.chainCard]}>
                <View style={styles.chainRow}>
                  <Zap size={18} color={colors.chain} />
                  <View style={styles.chainInfo}>
                    <Text style={styles.chainLabel}>On-chain Transaction</Text>
                    <Text style={styles.chainTx} numberOfLines={2}>{ride.blockchain_tx}</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Driver */}
          {ride.driver && (
            <>
              <Text style={styles.sectionTitle}>Driver</Text>
              <View style={styles.detailCard}>
                <View style={styles.driverRow}>
                  <LinearGradient colors={colors.gradientAccent} style={styles.driverAvatar}>
                    <Text style={styles.driverInitial}>
                      {(ride.driver.name || 'A')[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{ride.driver.name || 'Anonymous'}</Text>
                    <View style={styles.ratingRow}>
                      <Star size={14} color={colors.warning} fill={colors.warning} />
                      <Text style={styles.ratingText}>
                        {ride.driver.rating.toFixed(1)} · {ride.driver.total_rides} trips
                      </Text>
                    </View>
                    {ride.driver.wallet_address && (
                      <Text style={styles.walletAddr} numberOfLines={1}>
                        {ride.driver.wallet_address.slice(0, 16)}…
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Book */}
          <Text style={styles.sectionTitle}>Book This Ride</Text>
          <View style={styles.bookCard}>
            <View style={styles.escrowBanner}>
              <Shield size={14} color={colors.chain} />
              <Text style={styles.escrowText}>Payment secured via smart contract escrow</Text>
            </View>
            <InputField
              label="Number of seats"
              value={seatsToBook}
              onChangeText={setSeatsToBook}
              placeholder="1"
              keyboardType="numeric"
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${(ride.price * (parseInt(seatsToBook) || 0)).toFixed(2)}
              </Text>
            </View>
            {!canBook && ride.available_seats === 0 && (
              <Text style={styles.noticeText}>No seats available</Text>
            )}
            {!canBook && ride.driver_id === user?.id && (
              <Text style={styles.noticeText}>You are the driver of this ride</Text>
            )}
            <PrimaryButton
              title={canBook ? 'Book Ride' : 'Booking Unavailable'}
              onPress={handleBookRide}
              loading={booking}
              disabled={!canBook}
              icon={<Zap size={16} color={colors.textInverse} />}
              variant="chain"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const DetailRow = ({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={detailRowStyles.row}>
    {icon}
    <View style={detailRowStyles.info}>
      <Text style={detailRowStyles.label}>{label}</Text>
      <Text style={detailRowStyles.value}>{value}</Text>
    </View>
  </View>
);

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  info: {
    marginLeft: 12,
    flex: 1,
  },
  label: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 20,
    padding: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroLabel: {
    ...typography.small,
    color: 'rgba(255,255,255,0.7)',
  },
  heroPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '700',
  },
  heroRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  heroRouteText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  heroArrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  mapSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  mapSectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  body: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  chainCard: {
    borderColor: colors.borderChain,
    backgroundColor: colors.chainDim,
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    gap: 12,
  },
  chainInfo: {
    flex: 1,
  },
  chainLabel: {
    ...typography.caption,
    color: colors.chain,
    fontWeight: '600',
  },
  chainTx: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  driverInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  walletAddr: {
    ...typography.small,
    color: colors.chain,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  bookCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chainDim,
    padding: 10,
    borderRadius: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  escrowText: {
    ...typography.small,
    color: colors.chain,
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  noticeText: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  // Contract event modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  modalSuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  modalSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalBody: {
    padding: spacing.lg,
    gap: 12,
  },
  contractBox: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  contractValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  txBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.chainDim,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  txText: {
    ...typography.small,
    color: colors.chain,
    fontFamily: 'monospace',
    flex: 1,
  },
  modalNote: {
    ...typography.small,
    color: colors.textMuted,
    lineHeight: 18,
  },
  receiptBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  receiptBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  receiptBtnText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  dismissText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
