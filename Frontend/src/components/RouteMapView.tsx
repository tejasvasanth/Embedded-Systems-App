/**
 * RouteMapView
 *
 * Embeds a Leaflet map that shows the route between two named locations.
 * Uses ORS Geocoding to resolve names → coordinates, then ORS Directions
 * to draw the actual driving route.
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, typography, spacing } from '@/src/theme';

const ORS_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? '';

interface Props {
  from: string;
  to: string;
  height?: number;
}

const buildRouteHtml = (orsKey: string, from: string, to: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; background:#07080F; }
  #map { width:100%; height:100%; }
  .leaflet-tile { filter: brightness(0.8) saturate(0.65); }
  .leaflet-control-zoom { display:none; }
  .leaflet-control-attribution { display:none; }

  #status {
    position:absolute; top:10px; left:10px; right:10px; z-index:999;
    background:rgba(17,24,39,0.92);
    border:1px solid rgba(99,102,241,0.3);
    border-radius:10px;
    padding:8px 12px;
    color:#9CA3AF;
    font-size:11px;
    font-family:-apple-system,sans-serif;
    text-align:center;
    display:none;
  }

  #legend {
    position:absolute; bottom:10px; left:10px; z-index:999;
    background:rgba(17,24,39,0.9);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:10px;
    padding:8px 12px;
    display:flex;
    flex-direction:column;
    gap:5px;
  }
  .legend-item {
    display:flex; align-items:center; gap:7px;
    color:#F9FAFB; font-size:11px; font-family:-apple-system,sans-serif;
  }
  .dot { width:10px; height:10px; border-radius:50%; }
</style>
</head>
<body>
<div id="map"></div>
<div id="status"></div>
<div id="legend">
  <div class="legend-item">
    <div class="dot" style="background:#6366F1;"></div>
    <span>${from.split(',')[0]}</span>
  </div>
  <div class="legend-item">
    <div class="dot" style="background:#10B981;"></div>
    <span>${to.split(',')[0]}</span>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const ORS_KEY   = '${orsKey}';
const FROM_TEXT = '${from.replace(/'/g, "\\'")}';
const TO_TEXT   = '${to.replace(/'/g, "\\'")}';

const map = L.map('map', { zoomControl:false }).setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

function makeIcon(color) {
  return L.divIcon({
    html: \`<div style="
      width:20px; height:20px; border-radius:50%;
      background:\${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>\`,
    iconSize:[20,20], iconAnchor:[10,10], className:'',
  });
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (msg) { el.textContent = msg; el.style.display = 'block'; }
  else      { el.style.display = 'none'; }
}

async function geocode(text) {
  const res  = await fetch(
    \`https://api.openrouteservice.org/geocode/search?api_key=\${ORS_KEY}&text=\${encodeURIComponent(text)}&size=1\`
  );
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    const [lon, lat] = data.features[0].geometry.coordinates;
    return [lat, lon];
  }
  return null;
}

async function getRoute(fromCoord, toCoord) {
  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      'Authorization': ORS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [fromCoord[1], fromCoord[0]],
        [toCoord[1], toCoord[0]],
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.features?.[0]?.geometry?.coordinates ?? null;
}

async function init() {
  setStatus('Locating ' + FROM_TEXT + '…');
  const fromCoord = await geocode(FROM_TEXT).catch(() => null);
  if (!fromCoord) { setStatus('Could not find: ' + FROM_TEXT); return; }

  setStatus('Locating ' + TO_TEXT + '…');
  const toCoord = await geocode(TO_TEXT).catch(() => null);
  if (!toCoord) { setStatus('Could not find: ' + TO_TEXT); return; }

  setStatus('Loading route…');
  const routeCoords = await getRoute(fromCoord, toCoord).catch(() => null);

  // Place markers
  L.marker(fromCoord, { icon: makeIcon('#6366F1') }).addTo(map);
  L.marker(toCoord,   { icon: makeIcon('#10B981') }).addTo(map);

  if (routeCoords && routeCoords.length > 0) {
    const latLngs = routeCoords.map(([lon, lat]) => [lat, lon]);
    const poly = L.polyline(latLngs, {
      color: '#6366F1',
      weight: 4,
      opacity: 0.85,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [48, 48] });
  } else {
    // Fallback: straight line
    L.polyline([fromCoord, toCoord], {
      color: '#6366F1', weight: 3, opacity: 0.6,
      dashArray: '8 6',
    }).addTo(map);
    map.fitBounds([fromCoord, toCoord], { padding: [48, 48] });
  }

  setStatus(null);
}

init();
</script>
</body>
</html>
`;

export const RouteMapView: React.FC<Props> = ({ from, to, height = 220 }) => {
  const [loading, setLoading] = useState(true);

  return (
    <View style={[styles.container, { height }]}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Loading map…</Text>
        </View>
      )}
      <WebView
        source={{ html: buildRouteHtml(ORS_KEY, from, to) }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        scrollEnabled={false}
        setSupportMultipleWindows={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    zIndex: 10,
    gap: 8,
  },
  loaderText: {
    ...typography.small,
    color: colors.textMuted,
  },
});
