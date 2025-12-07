<template>
  <div class="map-container">
    <div id="map"></div>
    <div class="south-indicator">向下为正南</div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  latitude: {
    type: [Number, String],
    default: 0
  },
  longitude: {
    type: [Number, String],
    default: 0
  },
  azimuth: {
    type: Number,
    default: 0
  }
});

let map = null;
let marker = null;

// Custom icon for direction
const createIcon = (rotation) => {
    // Leaflet icon rotation using CSS transform
    return L.divIcon({
        className: 'custom-marker',
        html: `<img src="/marker.png" style="transform: rotate(${rotation}deg); width: 34px; height: 34px; display: block;" />`,
        iconSize: [34, 34],
        iconAnchor: [17, 17] // Center anchor
    });
};

const initMap = () => {
  // Check if map container exists
  if (!document.getElementById('map')) return;

  const lat = parseFloat(props.latitude) || 30;
  const lng = parseFloat(props.longitude) || 120;

  if (map) {
      map.remove();
  }

  map = L.map('map').setView([lat, lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  updateMarker();
};

const updateMarker = () => {
    if (!map) return;

    const lat = parseFloat(props.latitude);
    const lng = parseFloat(props.longitude);
    
    if (isNaN(lat) || isNaN(lng)) return;

    const rotation = props.azimuth + 180; // Match the original logic: azimuth + 180

    if (marker) {
        marker.setLatLng([lat, lng]);
        marker.setIcon(createIcon(rotation));
    } else {
        marker = L.marker([lat, lng], { icon: createIcon(rotation) }).addTo(map);
    }
    
    map.setView([lat, lng], map.getZoom());
};

onMounted(() => {
  initMap();
});

watch(() => [props.latitude, props.longitude, props.azimuth], () => {
    updateMarker();
});

</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 300px; /* Ensure map has height */
  position: relative;
}
#map {
  width: 100%;
  height: 100%;
}
.south-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 2px 5px;
    border-radius: 5px;
    font-size: 12px;
    color: #555;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
    z-index: 1000; /* Ensure it's above the map */
}
</style>
