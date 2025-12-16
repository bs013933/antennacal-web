<template>
  <div class="compass-container">
    <div class="compass-header">
      <h3>{{ t.title }}</h3>
      <button v-if="!isActive" @click="startCompass" class="start-button">
        {{ t.start }}
      </button>
      <button v-else @click="stopCompass" class="stop-button">
        {{ t.stop }}
      </button>
    </div>

    <div v-if="!isSupported" class="error-message">
      {{ t.notSupported }}
    </div>

    <div v-else-if="!hasPermission && needsPermission" class="error-message">
      {{ t.needPermission }}
    </div>

    <div v-else class="compass-display">
      <!-- 罗盘背景（随设备方向反向旋转，使方向标记始终指向真实方向） -->
      <div 
        class="compass-circle"
        :style="{ transform: `rotate(${-smoothedHeading}deg)` }"
      >
        <!-- 方向标记 -->
        <div class="direction-markers">
          <div class="marker north">N</div>
          <div class="marker east">E</div>
          <div class="marker south">S</div>
          <div class="marker west">W</div>
        </div>

        <!-- 目标方位角指示线 -->
        <div 
          class="target-line" 
          :style="{ transform: `rotate(${targetAzimuth}deg)` }"
        >
          <div class="target-marker">{{ t.target }}</div>
        </div>
      </div>

      <!-- 当前设备方向箭头（固定在中心，始终指向上方） -->
      <div 
        class="device-arrow-fixed" 
        :class="{ 'aligned': isStableAligned }"
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="arrowGradientRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#ff4444;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#cc0000;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="arrowGradientGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#44ff44;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#00cc00;stop-opacity:1" />
            </linearGradient>
          </defs>
          <g transform="rotate(0 40 40)">
            <path 
              d="M 40 10 L 30 35 L 35 35 L 35 60 L 45 60 L 45 35 L 50 35 Z" 
              :fill="isStableAligned ? 'url(#arrowGradientGreen)' : 'url(#arrowGradientRed)'"
              stroke="white" 
              stroke-width="2"
            />
          </g>
        </svg>
      </div>

      <!-- 中心点 -->
      <div class="center-dot"></div>

      <!-- 信息显示 -->
      <div class="info-panel">
        <div class="info-row">
          <span class="info-label">{{ t.currentHeading }}:</span>
          <span class="info-value">{{ Math.round(smoothedHeading) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t.targetAzimuth }}:</span>
          <span class="info-value">{{ Math.round(targetAzimuth) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t.difference }}:</span>
          <span class="info-value" :class="{ 'aligned-text': isStableAligned }">
            {{ Math.round(Math.abs(angleDifference)) }}°
          </span>
        </div>
        <div v-if="isStableAligned" class="aligned-indicator">
          ✓ {{ t.aligned }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  targetAzimuth: {
    type: Number,
    default: 0
  },
  language: {
    type: String,
    default: 'zh'
  }
});

// 多语言文本
const translations = {
  zh: {
    title: '实时方位对准',
    start: '启动罗盘',
    stop: '停止',
    notSupported: '您的设备不支持方向传感器',
    needPermission: '需要授权访问设备方向传感器',
    currentHeading: '当前朝向',
    targetAzimuth: '目标方位',
    difference: '偏差',
    aligned: '已对准！',
    target: '目标'
  },
  en: {
    title: 'Real-time Direction Alignment',
    start: 'Start Compass',
    stop: 'Stop',
    notSupported: 'Your device does not support orientation sensors',
    needPermission: 'Permission needed to access device orientation',
    currentHeading: 'Current',
    targetAzimuth: 'Target',
    difference: 'Offset',
    aligned: 'Aligned!',
    target: 'Target'
  }
};

const t = computed(() => translations[props.language]);

const isActive = ref(false);
const isSupported = ref(true);
const hasPermission = ref(true);
const needsPermission = ref(false);
const currentHeading = ref(0);
const smoothedHeading = ref(0);

// 平滑处理相关
const headingHistory = ref([]);
const SMOOTHING_WINDOW = 5; // 使用最近5个读数进行平滑

// 稳定性检测
const alignedHistory = ref([]);
const STABILITY_CHECKS = 3; // 需要连续3次对准才确认

// 平滑处理函数
const smoothHeading = (newHeading) => {
  headingHistory.value.push(newHeading);
  
  // 只保留最近的 N 个读数
  if (headingHistory.value.length > SMOOTHING_WINDOW) {
    headingHistory.value.shift();
  }
  
  // 处理角度循环问题（例如：355度和5度的平均）
  if (headingHistory.value.length < 2) {
    return newHeading;
  }
  
  // 转换为向量进行平均，避免角度循环问题
  let sinSum = 0;
  let cosSum = 0;
  
  headingHistory.value.forEach(angle => {
    const rad = angle * Math.PI / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  });
  
  const avgRad = Math.atan2(sinSum / headingHistory.value.length, cosSum / headingHistory.value.length);
  let avgAngle = avgRad * 180 / Math.PI;
  
  // 确保结果在 0-360 范围内
  if (avgAngle < 0) avgAngle += 360;
  
  return avgAngle;
};

// 计算角度差（考虑360度循环）
const angleDifference = computed(() => {
  let diff = props.targetAzimuth - smoothedHeading.value;
  // 标准化到 -180 到 180 范围
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
});

// 当前是否在对准范围内
const isAligned = computed(() => {
  return Math.abs(angleDifference.value) <= 5;
});

// 稳定对准状态（需要连续多次确认）
const isStableAligned = computed(() => {
  alignedHistory.value.push(isAligned.value);
  
  // 只保留最近的检查记录
  if (alignedHistory.value.length > STABILITY_CHECKS) {
    alignedHistory.value.shift();
  }
  
  // 所有记录都为true才返回true
  return alignedHistory.value.length === STABILITY_CHECKS && 
         alignedHistory.value.every(v => v === true);
});

let orientationHandler = null;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 50; // 限制更新频率为50ms

const handleOrientation = (event) => {
  const now = Date.now();
  
  // 限制更新频率
  if (now - lastUpdateTime < UPDATE_INTERVAL) {
    return;
  }
  lastUpdateTime = now;
  
  let heading = 0;
  
  if (event.webkitCompassHeading !== undefined) {
    // iOS - 直接提供罗盘方向
    heading = event.webkitCompassHeading;
  } else if (event.absolute && event.alpha !== null) {
    // Android 绝对方向
    heading = 360 - event.alpha;
  } else if (event.alpha !== null) {
    // 相对方向
    heading = 360 - event.alpha;
  }
  
  // 标准化到 0-360
  heading = heading % 360;
  if (heading < 0) heading += 360;
  
  currentHeading.value = heading;
  smoothedHeading.value = smoothHeading(heading);
};

const requestPermission = async () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    needsPermission.value = true;
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      hasPermission.value = permission === 'granted';
      return permission === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      hasPermission.value = false;
      return false;
    }
  }
  return true;
};

const startCompass = async () => {
  // 检查设备支持
  if (typeof DeviceOrientationEvent === 'undefined') {
    isSupported.value = false;
    return;
  }

  // 请求权限（iOS 13+需要）
  const hasPermissionNow = await requestPermission();
  if (!hasPermissionNow) {
    return;
  }

  // 重置历史数据
  headingHistory.value = [];
  alignedHistory.value = [];

  // 启动监听
  orientationHandler = handleOrientation;
  
  // 优先使用 deviceorientationabsolute（提供绝对方向）
  window.addEventListener('deviceorientationabsolute', orientationHandler, true);
  window.addEventListener('deviceorientation', orientationHandler, true);
  
  isActive.value = true;
};

const stopCompass = () => {
  if (orientationHandler) {
    window.removeEventListener('deviceorientationabsolute', orientationHandler, true);
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
  isActive.value = false;
  headingHistory.value = [];
  alignedHistory.value = [];
};

onMounted(() => {
  // 检查设备支持
  if (typeof DeviceOrientationEvent === 'undefined') {
    isSupported.value = false;
  }
});

onUnmounted(() => {
  stopCompass();
});
</script>

<style scoped>
.compass-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.compass-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.compass-header h3 {
  color: white;
  margin: 0;
  font-size: 18px;
}

.start-button, .stop-button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-button {
  background: #4caf50;
  color: white;
}

.start-button:hover {
  background: #45a049;
  transform: scale(1.05);
}

.stop-button {
  background: #f44336;
  color: white;
}

.stop-button:hover {
  background: #da190b;
  transform: scale(1.05);
}

.error-message {
  color: #ffeb3b;
  text-align: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 14px;
}

.compass-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
}

.compass-circle {
  position: relative;
  width: 280px;
  height: 280px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease-out;
  transform-origin: center center;
}

.direction-markers {
  position: absolute;
  width: 100%;
  height: 100%;
}

.marker {
  position: absolute;
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.marker.north {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  color: #f44336;
  font-size: 22px;
}

.marker.east {
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
}

.marker.south {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.marker.west {
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
}

.target-line {
  position: absolute;
  width: 4px;
  height: 140px;
  background: linear-gradient(to bottom, #ff9800 0%, transparent 100%);
  top: 0;
  left: 50%;
  margin-left: -2px;
  transform-origin: 50% 140px;
  transition: transform 0.3s ease;
}

.target-marker {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff9800;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
}

/* 固定在中心的箭头，始终指向上方 */
.device-arrow-fixed {
  position: absolute;
  width: 80px;
  height: 80px;
  top: 140px; /* 居中对齐罗盘 */
  left: 50%;
  margin-left: -40px;
  margin-top: -40px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  z-index: 10;
  pointer-events: none;
}

.device-arrow-fixed.aligned {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.center-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #333;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
  top: 140px;
  left: 50%;
  margin-left: -6px;
  margin-top: -6px;
  z-index: 11;
}

.info-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 15px;
  width: 280px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-weight: 700;
  font-size: 16px;
}

.info-value.aligned-text {
  color: #4caf50;
}

.aligned-indicator {
  margin-top: 10px;
  padding: 10px;
  background: #4caf50;
  color: white;
  border-radius: 6px;
  text-align: center;
  font-weight: 700;
  animation: success-pulse 0.5s ease-in-out;
}

@keyframes success-pulse {
  0% {
    transform: scale(0.9);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
