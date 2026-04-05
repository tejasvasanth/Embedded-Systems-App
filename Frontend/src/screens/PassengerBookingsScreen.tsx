import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookMarked, MapPin, Clock, DollarSign, Zap, ReceiptText, ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { useApp, Booking } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  booked:    { bg: colors.primary  + '18', text: colors.primary,  label: 'Booked'    },
  confirmed: { bg: colors.success  + '18', text: colors.success,  label: 'Confirmed' },
  completed: { bg: colors.textMuted + '18', text: colors.textMuted, label: 'Completed' },
  cancelled: { bg: colors.error    + '18', text: colors.error,    label: 'Cancelled' },
  pending:   { bg: colors.warning  + '18', text: colors.warning,  label: 'Pending'   },
};

const BookingCard = ({ booking, onPress }: { booking: Booking; onPress: () => void }) => {
  const s   = STATUS_STYLE[booking.status] ?? STATUS_STYLE.pending;
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* top accent */}
      <LinearGradient
        colors={colors.gradientAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />

      <View style={styles.cardTop}>
        <View style={[styles.statusPill, { backgroundColor: s.bg, borderColor: s.text + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: s.text }]} />
          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
        </View>
        <Text style={styles.price}>${booking.total_price.toFixed(2)}</Text>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routeDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.dotLine} />
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.routeLabels}>
          <Text style={styles.routeFrom} numberOfLines={1}>{booking.ride?.from_location ?? 'N/A'}</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.routeTo}   numberOfLines={1}>{booking.ride?.to_location   ?? 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{fmt(booking.ride?.departure_time)}</Text>
        </View>
        <View style={styles.metaItem}>
          <DollarSign size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''}</Text>
        </View>
        {booking.blockchain_tx && (
          <View style={styles.chainBadge}>
            <Zap size={10} color={colors.chain} />
            <Text style={styles.chainText}>On-chain</Text>
          </View>
        )}
      </View>

      <View style={styles.receiptRow}>
        <ReceiptText size={13} color={colors.accent} />
        <Text style={styles.receiptText}>View receipt</Text>
        <ChevronRight size={13} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
};

export const PassengerBookingsScreen = () => {
  const { bookings, fetchBookings, loading } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => { fetchBookings(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const active   = bookings.filter(b => ['booked', 'confirmed', 'pending'].includes(b.status));
  const past     = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
  const allSorted = [
    ...active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    ...past.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <LinearGradient colors={['#0D1117', colors.background]} style={styles.header}>
        <View style={styles.headerBlob} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Bookings</Text>
            <Text style={styles.headerSub}>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{active.length}</Text>
              {' '}active · '}
              <Text style={{ color: colors.textMuted }}>{past.length} past</Text>
            </Text>
          </View>
          <LinearGradient colors={colors.gradientAccent} style={styles.headerIcon}>
            <BookMarked size={22} color={colors.white} />
          </LinearGradient>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading bookings…</Text>
        </View>
      ) : (
        <FlatList
          data={allSorted}
          keyExtractor={b => b.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push({ pathname: '/e-receipt', params: { bookingId: item.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient
                colors={[colors.accent + '15', 'transparent']}
                style={styles.emptyIconWrap}
              >
                <BookMarked size={40} color={colors.accent} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>Browse rides and book your first trip!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    opacity: 0.06,
    top: -60,
    right: -40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardAccent: {
    height: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.small,
    fontWeight: '700',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  route: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    gap: 10,
  },
  routeDots: {
    alignItems: 'center',
    width: 12,
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginVertical: 3,
  },
  routeLabels: {
    flex: 1,
  },
  routeFrom: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  routeTo: {
    ...typography.body,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  chainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.chainDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainText: {
    ...typography.small,
    color: colors.chain,
    fontWeight: '600',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  receiptText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
