<template>
  <div class="app-wrapper" :class="{ 'dark-theme': isDarkTheme }">
    <div class="container">
    <header class="header">
      <h1 class="title">卫星天线参数计算器</h1>
      <button @click="toggleTheme" class="theme-toggle" :title="isDarkTheme ? '切换到亮主题' : '切换到暗主题'">
        <span v-if="isDarkTheme">☀️</span>
        <span v-else>🌙</span>
      </button>
    </header>

    <div class="input-section">
      <div class="location-row">
        <label class="label">卫星选择</label>
        <select v-model="selectedSatelliteName" class="picker-view">
          <option v-for="name in satelliteNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
      </div>
    </div>

    <div class="input-section location-input">
      <div class="location-row">
        <label class="label">小站纬度</label>
        <input 
          type="number" 
          v-model="latitude" 
          placeholder="例如: 30.00" 
          class="input"
        />
      </div>
      <div class="location-row">
        <label class="label">小站经度</label>
        <input 
          type="number" 
          v-model="longitude" 
          placeholder="例如: 120.00" 
          class="input"
        />
      </div>
      <button @click="getLocation" class="location-button enhanced-button">获取位置</button>
    </div>

    <button @click="handleCalculate" class="calculate-button enhanced-button">计算参数</button>

    <div class="output-section">
      <div class="output-header">
        <h2 class="output-title">计算结果</h2>
      </div>
      <div class="output-item">
        <span class="output-label">轨道经度：</span>
        <span class="output-text">{{ orbitalLongitude }}</span>
      </div>
      <div class="output-item">
        <span class="output-label">俯仰角：</span>
        <span class="output-text">{{ elevation }}</span>
      </div>
      <div class="output-item">
        <span class="output-label">方位角：</span>
        <span class="output-text">{{ azimuth }}</span>
      </div>
      <div class="output-item">
        <span class="output-label">极化角：</span>
        <span class="output-text">{{ polarization }}</span>
      </div>
    </div>

    <div class="map-section">
      <div class="map-header">
        <h2 class="map-title">位置及天线方位</h2>
      </div>
      <div class="map-wrapper">
        <MapView 
          :latitude="latitude" 
          :longitude="longitude" 
          :azimuth="azimuthValue"
        />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { satelliteData, calculateParameters } from './utils/calculate';
import MapView from './components/MapView.vue';

const satelliteNames = Object.keys(satelliteData);
const selectedSatelliteName = ref(satelliteNames[0]);
const latitude = ref('');
const longitude = ref('');
const orbitalLongitude = ref('');
const elevation = ref('');
const azimuth = ref('');
const polarization = ref('');
const azimuthValue = ref(0);

// 主题管理
const isDarkTheme = ref(false);

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDarkTheme.value = true;
  } else if (savedTheme === 'light') {
    isDarkTheme.value = false;
  } else {
    // 检测系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkTheme.value = prefersDark;
  }
});

// 切换主题
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
  localStorage.setItem('theme', isDarkTheme.value ? 'dark' : 'light');
};

const getLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitude.value = position.coords.latitude.toFixed(2);
        longitude.value = position.coords.longitude.toFixed(2);
        alert('位置获取成功！');
      },
      (error) => {
        console.error("Error getting location:", error);
        alert('获取位置失败，请手动输入');
      }
    );
  } else {
    alert('您的浏览器不支持地理定位');
  }
};

const handleCalculate = () => {
  const result = calculateParameters(
    selectedSatelliteName.value,
    parseFloat(latitude.value),
    parseFloat(longitude.value)
  );

  if (result) {
    orbitalLongitude.value = result.orbitalLongitude;
    elevation.value = result.elevation;
    azimuth.value = result.azimuth;
    polarization.value = result.polarization;
    azimuthValue.value = result.azimuthValue;
  } else {
    alert('请输入有效的经纬度并选择卫星');
  }
};
</script>

<style scoped>
/* 全屏背景容器 */
.app-wrapper {
  min-height: 100vh;
  background-color: #ffffff;
  color: #333;
  transition: background-color 0.3s ease, color 0.3s ease;
  padding: 20px 0;
}

.container {
  font-family: sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

/* 主题切换按钮 */
.theme-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: 2px solid #ddd;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  transform: translateY(-50%) scale(1.1);
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.input-section {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.location-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  width: 100px;
  font-weight: bold;
  transition: color 0.3s ease;
}

.picker-view, .input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  background-color: #ffffff;
  color: #333;
  transition: all 0.3s ease;
}

.picker-view:focus, .input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.enhanced-button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

.enhanced-button:hover {
  background-color: #0056b3;
}

.location-button {
  background-color: #28a745;
  margin-top: 5px;
  margin-bottom: 10px;
}

.location-button:hover {
  background-color: #218838;
}

.output-section {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  background-color: #ffffff;
  transition: all 0.3s ease;
}

.output-header, .map-header {
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
  transition: border-color 0.3s ease;
}

.output-title, .map-title {
  font-size: 18px;
  color: #333;
  margin: 0;
  transition: color 0.3s ease;
}

.output-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.output-label {
  color: #666;
  transition: color 0.3s ease;
}

.output-text {
  font-weight: bold;
  color: #333;
  transition: color 0.3s ease;
}

.map-section {
  margin-top: 20px;
}

.map-wrapper {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ccc;
  transition: border-color 0.3s ease;
}

/* ========== 暗主题样式 ========== */
.app-wrapper.dark-theme {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

.dark-theme .title {
  color: #e0e0e0;
}

.dark-theme .theme-toggle {
  border-color: #444;
  background-color: #2a2a2a;
}

.dark-theme .theme-toggle:hover {
  border-color: #007bff;
  background-color: #333;
}

.dark-theme .input-section {
  background-color: #2a2a2a;
}

.dark-theme .label {
  color: #e0e0e0;
}

/* 重点：暗主题下输入框和选择框的文本为白色 */
.dark-theme .picker-view,
.dark-theme .input {
  background-color: #333;
  color: #ffffff;
  border-color: #555;
}

.dark-theme .picker-view option {
  background-color: #333;
  color: #ffffff;
}

.dark-theme .picker-view:focus,
.dark-theme .input:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}

/* 占位符文本在暗主题下也要可见 */
.dark-theme .input::placeholder {
  color: #999;
  opacity: 1;
}

.dark-theme .enhanced-button {
  background-color: #0d6efd;
}

.dark-theme .enhanced-button:hover {
  background-color: #0b5ed7;
}

.dark-theme .location-button {
  background-color: #198754;
}

.dark-theme .location-button:hover {
  background-color: #157347;
}

.dark-theme .output-section {
  background-color: #2a2a2a;
  border-color: #444;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.dark-theme .output-header,
.dark-theme .map-header {
  border-bottom-color: #444;
}

.dark-theme .output-title,
.dark-theme .map-title {
  color: #e0e0e0;
}

.dark-theme .output-label {
  color: #aaa;
}

.dark-theme .output-text {
  color: #e0e0e0;
}

.dark-theme .map-wrapper {
  border-color: #555;
}
</style>

<style>
/* 确保应用容器占满整个视口 */
#app {
  margin: 0;
  padding: 0;
}
</style>
