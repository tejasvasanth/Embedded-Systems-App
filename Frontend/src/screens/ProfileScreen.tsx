import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Mail, Star, Car, Wallet, Edit2, ReceiptText, History, Calendar, Zap, LogOut,
} from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { InputField } from '@/src/components/InputField';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useApp } from '@/src/context/AppContext';
import { supabase } from '@/src/services/supabase';
import { apiService } from '@/src/services/api';
import { web3Service } from '@/src/services/web3';
import { useRouter } from 'expo-router';

export const ProfileScreen = () => {
  const {
    user, profile, walletAddress,
    setProfile, setWalletAddress,
    bookings, rides, fetchBookings, fetchRides,
  } = useApp();
  const router   = useRouter();
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [formData, setFormData] = useState({
    name:  profile?.name  || '',
    email: profile?.email || user?.email || '',
  });

  useEffect(() => {
    if (!user) return;
    fetchRides();
    fetchBookings();
  }, [user?.id]);

  const receiptHistory = useMemo(() =>
    [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6),
    [bookings]
  );

  const rideHistory = useMemo(() => {
    const now = Date.now();
    return rides
      .filter(r => r.driver_id === user?.id &&
        (new Date(r.departure_time).getTime() < now || ['completed', 'cancelled'].includes(r.status)))
      .sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime())
      .slice(0, 6);
  }, [rides, user?.id]);

  const fmtDate = (v: string) =>
    new Date(v).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await web3Service.disconnectWallet();
          setWalletAddress(null);
        },
      },
    ]);

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      const conn = await web3Service.connectWallet();
      if (conn && user) {
        setWalletAddress(conn.address);
        await apiService.updateProfile(user.id, { wallet_address: conn.address });
        Alert.alert('Connected', 'Wallet linked successfully!');
      } else {
        Alert.alert('Not Detected', 'No Web3 wallet found.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await apiService.updateProfile(user.id, formData);
      if (updated) { setProfile(updated); setEditing(false); }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
    : null;

  return (
    <View style={styles.container}>
      <Header
        title="Profile"
        showBack
        rightComponent={
          <TouchableOpacity onPress={() => setEditing(e => !e)} style={styles.editBtn}>
            <Edit2 size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={['#0D1117', colors.background]}
          style={styles.hero}
        >
          <View style={styles.heroBlobLeft} />
          <View style={styles.heroBlobRight} />
          <LinearGradient colors={colors.gradientAccent} style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {(profile?.name || user?.email || 'U')[0].toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.heroName}>{profile?.name || 'Anonymous'}</Text>
          <Text style={styles.heroEmail}>{user?.email || ''}</Text>
          <View style={styles.ratingRow}>
            <Star size={16} color={colors.warning} fill={colors.warning} />
            <Text style={styles.ratingText}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
            <View style={styles.ratingDot} />
            <Car size={14} color={colors.textMuted} />
            <Text style={styles.ratingText}>{profile?.total_rides || 0} rides</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Edit form */}
          {editing && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <InputField label="Full Name" value={formData.name}
                onChangeText={v => setFormData(p => ({ ...p, name: v }))}
                placeholder="Your name" />
              <InputField label="Email" value={formData.email}
                onChangeText={v => setFormData(p => ({ ...p, email: v }))}
                placeholder="you@example.com" keyboardType="email-address" />
              <PrimaryButton title="Save Changes" onPress={handleSave} loading={loading} />
              <PrimaryButton title="Cancel" onPress={() => setEditing(false)}
                variant="ghost" style={styles.cancelBtn} />
            </View>
          )}

          {/* Account Info */}
          {!editing && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Account</Text>
              <InfoRow icon={<Mail size={16} color={colors.textMuted} />}
                label="Email" value={user?.email || 'N/A'} />
              <View style={styles.divider} />
              <InfoRow icon={<User size={16} color={colors.textMuted} />}
                label="Name" value={profile?.name || 'Not set'} />
            </View>
          )}

          {/* Wallet */}
          <View style={[styles.card, styles.chainCard]}>
            <View style={styles.walletHeader}>
              <Zap size={18} color={colors.chain} />
              <Text style={styles.walletTitle}>Web3 Wallet</Text>
            </View>
            {shortAddr ? (
              <View style={styles.walletConnected}>
                <View style={styles.walletDot} />
                <Text style={styles.walletAddr}>{shortAddr}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.walletNotConnected}>Not connected</Text>
                <PrimaryButton
                  title="Connect Wallet"
                  onPress={handleConnectWallet}
                  loading={loading}
                  variant="chain"
                  icon={<Wallet size={16} color={colors.textInverse} />}
                  style={styles.walletBtn}
                />
              </>
            )}
          </View>

          {/* History */}
          <View style={styles.section}>
            <View style={styles.historyTitleRow}>
              <History size={16} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>History</Text>
            </View>
            <View style={styles.historyColumns}>
              {/* Receipts */}
              <View style={[styles.historyCol, styles.card]}>
                <View style={styles.historyHeader}>
                  <ReceiptText size={14} color={colors.primary} />
                  <Text style={styles.historyHeaderText}>Receipts</Text>
                </View>
                {receiptHistory.length === 0
                  ? <Text style={styles.emptyHistoryText}>No receipts</Text>
                  : receiptHistory.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.historyItem}
                        onPress={() => router.push({ pathname: '/e-receipt', params: { bookingId: item.id } })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.historyMain} numberOfLines={1}>
                          {item.ride?.from_location?.split(' ')[0]} → {item.ride?.to_location?.split(' ')[0]}
                        </Text>
                        <Text style={styles.historySub}>${item.total_price.toFixed(2)}</Text>
                        <Text style={styles.historyDate}>{fmtDate(item.created_at)}</Text>
                      </TouchableOpacity>
                    ))}
              </View>

              {/* Old rides */}
              <View style={[styles.historyCol, styles.card]}>
                <View style={styles.historyHeader}>
                  <Calendar size={14} color={colors.accent} />
                  <Text style={styles.historyHeaderText}>Past Rides</Text>
                </View>
                {rideHistory.length === 0
                  ? <Text style={styles.emptyHistoryText}>No past rides</Text>
                  : rideHistory.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.historyItem}
                        onPress={() => router.push({ pathname: '/ride-details', params: { rideId: item.id } })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.historyMain} numberOfLines={1}>
                          {item.from_location?.split(' ')[0]} → {item.to_location?.split(' ')[0]}
                        </Text>
                        <Text style={styles.historySub}>${item.price.toFixed(2)}</Text>
                        <Text style={[
                          styles.historyDate,
                          { color: item.status === 'completed' ? colors.success : colors.error },
                        ]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
              </View>
            </View>
          </View>

          {/* Logout */}
          <PrimaryButton
            title="Sign Out"
            onPress={handleLogout}
            variant="outline"
            icon={<LogOut size={16} color={colors.primary} />}
            style={styles.logoutBtn}
          />

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={infoStyles.row}>
    {icon}
    <View style={infoStyles.info}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  </View>
);

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  info: { flex: 1 },
  label: { ...typography.small, color: colors.textMuted },
  value: { ...typography.body, color: colors.text, fontWeight: '500', marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBlobLeft: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.accent, opacity: 0.05, top: -60, left: -40,
  },
  heroBlobRight: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.primary, opacity: 0.06, top: -20, right: -40,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: colors.white },
  heroName: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  heroEmail: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  ratingText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  ratingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  body: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  chainCard: { borderColor: colors.borderChain },
  sectionTitle: { ...typography.body, color: colors.text, fontWeight: '700', marginBottom: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  cancelBtn: { marginTop: spacing.sm },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  walletTitle: { ...typography.body, color: colors.chain, fontWeight: '700' },
  walletConnected: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.chainDim, padding: 10, borderRadius: 10,
  },
  walletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.chain },
  walletAddr: { ...typography.body, color: colors.chain, fontWeight: '600', fontFamily: 'monospace' },
  walletNotConnected: { ...typography.caption, color: colors.textMuted, marginBottom: 12 },
  walletBtn: {},
  section: { marginBottom: spacing.md },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  historyColumns: { flexDirection: 'row', gap: 10 },
  historyCol: { flex: 1 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  historyHeaderText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  historyItem: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  historyMain: { ...typography.caption, color: colors.text, fontWeight: '600' },
  historySub: { ...typography.small, color: colors.textMuted, marginTop: 3 },
  historyDate: { ...typography.small, color: colors.primary, marginTop: 3, fontWeight: '600' },
  emptyHistoryText: { ...typography.small, color: colors.textMuted, paddingVertical: 8 },
  logoutBtn: { marginTop: spacing.sm },
});
