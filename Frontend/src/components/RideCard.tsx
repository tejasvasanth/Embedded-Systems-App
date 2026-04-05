import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, Users, Star, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '@/src/theme';
import { Ride } from '@/src/context/AppContext';

interface RideCardProps {
  ride: Ride;
  onPress: () => void;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  available:   { color: colors.success,  label: 'Available' },
  in_progress: { color: colors.warning,  label: 'In Progress' },
  booked:      { color: colors.chain,    label: 'Booked' },
  completed:   { color: colors.textMuted, label: 'Completed' },
  cancelled:   { color: colors.error,    label: 'Cancelled' },
};

export const RideCard: React.FC<RideCardProps> = ({ ride, onPress }) => {
  const meta = STATUS_META[ride.status] ?? STATUS_META.available;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row: status + price */}
      <View style={styles.topRow}>
        <View style={[styles.statusPill, { backgroundColor: meta.color + '18', borderColor: meta.color + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={styles.priceValue}>${ride.price}</Text>
          <Text style={styles.priceUnit}>/seat</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routeLeft}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.routeText}>
          <Text style={styles.locationFrom} numberOfLines={1}>{ride.from_location}</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.locationTo} numberOfLines={1}>{ride.to_location}</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDate(ride.departure_time)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{ride.available_seats} seats</Text>
        </View>
        {ride.blockchain_tx && (
          <View style={styles.chainBadge}>
            <Zap size={11} color={colors.chain} />
            <Text style={styles.chainText}>On-chain</Text>
          </View>
        )}
      </View>

      {/* Driver */}
      {ride.driver && (
        <View style={styles.driverRow}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitial}>
              {(ride.driver.name || 'A')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.driverName}>{ride.driver.name || 'Anonymous'}</Text>
          <View style={styles.ratingRow}>
            <Star size={12} color={colors.warning} fill={colors.warning} />
            <Text style={styles.ratingText}>{ride.driver.rating.toFixed(1)}</Text>
          </View>
        </View>
      )}

      {/* Gradient border accent at top */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusLabel: {
    ...typography.small,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  priceUnit: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: 2,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  routeLeft: {
    width: 18,
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 4,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginVertical: 3,
  },
  routeText: {
    flex: 1,
  },
  locationFrom: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  locationTo: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: 12,
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
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  driverAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  driverInitial: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  driverName: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
});
