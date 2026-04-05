import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Car } from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { RideCard } from '@/src/components/RideCard';
import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';
import { Ride } from '@/src/context/AppContext';

export const RideListScreen = () => {
  const { rides, fetchRides } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);

  useEffect(() => { loadRides(); }, []);

  const loadRides = async () => {
    setLoading(true);
    await fetchRides();
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  };

  const handleRidePress = (ride: Ride) => {
    router.push({ pathname: '/ride-details', params: { rideId: ride.id } });
  };

  const availableRides = rides.filter(r => r.status === 'available');

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Available Rides" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding rides…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Available Rides" showBack />

      {/* Summary bar */}
      <LinearGradient
        colors={['#111827', colors.background]}
        style={styles.summaryBar}
      >
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{availableRides.length}</Text>
          {' '}rides available
        </Text>
      </LinearGradient>

      <FlatList
        data={availableRides}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RideCard ride={item} onPress={() => handleRidePress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[colors.primary + '18', 'transparent']}
              style={styles.emptyIconWrap}
            >
              <Car size={40} color={colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No rides available</Text>
            <Text style={styles.emptyText}>
              Pull to refresh or create a new ride
            </Text>
          </View>
        }
      />
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
  summaryBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryCount: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 12,
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
