<template>
  <div class="map-container">
    <div id="map"></div>
    <div class="south-indicator">{{ southText }}</div>
  </div>
</template>

<script setup>
import { onMounted, watch, computed } from 'vue';
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
  },
  language: {
    type: String,
    default: 'zh'
  }
});

let map = null;
let marker = null;

// 多语言文本
const southText = computed(() => {
  return props.language === 'zh' ? '向下为正南' : 'South ↓';
});

// 创建箭头图标
const createArrowIcon = (rotation) => {
  const arrowSvg = `
    <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ee5a6f;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.5"/>
        </filter>
      </defs>
      <!-- 箭头主体 -->
      <g transform="rotate(${rotation} 25 25)" filter="url(#shadow)">
        <!-- 箭头杆 -->
        <rect x="21" y="15" width="8" height="20" fill="url(#arrowGradient)" rx="2"/>
        <!-- 箭头头部 -->
        <path d="M 25 5 L 10 20 L 18 20 L 18 15 L 32 15 L 32 20 L 40 20 Z" fill="url(#arrowGradient)"/>
        <!-- 白色边框增强可见度 -->
        <path d="M 25 5 L 10 20 L 18 20 L 18 15 L 32 15 L 32 20 L 40 20 Z" 
              fill="none" stroke="white" stroke-width="1.5" opacity="0.8"/>
        <rect x="21" y="15" width="8" height="20" fill="none" 
              stroke="white" stroke-width="1.5" opacity="0.8" rx="2"/>
      </g>
    </svg>
  `;
  
  return L.divIcon({
    className: 'arrow-marker',
    html: arrowSvg,
    iconSize: [50, 50],
    iconAnchor: [25, 25] // 中心锚点
  });
};

const initMap = () => {
  // 检查地图容器是否存在
  if (!document.getElementById('map')) return;

  const lat = parseFloat(props.latitude) || 30;
  const lng = parseFloat(props.longitude) || 120;

  if (map) {
    map.remove();
  }

  map = L.map('map').setView([lat, lng], 13);

  // 使用高德地图瓦片服务（中国大陆可用）
  // 根据语言选择中文或英文标注
  const layerType = props.language === 'zh' ? 'Normal.Map' : 'en_r'; // 中文标注 / English
  
  L.tileLayer(`https://webrd0{s}.is.autonavi.com/appmaptile?lang=${props.language === 'zh' ? 'zh_cn' : 'en'}&size=1&scale=1&style=8&x={x}&y={y}&z={z}`, {
    subdomains: ['1', '2', '3', '4'],
    attribution: '&copy; <a href="https://www.amap.com/" target="_blank">高德地图</a>',
    maxZoom: 18,
    minZoom: 3
  }).addTo(map);

  updateMarker();
};

const updateMarker = () => {
  if (!map) return;

  const lat = parseFloat(props.latitude);
  const lng = parseFloat(props.longitude);
  
  if (isNaN(lat) || isNaN(lng)) return;

  // 箭头指向方位角方向（0度为北，顺时针）
  const rotation = props.azimuth;

  // 生成 tooltip 文本
  const tooltipText = props.language === 'zh' 
    ? `方位角: ${Math.round(props.azimuth)}°` 
    : `Azimuth: ${Math.round(props.azimuth)}°`;

  if (marker) {
    // 更新现有 marker
    marker.setLatLng([lat, lng]);
    marker.setIcon(createArrowIcon(rotation));
    // 更新 tooltip 内容
    marker.setTooltipContent(tooltipText);
    marker.options.title = props.language === 'zh' ? '天线指向' : 'Antenna Direction';
  } else {
    // 创建新 marker
    marker = L.marker([lat, lng], { 
      icon: createArrowIcon(rotation),
      title: props.language === 'zh' ? '天线指向' : 'Antenna Direction'
    }).addTo(map);
    
    // 绑定 tooltip
    marker.bindTooltip(tooltipText, {
      permanent: false,
      direction: 'top'
    });
  }
  
  map.setView([lat, lng], map.getZoom());
};

onMounted(() => {
  initMap();
});

watch(() => [props.latitude, props.longitude, props.azimuth], () => {
  updateMarker();
});

watch(() => props.language, () => {
  // 语言切换时重新初始化地图，以更新地图标注语言
  initMap();
});

</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
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
  background-color: rgba(255, 255, 255, 0.9);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 移除箭头标记的默认样式 */
:deep(.arrow-marker) {
  background: transparent !important;
  border: none !important;
}
</style>
