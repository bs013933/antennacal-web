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
      <div class="compass-wrapper">
        <!-- 固定的罗盘圆盘（N始终在上方） -->
        <div class="compass-circle">
          <!-- 刻度 -->
          <div class="degree-marks">
            <div v-for="i in 36" :key="i" class="degree-mark"
              :style="{ transform: `rotate(${(i - 1) * 10}deg)` }">
              <div class="mark-line" :class="{ 'major': (i - 1) % 3 === 0 }"></div>
            </div>
          </div>

          <!-- 方向标记 -->
          <div class="direction-label north">N</div>
          <div class="direction-label east">E</div>
          <div class="direction-label south">S</div>
          <div class="direction-label west">W</div>

          <!-- 目标方位指示器（绿色扇形） -->
          <div class="target-indicator" 
            :style="{ transform: `rotate(${targetAzimuth}deg)` }">
            <div class="target-wedge"></div>
            <div class="target-label">{{ Math.round(targetAzimuth) }}°</div>
          </div>
        </div>

        <!-- 设备方向指针（红色箭头，会旋转） -->
        <!-- 使用负角度使指针与设备旋转方向一致 -->
        <div class="device-needle" 
          :class="{ 'aligned': isStableAligned }"
          :style="{ transform: `rotate(-${accumulatedRotation}deg)` }">
          <div class="needle-head"></div>
          <div class="needle-tail"></div>
        </div>

        <!-- 中心点 -->
        <div class="center-point"></div>
      </div>

      <!-- 信息面板 -->
      <div class="info-panel">
        <div class="info-row">
          <span class="info-label">{{ t.currentHeading }}:</span>
          <span class="info-value">{{ Math.round(smoothedHeading) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t.targetAzimuth }}:</span>
          <span class="info-value target-color">{{ Math.round(targetAzimuth) }}°</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t.difference }}:</span>
          <span class="info-value" :class="{ 'aligned-text': isStableAligned }">
            {{ Math.round(Math.abs(angleDifference)) }}°
          </span>
        </div>
        
        <!-- 调试信息（仅开发时显示） -->
        <div v-if="showDebug" class="debug-info">
          <div class="debug-row">Raw: {{ Math.round(rawHeading) }}°</div>
          <div class="debug-row">Smoothed: {{ Math.round(smoothedHeading) }}°</div>
          <div class="debug-row">Sensor: {{ sensorType }}</div>
          <div class="debug-row">Device: {{ deviceInfo }}</div>
          <div class="debug-row">Screen: {{ screenOrientation }}°</div>
        </div>
        
        <div v-if="isStableAligned" class="aligned-indicator">
          ✓ {{ t.aligned }}
        </div>
        <div v-else class="hint">
          <span v-if="angleDifference > 0">
            ← {{ t.turnLeft }}
          </span>
          <span v-else>
            → {{ t.turnRight }}
          </span>
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
    turnLeft: '向左转',
    turnRight: '向右转'
  },
  en: {
    title: 'Real-time Compass',
    start: 'Start',
    stop: 'Stop',
    notSupported: 'Device orientation not supported',
    needPermission: 'Permission needed for orientation sensor',
    currentHeading: 'Current',
    targetAzimuth: 'Target',
    difference: 'Offset',
    aligned: 'Aligned!',
    turnLeft: 'Turn Left',
    turnRight: 'Turn Right'
  }
};

const t = computed(() => translations[props.language]);

const isActive = ref(false);
const isSupported = ref(true);
const hasPermission = ref(true);
const needsPermission = ref(false);
const rawHeading = ref(0);
const smoothedHeading = ref(0);
const sensorType = ref('');
const showDebug = ref(false); // 设为 true 可显示调试信息

// ========== 设备检测 ==========
const userAgent = navigator.userAgent.toLowerCase();
const isAndroid = /android/i.test(userAgent);
const isIOS = /iphone|ipad|ipod/i.test(userAgent);

// Android厂商检测
const isXiaomi = /xiaomi|mi\s|redmi/i.test(userAgent);
const isHuawei = /huawei|honor/i.test(userAgent);
const isOppo = /oppo/i.test(userAgent);
const isVivo = /vivo/i.test(userAgent);
const isSamsung = /samsung/i.test(userAgent);

// 设备信息字符串
const deviceInfo = computed(() => {
  let info = [];
  if (isIOS) info.push('iOS');
  if (isAndroid) info.push('Android');
  if (isXiaomi) info.push('Xiaomi');
  if (isHuawei) info.push('Huawei');
  if (isOppo) info.push('Oppo');
  if (isVivo) info.push('Vivo');
  if (isSamsung) info.push('Samsung');
  return info.join(' ') || 'Unknown';
});

// 屏幕方向
const screenOrientation = ref(0);

// 获取屏幕方向角度
const getScreenOrientation = () => {
  if (window.screen && window.screen.orientation) {
    const angle = window.screen.orientation.angle || 0;
    screenOrientation.value = angle;
    return angle;
  } else if (window.orientation !== undefined) {
    screenOrientation.value = window.orientation;
    return window.orientation;
  }
  return 0;
};

// 累积旋转角度（解决360度边界反向问题）
const accumulatedRotation = ref(0);
const lastHeading = ref(null);

// 平滑处理
const headingHistory = ref([]);
const SMOOTHING_WINDOW = 8;

// 稳定性检测
const alignedHistory = ref([]);
const STABILITY_CHECKS = 5;

// 低通滤波阈值
const SMOOTHING_THRESHOLD = 0.5;

// 平滑处理函数
const smoothHeading = (newHeading) => {
  if (headingHistory.value.length > 0) {
    const lastHeading = headingHistory.value[headingHistory.value.length - 1];
    let diff = Math.abs(newHeading - lastHeading);
    if (diff > 180) diff = 360 - diff;
    
    if (diff < SMOOTHING_THRESHOLD) {
      return smoothedHeading.value;
    }
  }
  
  headingHistory.value.push(newHeading);
  
  if (headingHistory.value.length > SMOOTHING_WINDOW) {
    headingHistory.value.shift();
  }
  
  if (headingHistory.value.length < 2) {
    return newHeading;
  }
  
  let sinSum = 0;
  let cosSum = 0;
  let weightSum = 0;
  
  headingHistory.value.forEach((angle, index) => {
    const weight = (index + 1) / headingHistory.value.length;
    const rad = angle * Math.PI / 180;
    sinSum += Math.sin(rad) * weight;
    cosSum += Math.cos(rad) * weight;
    weightSum += weight;
  });
  
  const avgRad = Math.atan2(sinSum / weightSum, cosSum / weightSum);
  let avgAngle = avgRad * 180 / Math.PI;
  
  if (avgAngle < 0) avgAngle += 360;
  
  return avgAngle;
};

// 更新累积旋转角度
const updateAccumulatedRotation = (newHeading) => {
  if (lastHeading.value === null) {
    lastHeading.value = newHeading;
    accumulatedRotation.value = newHeading;
    return accumulatedRotation.value;
  }
  
  let delta = newHeading - lastHeading.value;
  
  if (delta > 180) {
    delta = delta - 360;
  } else if (delta < -180) {
    delta = delta + 360;
  }
  
  accumulatedRotation.value += delta;
  lastHeading.value = newHeading;
  
  return accumulatedRotation.value;
};

// 计算角度差
const angleDifference = computed(() => {
  let diff = props.targetAzimuth - smoothedHeading.value;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
});

// 对准检测
const isAligned = computed(() => {
  return Math.abs(angleDifference.value) <= 3;
});

// 稳定对准状态
const isStableAligned = computed(() => {
  alignedHistory.value.push(isAligned.value);
  
  if (alignedHistory.value.length > STABILITY_CHECKS) {
    alignedHistory.value.shift();
  }
  
  if (alignedHistory.value.length < STABILITY_CHECKS) {
    return false;
  }
  
  return alignedHistory.value.every(v => v === true);
});

let orientationHandler = null;

// 处理设备方向事件
const handleOrientation = (event) => {
  let heading = null;
  
  // iOS 设备
  if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
    heading = event.webkitCompassHeading;
    sensorType.value = 'iOS Compass';
  }
  // Android 绝对方向（优先）
  else if (event.absolute && event.alpha !== null) {
    heading = event.alpha;
    sensorType.value = 'Android Absolute';
    
    // Android的alpha是设备顶部相对于正北的角度
    // 需要根据具体厂商进行调整
    if (isXiaomi) {
      // 小米部分型号需要反转
      heading = 360 - heading;
      sensorType.value += ' (Xiaomi)';
    } else if (isHuawei) {
      // 华为设备通常符合标准
      sensorType.value += ' (Huawei)';
    } else if (isOppo || isVivo) {
      // Oppo/Vivo某些型号可能需要调整
      sensorType.value += ' (Oppo/Vivo)';
    }
  }
  // Android 相对方向
  else if (event.alpha !== null) {
    heading = event.alpha;
    sensorType.value = 'Android Relative';
    
    if (isXiaomi) {
      heading = 360 - heading;
      sensorType.value += ' (Xiaomi)';
    }
  }
  
  if (heading !== null) {
    // 标准化到 0-360
    heading = heading % 360;
    if (heading < 0) heading += 360;
    
    rawHeading.value = heading;
    smoothedHeading.value = smoothHeading(heading);
    
    // 更新累积旋转
    updateAccumulatedRotation(smoothedHeading.value);
  }
};

// 请求权限（iOS 13+需要）
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

// 启动罗盘
const startCompass = async () => {
  if (typeof DeviceOrientationEvent === 'undefined') {
    isSupported.value = false;
    return;
  }

  const hasPermissionNow = await requestPermission();
  if (!hasPermissionNow) {
    return;
  }

  // 重置
  headingHistory.value = [];
  alignedHistory.value = [];
  rawHeading.value = 0;
  smoothedHeading.value = 0;
  accumulatedRotation.value = 0;
  lastHeading.value = null;
  
  // 更新屏幕方向
  getScreenOrientation();

  orientationHandler = handleOrientation;
  
  // 同时监听两种事件
  window.addEventListener('deviceorientationabsolute', orientationHandler, true);
  window.addEventListener('deviceorientation', orientationHandler, true);
  
  // 监听屏幕方向变化
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener('change', getScreenOrientation);
  }
  window.addEventListener('orientationchange', getScreenOrientation);
  
  isActive.value = true;
};

// 停止罗盘
const stopCompass = () => {
  if (orientationHandler) {
    window.removeEventListener('deviceorientationabsolute', orientationHandler, true);
    window.removeEventListener('deviceorientation', orientationHandler, true);
    orientationHandler = null;
  }
  
  if (window.screen && window.screen.orientation) {
    window.screen.orientation.removeEventListener('change', getScreenOrientation);
  }
  window.removeEventListener('orientationchange', getScreenOrientation);
  
  isActive.value = false;
  headingHistory.value = [];
  alignedHistory.value = [];
};

onMounted(() => {
  if (typeof DeviceOrientationEvent === 'undefined') {
    isSupported.value = false;
  }
  
  // 获取屏幕方向
  getScreenOrientation();
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
}

.compass-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
}

.compass-circle {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, #fff 0%, #f5f5f5 100%);
  border-radius: 50%;
  box-shadow: 
    0 0 30px rgba(0, 0, 0, 0.2),
    inset 0 0 20px rgba(0, 0, 0, 0.05);
}

/* 刻度 */
.degree-marks {
  position: absolute;
  width: 100%;
  height: 100%;
}

.degree-mark {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.mark-line {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 2px;
  height: 8px;
  background: #ccc;
  transform: translateX(-50%);
}

.mark-line.major {
  height: 12px;
  width: 2px;
  background: #999;
}

/* 方向标记 */
.direction-label {
  position: absolute;
  font-weight: bold;
  font-size: 24px;
  color: #333;
}

.direction-label.north {
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  color: #e74c3c;
  font-size: 28px;
}

.direction-label.east {
  right: 25px;
  top: 50%;
  transform: translateY(-50%);
}

.direction-label.south {
  bottom: 25px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-label.west {
  left: 25px;
  top: 50%;
  transform: translateY(-50%);
}

/* 目标方位指示器 */
.target-indicator {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transform-origin: center;
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.target-wedge {
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-top: 80px solid rgba(76, 175, 80, 0.3);
  transform: translateX(-50%);
}

.target-label {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  background: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
}

/* 设备方向指针 */
.device-needle {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transform-origin: center;
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  pointer-events: none;
  will-change: transform;
}

.device-needle.aligned .needle-head {
  background: linear-gradient(to bottom, #4caf50, #45a049);
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.6);
}

.needle-head {
  position: absolute;
  top: 30px;
  left: 50%;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 100px solid #e74c3c;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: all 0.3s ease;
}

.needle-tail {
  position: absolute;
  bottom: 30px;
  left: 50%;
  width: 8px;
  height: 50px;
  background: #999;
  transform: translateX(-50%);
  border-radius: 4px;
}

.center-point {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: #333;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 3px solid white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

/* 信息面板 */
.info-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 15px;
  width: 300px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.info-row:last-of-type {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-weight: 700;
  font-size: 18px;
}

.info-value.target-color {
  color: #4caf50;
}

.info-value.aligned-text {
  color: #4caf50;
  font-size: 20px;
}

.aligned-indicator {
  margin-top: 10px;
  padding: 12px;
  background: #4caf50;
  color: white;
  border-radius: 6px;
  text-align: center;
  font-weight: 700;
  animation: success-pulse 0.5s ease-in-out;
}

@keyframes success-pulse {
  0% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.hint {
  margin-top: 10px;
  padding: 8px;
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
}

.debug-info {
  margin-top: 10px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.debug-row {
  padding: 2px 0;
  color: #666;
}
</style>
