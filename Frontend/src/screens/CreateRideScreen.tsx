import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, DollarSign, Users, Zap, Shield } from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { Header } from '@/src/components/Header';
import { InputField } from '@/src/components/InputField';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { useApp } from '@/src/context/AppContext';
import { apiService } from '@/src/services/api';
import { web3Service } from '@/src/services/web3';
import { useNavigation } from '@react-navigation/native';

type FormKey = 'from_location' | 'to_location' | 'departure_time' | 'price' | 'total_seats' | 'vehicle_model';

export const CreateRideScreen = () => {
  const { user, refreshData } = useApp();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<FormKey, string>>({
    from_location:  '',
    to_location:    '',
    departure_time: '',
    price:          '',
    total_seats:    '',
    vehicle_model:  '',
  });

  const set = (field: FormKey) => (value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!formData.from_location.trim())  { Alert.alert('Error', 'Enter pickup location'); return false; }
    if (!formData.to_location.trim())    { Alert.alert('Error', 'Enter destination');      return false; }
    if (!formData.departure_time.trim()) { Alert.alert('Error', 'Enter departure time');   return false; }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Error', 'Enter a valid price'); return false;
    }
    if (!formData.total_seats || parseInt(formData.total_seats) <= 0) {
      Alert.alert('Error', 'Enter valid seat count'); return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user) { Alert.alert('Error', 'Please log in first'); return; }
    if (!validate()) return;

    setLoading(true);
    try {
      let blockchainTx: string | null = null;
      if (web3Service.isConnected()) {
        blockchainTx = await web3Service.createRideOnChain({
          from:  formData.from_location,
          to:    formData.to_location,
          price: parseFloat(formData.price),
          seats: parseInt(formData.total_seats),
        });
      } else {
        blockchainTx = await web3Service.mockCreateRideTransaction({
          from:  formData.from_location,
          to:    formData.to_location,
          price: parseFloat(formData.price),
          seats: parseInt(formData.total_seats),
        });
      }

      const departureDate = new Date(formData.departure_time).toISOString();

      await apiService.createRide({
        driver_id:       user.id,
        from_location:   formData.from_location,
        to_location:     formData.to_location,
        departure_time:  departureDate,
        price:           parseFloat(formData.price),
        available_seats: parseInt(formData.total_seats),
        total_seats:     parseInt(formData.total_seats),
        vehicle_model:   formData.vehicle_model || 'N/A',
        blockchain_tx:   blockchainTx || undefined,
      });

      Alert.alert('Ride Created!', 'Your ride is now visible to passengers.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      await refreshData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Create Ride" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Blockchain notice */}
        <View style={styles.chainNotice}>
          <LinearGradient
            colors={['rgba(0,212,255,0.1)', 'rgba(99,102,241,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chainNoticeBg}
          >
            <Zap size={16} color={colors.chain} />
            <Text style={styles.chainNoticeText}>
              This ride will be registered on the Ethereum smart contract
            </Text>
          </LinearGradient>
        </View>

        {/* Route */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Route</Text>
          </View>
          <InputField
            label="Pickup Location"
            value={formData.from_location}
            onChangeText={set('from_location')}
            placeholder="e.g. Mumbai Central"
          />
          <InputField
            label="Destination"
            value={formData.to_location}
            onChangeText={set('to_location')}
            placeholder="e.g. Pune Station"
          />
        </View>

        {/* Ride details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Ride Details</Text>
          </View>
          <InputField
            label="Departure Time (YYYY-MM-DD HH:MM)"
            value={formData.departure_time}
            onChangeText={set('departure_time')}
            placeholder="2025-06-15 09:00"
          />
          <View style={styles.twoCol}>
            <View style={styles.halfField}>
              <InputField
                label="Price / Seat ($)"
                value={formData.price}
                onChangeText={set('price')}
                placeholder="25.00"
                keyboardType="decimal-pad"
                rightIcon={<DollarSign size={14} color={colors.textMuted} />}
              />
            </View>
            <View style={styles.halfField}>
              <InputField
                label="Available Seats"
                value={formData.total_seats}
                onChangeText={set('total_seats')}
                placeholder="4"
                keyboardType="number-pad"
                rightIcon={<Users size={14} color={colors.textMuted} />}
              />
            </View>
          </View>
          <InputField
            label="Vehicle Model (optional)"
            value={formData.vehicle_model}
            onChangeText={set('vehicle_model')}
            placeholder="Honda City 2023"
          />
        </View>

        {/* Escrow info */}
        <View style={styles.escrowInfo}>
          <Shield size={16} color={colors.success} />
          <Text style={styles.escrowText}>
            Passenger payments will be held in escrow until you complete the ride. Cancel anytime for full refunds.
          </Text>
        </View>

        <PrimaryButton
          title="Create Ride"
          onPress={handleCreate}
          loading={loading}
          icon={<Zap size={16} color={colors.textInverse} />}
          variant="chain"
          style={styles.createBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  chainNotice: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainNoticeBg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  chainNoticeText: {
    ...typography.caption,
    color: colors.chain,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  escrowInfo: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.successDim,
    padding: 12,
    borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  escrowText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
    lineHeight: 18,
  },
  createBtn: {
    marginTop: spacing.sm,
  },
});
