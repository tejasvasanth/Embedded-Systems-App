import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Car, Search, Map, X } from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { RideCard } from '@/src/components/RideCard';
import { MapPickerModal } from '@/src/components/MapPickerModal';
import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';
import { Ride } from '@/src/context/AppContext';

export const RideListScreen = () => {
  const { rides, fetchRides } = useApp();
  const router                = useRouter();
  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [searchText, setSearchText]   = useState('');
  const [mapFilter, setMapFilter]     = useState<'from' | 'to' | null>(null);
  const [fromFilter, setFromFilter]   = useState('');
  const [toFilter, setToFilter]       = useState('');

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

  const clearFilters = () => {
    setFromFilter('');
    setToFilter('');
    setSearchText('');
  };

  const hasFilters = fromFilter || toFilter || searchText;

  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      if (r.status !== 'available') return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!r.from_location.toLowerCase().includes(q) &&
            !r.to_location.toLowerCase().includes(q)) return false;
      }
      if (fromFilter && !r.from_location.toLowerCase().includes(fromFilter.toLowerCase())) return false;
      if (toFilter   && !r.to_location.toLowerCase().includes(toFilter.toLowerCase()))   return false;
      return true;
    });
  }, [rides, searchText, fromFilter, toFilter]);

  const handleRidePress = (ride: Ride) => {
    router.push({ pathname: '/ride-details', params: { rideId: ride.id } });
  };

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

      {/* Search & filter bar */}
      <View style={styles.filterBar}>
        {/* Text search */}
        <View style={styles.searchRow}>
          <View style={styles.searchInput}>
            <Search size={14} color={colors.textMuted} />
            <TextInput
              style={styles.searchText}
              placeholder="Search any location…"
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Map filter row */}
        <View style={styles.mapFilterRow}>
          <TouchableOpacity
            style={[styles.mapFilterBtn, fromFilter && styles.mapFilterBtnActive]}
            onPress={() => setMapFilter('from')}
          >
            <Map size={13} color={fromFilter ? colors.primary : colors.textMuted} />
            <Text style={[styles.mapFilterText, fromFilter && { color: colors.primary }]} numberOfLines={1}>
              {fromFilter || 'From (map)'}
            </Text>
            {fromFilter && (
              <TouchableOpacity onPress={() => setFromFilter('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={11} color={colors.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.mapFilterArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          <TouchableOpacity
            style={[styles.mapFilterBtn, toFilter && styles.mapFilterBtnActive]}
            onPress={() => setMapFilter('to')}
          >
            <Map size={13} color={toFilter ? colors.success : colors.textMuted} />
            <Text style={[styles.mapFilterText, toFilter && { color: colors.success }]} numberOfLines={1}>
              {toFilter || 'To (map)'}
            </Text>
            {toFilter && (
              <TouchableOpacity onPress={() => setToFilter('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={11} color={colors.success} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearAll}>
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Summary */}
      <LinearGradient
        colors={['#111827', colors.background]}
        style={styles.summaryBar}
      >
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{filteredRides.length}</Text>
          {' '}ride{filteredRides.length !== 1 ? 's' : ''} found
          {hasFilters && ' (filtered)'}
        </Text>
      </LinearGradient>

      <FlatList
        data={filteredRides}
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
            <Text style={styles.emptyTitle}>
              {hasFilters ? 'No rides match your filter' : 'No rides available'}
            </Text>
            <Text style={styles.emptyText}>
              {hasFilters ? 'Try adjusting or clearing your filters' : 'Pull to refresh or create a new ride'}
            </Text>
            {hasFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Map picker modals for filtering */}
      <MapPickerModal
        visible={mapFilter === 'from'}
        title="Filter by Pickup Area"
        onSelect={loc => {
          // Use first part of label (city/area) as filter
          setFromFilter(loc.label.split(',')[0].trim());
        }}
        onClose={() => setMapFilter(null)}
      />
      <MapPickerModal
        visible={mapFilter === 'to'}
        title="Filter by Destination Area"
        onSelect={loc => {
          setToFilter(loc.label.split(',')[0].trim());
        }}
        onClose={() => setMapFilter(null)}
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
  filterBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  mapFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapFilterBtnActive: {
    borderColor: colors.primary + '50',
    backgroundColor: colors.primary + '10',
  },
  mapFilterText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    fontWeight: '500',
  },
  mapFilterArrow: {
    paddingHorizontal: 2,
  },
  arrowText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  clearAll: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearAllText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
  },
  summaryBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
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
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  clearFiltersBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.errorDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  clearFiltersBtnText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
});
