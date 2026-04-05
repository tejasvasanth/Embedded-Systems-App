import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Car, List, PlusCircle, User, Zap, TrendingUp, Clock,
} from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';

export const HomeScreen = () => {
  const { profile, rides, bookings, fetchRides, fetchBookings, walletAddress } = useApp();
  const router = useRouter();

  useEffect(() => {
    Promise.all([fetchRides(), fetchBookings()]);
  }, []);

  const availableRides = rides.filter(r => r.status === 'available');
  const myBookings     = bookings.filter(b => ['confirmed', 'pending', 'booked'].includes(b.status));

  const quickActions = [
    { title: 'Browse', icon: List,       color: colors.primary,  bg: colors.primary  + '18', route: '/(tabs)/rides'   },
    { title: 'Create', icon: PlusCircle, color: colors.success,  bg: colors.success  + '18', route: '/(tabs)/create'  },
    { title: 'Profile', icon: User,      color: colors.accent,   bg: colors.accent   + '18', route: '/(tabs)/profile' },
  ] as const;

  const stats = [
    { value: String(availableRides.length), label: 'Rides',    icon: Car,         color: colors.primary },
    { value: String(myBookings.length),      label: 'Bookings', icon: Clock,       color: colors.accent },
    { value: String(profile?.total_rides ?? 0), label: 'Trips', icon: TrendingUp,  color: colors.success },
  ];

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <LinearGradient
        colors={['#0D1117', colors.background]}
        style={styles.header}
      >
        <View style={styles.headerBlob} />
        <View>
          <Text style={styles.greeting}>Good {getGreeting()},</Text>
          <Text style={styles.name}>{profile?.name || 'Rider'}</Text>
          {shortAddress && (
            <View style={styles.walletPill}>
              <Zap size={11} color={colors.chain} />
              <Text style={styles.walletText}>{shortAddress}</Text>
            </View>
          )}
        </View>
        <LinearGradient colors={colors.gradientPrimary} style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {(profile?.name || 'R')[0].toUpperCase()}
          </Text>
        </LinearGradient>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                  <Icon size={18} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Blockchain status */}
        <View style={styles.chainCard}>
          <LinearGradient
            colors={['rgba(0,212,255,0.08)', 'rgba(99,102,241,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chainGradient}
          >
            <View style={styles.chainLeft}>
              <View style={styles.chainDot} />
              <View>
                <Text style={styles.chainTitle}>Smart Contract Active</Text>
                <Text style={styles.chainSub}>Ethereum Escrow · RideSharing.sol</Text>
              </View>
            </View>
            <Zap size={20} color={colors.chain} />
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.actionCard, { borderColor: action.color + '25' }]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIconBg, { backgroundColor: action.bg }]}>
                    <Icon size={22} color={action.color} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {myBookings.length > 0 ? (
            myBookings.slice(0, 3).map(booking => (
              <View key={booking.id} style={styles.activityCard}>
                <View style={styles.activityIconWrap}>
                  <Car size={18} color={colors.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityRoute} numberOfLines={1}>
                    {booking.ride?.from_location} → {booking.ride?.to_location}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''} · ${booking.total_price.toFixed(2)}
                  </Text>
                  {booking.blockchain_tx && (
                    <Text style={styles.activityTx} numberOfLines={1}>
                      Tx: {booking.blockchain_tx.slice(0, 18)}…
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: booking.status === 'confirmed' || booking.status === 'booked'
                      ? colors.successDim : colors.warningDim,
                  },
                ]}>
                  <Text style={[
                    styles.statusText,
                    {
                      color: booking.status === 'confirmed' || booking.status === 'booked'
                        ? colors.success : colors.warning,
                    },
                  ]}>
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Car size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No recent bookings</Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: 52,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.05,
    top: -80,
    right: -40,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
  },
  name: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.chainDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  walletText: {
    ...typography.small,
    color: colors.chain,
    fontWeight: '600',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  chainCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  chainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.chain,
  },
  chainTitle: {
    ...typography.caption,
    color: colors.chain,
    fontWeight: '600',
  },
  chainSub: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityRoute: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  activityMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },
  activityTx: {
    ...typography.small,
    color: colors.chain,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    ...typography.small,
    fontWeight: '700',
    fontSize: 10,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
