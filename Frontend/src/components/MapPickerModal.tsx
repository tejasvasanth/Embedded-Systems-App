/**
 * MapPickerModal
 *
 * Full-screen modal with a Leaflet.js map.
 * - Search bar  → ORS forward geocoding
 * - Tap on map  → ORS reverse geocoding
 * - "Use My Location" button → browser Geolocation API + ORS reverse geocoding
 *
 * Communication: WebView → RN via postMessage
 */

import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { X, MapPin } from 'lucide-react-native';
import { colors, typography, spacing } from '@/src/theme';

const ORS_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? '';

export interface PickedLocation {
  label: string;
  lat: number;
  lon: number;
}

interface Props {
  visible: boolean;
  title?: string;
  onSelect: (location: PickedLocation) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
//  Leaflet HTML
// ─────────────────────────────────────────────────────────────

const buildHtml = (orsKey: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; background:#07080F; font-family:-apple-system,sans-serif; }
  #map { width:100%; height:100%; }

  /* ── Search box ── */
  #search-box {
    position:absolute; top:12px; left:12px; right:12px; z-index:9999;
    display:flex; flex-direction:column; gap:0;
  }
  #search-input-wrap {
    display:flex; align-items:center;
    background:#111827;
    border:1.5px solid rgba(99,102,241,0.4);
    border-radius:14px;
    padding:0 12px;
    box-shadow:0 4px 24px rgba(0,0,0,0.5);
  }
  #search-icon { flex-shrink:0; margin-right:8px; opacity:0.5; }
  #search-input {
    flex:1; background:transparent; border:none; outline:none;
    color:#F9FAFB; font-size:15px; padding:13px 0; caret-color:#6366F1;
  }
  #search-input::placeholder { color:#6B7280; }
  #clear-btn {
    background:none; border:none; color:#6B7280;
    cursor:pointer; font-size:16px; padding:4px; display:none;
  }
  #results {
    background:#111827; border:1px solid rgba(99,102,241,0.25);
    border-radius:12px; margin-top:6px; overflow:hidden;
    box-shadow:0 8px 32px rgba(0,0,0,0.6);
    max-height:200px; overflow-y:auto; display:none;
  }
  .result-item {
    padding:11px 14px; border-bottom:1px solid rgba(255,255,255,0.05);
    cursor:pointer; display:flex; align-items:flex-start; gap:10px;
  }
  .result-item:last-child { border-bottom:none; }
  .result-item:active { background:rgba(99,102,241,0.12); }
  .result-name  { color:#F9FAFB; font-size:13px; font-weight:600; line-height:1.3; }
  .result-region{ color:#6B7280; font-size:11px; margin-top:2px; }

  /* ── Use My Location button ── */
  #location-btn {
    display:flex; align-items:center; justify-content:center; gap:8px;
    background:rgba(0,212,255,0.1);
    border:1px solid rgba(0,212,255,0.35);
    border-radius:12px;
    padding:10px 14px;
    margin-top:7px;
    cursor:pointer;
    color:#00D4FF;
    font-size:13px;
    font-weight:600;
    transition:background 0.15s;
  }
  #location-btn:active { background:rgba(0,212,255,0.2); }
  #location-btn svg { flex-shrink:0; }
  #location-btn.loading { opacity:0.6; pointer-events:none; }

  /* ── Tap hint ── */
  #tap-hint {
    position:absolute; bottom:96px; left:50%; transform:translateX(-50%);
    z-index:1000; background:rgba(17,24,39,0.9);
    border:1px solid rgba(255,255,255,0.07); border-radius:20px;
    padding:6px 16px; color:#9CA3AF; font-size:12px; white-space:nowrap;
    pointer-events:none; transition:opacity 0.3s;
  }

  /* ── Confirm bar ── */
  #confirm-bar {
    position:absolute; bottom:0; left:0; right:0; z-index:9999;
    padding:12px 14px 16px;
    background:linear-gradient(to top,#07080F 75%,transparent);
    display:none; flex-direction:column; gap:9px;
  }
  #selected-label {
    background:#111827; border:1px solid rgba(99,102,241,0.3);
    border-radius:11px; padding:9px 13px;
    display:flex; align-items:flex-start; gap:8px;
  }
  #selected-label-text { color:#F9FAFB; font-size:13px; font-weight:500; flex:1; line-height:1.4; }
  #confirm-btn {
    background:linear-gradient(90deg,#6366F1,#8B5CF6);
    border:none; border-radius:12px; color:white;
    font-size:15px; font-weight:700; padding:14px; cursor:pointer;
  }

  /* ── Spinner ── */
  #spinner {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%,-50%);
    z-index:9998; display:none;
    width:36px; height:36px;
    border:3px solid rgba(99,102,241,0.2);
    border-top-color:#6366F1; border-radius:50%;
    animation:spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform:translate(-50%,-50%) rotate(360deg); } }

  .leaflet-tile { filter:brightness(0.82) saturate(0.65); }
  .leaflet-control-zoom { display:none; }
</style>
</head>
<body>

<div id="map"></div>

<!-- Search + location button -->
<div id="search-box">
  <div id="search-input-wrap">
    <svg id="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="#9CA3AF" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input id="search-input" type="text" placeholder="Search location…" autocomplete="off"/>
    <button id="clear-btn" onclick="clearSearch()">✕</button>
  </div>

  <button id="location-btn" onclick="useMyLocation()">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="2.2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="none" fill="#00D4FF" opacity="0.2"/>
    </svg>
    Use My Location
  </button>

  <div id="results"></div>
</div>

<div id="tap-hint">Tap anywhere on the map to pick a location</div>

<div id="confirm-bar">
  <div id="selected-label">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2.5"
         style="flex-shrink:0;margin-top:2px">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
    <span id="selected-label-text">No location selected</span>
  </div>
  <button id="confirm-btn" onclick="confirmSelection()">Confirm Location</button>
</div>

<div id="spinner"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const ORS_KEY = '${orsKey}';
let map, marker, selected = null;
let searchTimer = null;

// ── Map init ──────────────────────────────────────────────────
map = L.map('map', { zoomControl:false }).setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

const pinIcon = L.divIcon({
  html: \`<div style="width:32px;height:40px;filter:drop-shadow(0 3px 8px rgba(99,102,241,0.65))">
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24S32 28 32 16C32 7.163 24.837 0 16 0z"
        fill="url(#g)"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#8B5CF6"/>
        </linearGradient>
      </defs>
    </svg>
  </div>\`,
  iconSize:[32,40], iconAnchor:[16,40], className:'',
});

const myLocIcon = L.divIcon({
  html: \`<div style="width:32px;height:40px;filter:drop-shadow(0 3px 8px rgba(0,212,255,0.7))">
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24S32 28 32 16C32 7.163 24.837 0 16 0z"
        fill="url(#gc)"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#00D4FF"/><stop offset="100%" stop-color="#6366F1"/>
        </linearGradient>
      </defs>
    </svg>
  </div>\`,
  iconSize:[32,40], iconAnchor:[16,40], className:'',
});

// ── Map click → reverse geocode ───────────────────────────────
map.on('click', async (e) => {
  const { lat, lng } = e.latlng;
  showSpinner(true);
  const label = await reverseGeocode(lat, lng);
  placeMarker(lat, lng, label, pinIcon);
  showSpinner(false);
});

// ── Use My Location ───────────────────────────────────────────
async function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device.');
    return;
  }
  const btn = document.getElementById('location-btn');
  btn.classList.add('loading');
  btn.innerHTML = \`
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="2.2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
    </svg>
    Locating…
  \`;
  showSpinner(true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const label = await reverseGeocode(lat, lon);
      placeMarker(lat, lon, label, myLocIcon);
      map.flyTo([lat, lon], 15, { duration: 0.9 });
      showSpinner(false);
      resetLocationBtn();
    },
    (err) => {
      showSpinner(false);
      resetLocationBtn();
      let msg = 'Could not get your location.';
      if (err.code === 1) msg = 'Location permission denied. Please allow location access.';
      else if (err.code === 2) msg = 'Location unavailable. Check GPS/network.';
      else if (err.code === 3) msg = 'Location request timed out.';
      // Post error back to RN so it can show a toast
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOCATION_ERROR', message: msg }));
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}

function resetLocationBtn() {
  const btn = document.getElementById('location-btn');
  btn.classList.remove('loading');
  btn.innerHTML = \`
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="2.2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" stroke="none" fill="#00D4FF" opacity="0.2"/>
    </svg>
    Use My Location
  \`;
}

// ── Helpers ───────────────────────────────────────────────────
async function reverseGeocode(lat, lon) {
  try {
    const res  = await fetch(
      \`https://api.openrouteservice.org/geocode/reverse?api_key=\${ORS_KEY}&point.lat=\${lat}&point.lon=\${lon}&size=1\`
    );
    const data = await res.json();
    if (data.features?.length > 0) return data.features[0].properties.label;
  } catch(e) {}
  return \`\${lat.toFixed(5)}, \${lon.toFixed(5)}\`;
}

function placeMarker(lat, lon, label, icon) {
  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon], { icon }).addTo(map);
  selected = { label, lat, lon };
  document.getElementById('selected-label-text').textContent = label;
  document.getElementById('confirm-bar').style.display = 'flex';
  document.getElementById('tap-hint').style.opacity = '0';
}

function confirmSelection() {
  if (!selected) return;
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'LOCATION_SELECTED',
    ...selected,
  }));
}

// ── Search ────────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const resultsDiv  = document.getElementById('results');
const clearBtn    = document.getElementById('clear-btn');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearBtn.style.display = q ? 'block' : 'none';
  clearTimeout(searchTimer);
  if (q.length < 2) { hideResults(); return; }
  searchTimer = setTimeout(() => doSearch(q), 400);
});

searchInput.addEventListener('focus', () => {
  document.getElementById('tap-hint').style.opacity = '0';
  if (searchInput.value.trim().length >= 2) showResults();
});
searchInput.addEventListener('blur', () => {
  document.getElementById('tap-hint').style.opacity = '1';
  setTimeout(hideResults, 200);
});

async function doSearch(q) {
  showSpinner(true);
  try {
    const res  = await fetch(
      \`https://api.openrouteservice.org/geocode/search?api_key=\${ORS_KEY}&text=\${encodeURIComponent(q)}&size=6\`
    );
    const data = await res.json();
    renderResults(data.features || []);
  } catch(e) { hideResults(); }
  showSpinner(false);
}

function renderResults(features) {
  if (!features.length) { hideResults(); return; }
  resultsDiv.innerHTML = features.map(f => {
    const name   = f.properties.name || f.properties.label;
    const region = [f.properties.region, f.properties.country].filter(Boolean).join(', ');
    const [lon, lat] = f.geometry.coordinates;
    return \`
      <div class="result-item"
           onclick="selectResult('\${encodeURIComponent(f.properties.label||name)}',\${lat},\${lon})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366F1"
             stroke-width="2" style="flex-shrink:0;margin-top:3px">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <div>
          <div class="result-name">\${name}</div>
          \${region ? \`<div class="result-region">\${region}</div>\` : ''}
        </div>
      </div>
    \`;
  }).join('');
  showResults();
}

function selectResult(encodedLabel, lat, lon) {
  const label = decodeURIComponent(encodedLabel);
  searchInput.value = label;
  clearBtn.style.display = 'block';
  hideResults();
  placeMarker(lat, lon, label, pinIcon);
  map.flyTo([lat, lon], 14, { duration: 0.8 });
  searchInput.blur();
}

function clearSearch() {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  hideResults();
}

function showResults() { resultsDiv.style.display = 'block'; }
function hideResults()  { resultsDiv.style.display = 'none'; }
function showSpinner(v) { document.getElementById('spinner').style.display = v ? 'block' : 'none'; }
</script>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────

export const MapPickerModal: React.FC<Props> = ({
  visible,
  title = 'Pick Location',
  onSelect,
  onClose,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [webLoading, setWebLoading] = useState(true);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'LOCATION_SELECTED') {
        onSelect({ label: msg.label, lat: msg.lat, lon: msg.lon });
        onClose();
      }
      // LOCATION_ERROR is handled silently — the map shows an alert() inside the WebView
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ORS badge */}
        <View style={styles.attrBanner}>
          <MapPin size={11} color={colors.chain} />
          <Text style={styles.attrText}>
            OpenRouteService · OpenStreetMap · tap, search, or use GPS
          </Text>
        </View>

        {/* Map */}
        <View style={styles.mapWrap}>
          {webLoading && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Loading map…</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ html: buildHtml(ORS_KEY) }}
            style={styles.webview}
            onLoadEnd={() => setWebLoading(false)}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            geolocationEnabled
            setSupportMultipleWindows={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    width: 36,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.chainDim,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderChain,
  },
  attrText: {
    ...typography.small,
    color: colors.chain,
    opacity: 0.85,
  },
  mapWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 12,
  },
  loaderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
