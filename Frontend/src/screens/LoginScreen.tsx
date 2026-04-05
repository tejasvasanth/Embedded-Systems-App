import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, Wallet, Mail, Lock } from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { InputField } from '@/src/components/InputField';
import { supabase } from '@/src/services/supabase';
import { web3Service } from '@/src/services/web3';
import { useApp } from '@/src/context/AppContext';

export const LoginScreen = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { setWalletAddress }    = useApp();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Account Created', 'Check your email for confirmation.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    setLoading(true);
    try {
      const connection = await web3Service.connectWallet();
      if (connection) {
        setWalletAddress(connection.address);
        Alert.alert('Wallet Connected', `${connection.address.slice(0, 10)}...${connection.address.slice(-6)}`);
      } else {
        Alert.alert('Not Detected', 'No Web3 wallet found. Use email login.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hero gradient */}
      <LinearGradient
        colors={['#0D1117', colors.background]}
        style={styles.heroBg}
      >
        {/* Glow blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <LinearGradient
              colors={colors.gradientPrimary}
              style={styles.logoCircle}
            >
              <Zap size={32} color={colors.white} strokeWidth={2.5} />
            </LinearGradient>
            <Text style={styles.appName}>DeRide</Text>
            <Text style={styles.appTagline}>Decentralized Ride Sharing</Text>
            <View style={styles.chainBadge}>
              <View style={styles.chainDot} />
              <Text style={styles.chainLabel}>Ethereum · Web3 Powered</Text>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

            <InputField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              rightIcon={<Mail size={16} color={colors.textMuted} />}
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              rightIcon={<Lock size={16} color={colors.textMuted} />}
            />

            <PrimaryButton
              title={isSignUp ? 'Create Account' : 'Sign In'}
              onPress={handleEmailAuth}
              loading={loading}
              style={styles.authBtn}
            />

            <PrimaryButton
              title={isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              onPress={() => setIsSignUp(s => !s)}
              variant="ghost"
              style={styles.toggleBtn}
              textStyle={styles.toggleBtnText}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or connect wallet</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Wallet connect */}
          <PrimaryButton
            title="Connect Web3 Wallet"
            onPress={handleWalletConnect}
            loading={loading}
            variant="chain"
            icon={<Wallet size={18} color={colors.textInverse} />}
          />

          <Text style={styles.footerNote}>
            Booking payments are secured via smart contract escrow on Ethereum.
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroBg: {
    flex: 1,
  },
  blob1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
    opacity: 0.06,
    top: -80,
    right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.chain,
    opacity: 0.05,
    bottom: 100,
    left: -60,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  appTagline: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  chainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.chainDim,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderChain,
  },
  chainDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.chain,
    marginRight: 7,
  },
  chainLabel: {
    ...typography.small,
    color: colors.chain,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  authBtn: {
    marginTop: spacing.xs,
  },
  toggleBtn: {
    marginTop: 4,
  },
  toggleBtnText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: 12,
  },
  footerNote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
