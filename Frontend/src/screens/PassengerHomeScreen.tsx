import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, X, MapPin, Zap, Car, SlidersHorizontal, ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { RideCard } from '@/src/components/RideCard';
import { MapPickerModal } from '@/src/components/MapPickerModal';
import { useApp } from '@/src/context/AppContext';
import { useRouter } from 'expo-router';
import { Ride } from '@/src/context/AppContext';

type FilterMode = 'all' | 'cheapest' | 'soonest' | 'most_seats';

const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'cheapest',   label: 'Cheapest' },
  { key: 'soonest',    label: 'Soonest' },
  { key: 'most_seats', label: 'Most Seats' },
];

export const PassengerHomeScreen = () => {
  const { user, profile, rides, fetchRides } = useApp();
  const router = useRouter();

  const [refreshing, setRefreshing]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [fromFilter, setFromFilter]   = useState('');
  const [toFilter, setToFilter]       = useState('');
  const [sortMode, setSortMode]       = useState<FilterMode>('all');
  const [mapTarget, setMapTarget]     = useState<'from' | 'to' | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRides();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

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
    setSearch('');
    setFromFilter('');
    setToFilter('');
    setSortMode('all');
  };

  const hasFilters = search || fromFilter || toFilter || sortMode !== 'all';

  const filteredRides = useMemo(() => {
    let list = rides.filter(r => r.status === 'available');

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.from_location.toLowerCase().includes(q) ||
        r.to_location.toLowerCase().includes(q) ||
        (r.driver?.name || '').toLowerCase().includes(q),
      );
    }
    if (fromFilter) {
      list = list.filter(r => r.from_location.toLowerCase().includes(fromFilter.toLowerCase()));
    }
    if (toFilter) {
      list = list.filter(r => r.to_location.toLowerCase().includes(toFilter.toLowerCase()));
    }

    switch (sortMode) {
      case 'cheapest':   return [...list].sort((a, b) => a.price - b.price);
      case 'soonest':    return [...list].sort((a, b) =>
        new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
      case 'most_seats': return [...list].sort((a, b) => b.available_seats - a.available_seats);
      default:           return list;
    }
  }, [rides, search, fromFilter, toFilter, sortMode]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const renderHeader = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Hero */}
      <LinearGradient colors={['#0D1117', colors.background]} style={styles.hero}>
        <View style={styles.heroBlob} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{greeting},</Text>
            <Text style={styles.heroName}>{profile?.name || user?.email?.split('@')[0] || 'Traveller'}</Text>
          </View>
          <LinearGradient colors={colors.gradientAccent} style={styles.heroAvatar}>
            <Text style={styles.heroInitial}>
              {(profile?.name || user?.email || 'T')[0].toUpperCase()}
            </Text>
          </LinearGradient>
        </View>

        {/* Search bar */}
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Search size={15} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Where are you going?"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search !== '' && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
              onPress={() => setShowFilters(v => !v)}
            >
              <SlidersHorizontal size={16} color={showFilters ? colors.accent : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Expandable location filters */}
          {showFilters && (
            <View style={styles.locationFilters}>
              <TouchableOpacity
                style={[styles.locFilterBtn, fromFilter && styles.locFilterBtnActive]}
                onPress={() => setMapTarget('from')}
              >
                <MapPin size={12} color={fromFilter ? colors.primary : colors.textMuted} />
                <Text style={[styles.locFilterText, fromFilter && { color: colors.primary }]} numberOfLines={1}>
                  {fromFilter || 'From…'}
                </Text>
                {fromFilter
                  ? <TouchableOpacity onPress={() => setFromFilter('')}><X size={11} color={colors.primary} /></TouchableOpacity>
                  : <ChevronRight size={12} color={colors.textMuted} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.locFilterBtn, toFilter && styles.locFilterBtnActive]}
                onPress={() => setMapTarget('to')}
              >
                <MapPin size={12} color={toFilter ? colors.success : colors.textMuted} />
                <Text style={[styles.locFilterText, toFilter && { color: colors.success }]} numberOfLines={1}>
                  {toFilter || 'To…'}
                </Text>
                {toFilter
                  ? <TouchableOpacity onPress={() => setToFilter('')}><X size={11} color={colors.success} /></TouchableOpacity>
                  : <ChevronRight size={12} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Sort chips */}
      <View style={styles.sortRow}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortChip, sortMode === opt.key && styles.sortChipActive]}
            onPress={() => setSortMode(opt.key)}
          >
            <Text style={[styles.sortChipText, sortMode === opt.key && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearChip}>
            <X size={11} color={colors.error} />
            <Text style={styles.clearChipText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{filteredRides.length}</Text>
          {' '}ride{filteredRides.length !== 1 ? 's' : ''} available
          {hasFilters ? ' · filtered' : ''}
        </Text>
        <View style={styles.chainBadge}>
          <Zap size={10} color={colors.chain} />
          <Text style={styles.chainBadgeText}>Blockchain secured</Text>
        </View>
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <LinearGradient colors={['#0D1117', colors.background]} style={styles.hero}>
          <View style={styles.heroBlob} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroGreeting}>{greeting},</Text>
              <Text style={styles.heroName}>{profile?.name || 'Traveller'}</Text>
            </View>
            <LinearGradient colors={colors.gradientAccent} style={styles.heroAvatar}>
              <Text style={styles.heroInitial}>
                {(profile?.name || user?.email || 'T')[0].toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Finding available rides…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <FlatList
        data={filteredRides}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RideCard
            ride={item}
            onPress={() => router.push({ pathname: '/ride-details', params: { rideId: item.id } })}
          />
        )}
        ListHeaderComponent={renderHeader}
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
              <Car size={40} color={colors.accent} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>
              {hasFilters ? 'No rides match' : 'No rides available'}
            </Text>
            <Text style={styles.emptyText}>
              {hasFilters
                ? 'Try clearing your filters or searching differently'
                : 'Check back soon — pull to refresh'}
            </Text>
            {hasFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Map pickers */}
      <MapPickerModal
        visible={mapTarget === 'from'}
        title="Filter by Pickup Area"
        onSelect={loc => setFromFilter(loc.label.split(',')[0].trim())}
        onClose={() => setMapTarget(null)}
      />
      <MapPickerModal
        visible={mapTarget === 'to'}
        title="Filter by Destination Area"
        onSelect={loc => setToFilter(loc.label.split(',')[0].trim())}
        onClose={() => setMapTarget(null)}
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

  // Hero
  hero: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBlob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.accent,
    opacity: 0.06,
    top: -80,
    right: -60,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroGreeting: {
    ...typography.caption,
    color: colors.textMuted,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  heroAvatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },

  // Search
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  filterToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleActive: {
    borderColor: colors.accent + '60',
    backgroundColor: colors.accent + '12',
  },
  locationFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  locFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locFilterBtnActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '40',
  },
  locFilterText: {
    ...typography.small,
    color: colors.textMuted,
    flex: 1,
    fontWeight: '500',
  },

  // Sort chips
  sortRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.accent + '18',
    borderColor: colors.accent + '50',
  },
  sortChipText: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: colors.accent,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.errorDim,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  clearChipText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryCount: {
    color: colors.accent,
    fontWeight: '700',
  },
  chainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.chainDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainBadgeText: {
    ...typography.small,
    color: colors.chain,
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },

  // Empty
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
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.errorDim,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  clearBtnText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
});
