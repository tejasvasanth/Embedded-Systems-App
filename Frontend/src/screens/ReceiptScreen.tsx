import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Zap, Copy } from 'lucide-react-native';
import { colors, spacing, typography } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { apiService } from '@/src/services/api';
import { Booking } from '@/src/context/AppContext';

export const ReceiptScreen: React.FC = () => {
  const { bookingId }             = useLocalSearchParams<{ bookingId: string }>();
  const router                    = useRouter();
  const [booking, setBooking]     = useState<Booking | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) { setLoading(false); return; }
      try {
        const data = await apiService.getBookingById(bookingId);
        setBooking(data);
      } catch {
        Alert.alert('Error', 'Unable to load receipt.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const receiptId = useMemo(() => {
    if (!booking?.id) return 'N/A';
    return `RCPT-${booking.id.slice(0, 8).toUpperCase()}`;
  }, [booking?.id]);

  const fmt = (v?: string) => {
    if (!v) return 'N/A';
    return new Date(v).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="E-Receipt" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title="E-Receipt" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Receipt not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="E-Receipt" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        <LinearGradient
          colors={[colors.success + '18', 'transparent']}
          style={styles.successBanner}
        >
          <CheckCircle2 size={22} color={colors.success} />
          <View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>Your ride is secured on-chain</Text>
          </View>
        </LinearGradient>

        {/* Receipt card */}
        <View style={styles.card}>
          {/* Card top accent */}
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardAccent}
          />

          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Digital Receipt</Text>
            <Text style={styles.receiptId}>{receiptId}</Text>
          </View>

          <View style={styles.divider} />

          <ReceiptRow label="Booking ID"  value={booking.id.slice(0, 20) + '…'} mono />
          <ReceiptRow label="Issued On"   value={fmt(booking.created_at)} />
          <ReceiptRow label="Status"      value={booking.status.toUpperCase()} highlight />

          <View style={styles.divider} />

          <ReceiptRow
            label="Route"
            value={`${booking.ride?.from_location ?? 'N/A'} → ${booking.ride?.to_location ?? 'N/A'}`}
          />
          <ReceiptRow label="Departure"  value={fmt(booking.ride?.departure_time)} />
          <ReceiptRow label="Seats"      value={`${booking.seats_booked}`} />
          <ReceiptRow label="Price/Seat" value={`$${booking.ride?.price ?? 0}`} />

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>${booking.total_price.toFixed(2)}</Text>
          </View>

          {/* Blockchain */}
          {booking.blockchain_tx && (
            <View style={styles.chainBox}>
              <View style={styles.chainHeader}>
                <Zap size={14} color={colors.chain} />
                <Text style={styles.chainTitle}>Blockchain Transaction</Text>
              </View>
              <Text style={styles.chainTx} selectable>{booking.blockchain_tx}</Text>
            </View>
          )}
        </View>

        <PrimaryButton
          title="Back to Home"
          onPress={() => router.replace('/(tabs)')}
          style={styles.homeBtn}
        />

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const ReceiptRow = ({
  label, value, mono = false, highlight = false,
}: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[
      rowStyles.value,
      mono      && rowStyles.mono,
      highlight && rowStyles.highlight,
    ]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 16,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  value: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'right',
    flex: 1.5,
    fontWeight: '500',
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  highlight: {
    color: colors.success,
    fontWeight: '700',
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
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.success + '30',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  successSub: {
    ...typography.small,
    color: colors.success,
    opacity: 0.75,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardAccent: {
    height: 3,
  },
  cardHeader: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  receiptId: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginVertical: 4,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  chainBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    marginTop: 8,
    backgroundColor: colors.chainDim,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  chainTitle: {
    ...typography.caption,
    color: colors.chain,
    fontWeight: '600',
  },
  chainTx: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  homeBtn: {
    marginTop: spacing.sm,
  },
});
