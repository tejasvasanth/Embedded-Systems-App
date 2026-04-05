/**
 * CurrentLocationButton
 *
 * A small chip that:
 *   1. Requests location permission via a hidden WebView (no expo-location needed)
 *   2. Gets GPS coordinates using navigator.geolocation
 *   3. Reverse-geocodes via ORS
 *   4. Calls onLocation(label) when done
 *
 * Shows a loading state while working; shows an error message on failure.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LocateFixed, AlertCircle } from 'lucide-react-native';
import { colors, typography } from '@/src/theme';

const ORS_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? '';

interface Props {
  onLocation: (label: string) => void;
  label?: string;
}

// Minimal HTML page — no visible map, just fires geolocation + ORS reverse geocode
const GEO_HTML = (orsKey: string) => `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head><body>
<script>
navigator.geolocation.getCurrentPosition(
  async function(pos) {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    try {
      const res  = await fetch(
        'https://api.openrouteservice.org/geocode/reverse?api_key=${orsKey}&point.lat=' + lat + '&point.lon=' + lon + '&size=1'
      );
      const data = await res.json();
      const label = (data.features && data.features.length > 0)
        ? data.features[0].properties.label
        : lat.toFixed(5) + ', ' + lon.toFixed(5);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'OK', label, lat, lon }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type:'OK',
        label: lat.toFixed(5) + ', ' + lon.toFixed(5),
        lat, lon
      }));
    }
  },
  function(err) {
    var msg = 'Location unavailable.';
    if (err.code === 1) msg = 'Location permission denied.';
    else if (err.code === 3) msg = 'Location request timed out.';
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'ERR', message: msg }));
  },
  { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
);
<\/script>
</body></html>
`;

export const CurrentLocationButton: React.FC<Props> = ({
  onLocation,
  label = 'Use my location',
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [active, setActive] = useState(false);   // mounts the hidden WebView

  const handlePress = () => {
    setStatus('loading');
    setErrorMsg('');
    setActive(true);
  };

  const handleMessage = (e: WebViewMessageEvent) => {
    setActive(false);
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'OK') {
        setStatus('idle');
        onLocation(msg.label);
      } else {
        setStatus('error');
        setErrorMsg(msg.message || 'Could not get location.');
        setTimeout(() => setStatus('idle'), 3500);
      }
    } catch {
      setStatus('error');
      setErrorMsg('Unexpected error.');
      setTimeout(() => setStatus('idle'), 3500);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.btn,
          status === 'loading' && styles.btnLoading,
          status === 'error'   && styles.btnError,
        ]}
        onPress={handlePress}
        disabled={status === 'loading'}
        activeOpacity={0.75}
      >
        {status === 'loading' ? (
          <>
            <ActivityIndicator size="small" color={colors.chain} />
            <Text style={styles.btnText}>Getting location…</Text>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle size={14} color={colors.error} />
            <Text style={[styles.btnText, { color: colors.error }]} numberOfLines={1}>
              {errorMsg}
            </Text>
          </>
        ) : (
          <>
            <LocateFixed size={14} color={colors.chain} />
            <Text style={styles.btnText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Hidden WebView — only mounted while fetching */}
      {active && (
        <WebView
          style={styles.hidden}
          source={{ html: GEO_HTML(ORS_KEY) }}
          javaScriptEnabled
          geolocationEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          onMessage={handleMessage}
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: colors.chainDim,
    borderWidth: 1,
    borderColor: colors.borderChain,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnLoading: {
    opacity: 0.75,
  },
  btnError: {
    backgroundColor: colors.errorDim,
    borderColor: colors.error + '40',
  },
  btnText: {
    ...typography.caption,
    color: colors.chain,
    fontWeight: '600',
  },
  hidden: {
    width: 0,
    height: 0,
    position: 'absolute',
    opacity: 0,
  },
});
