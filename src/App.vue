<template>
  <div class="container">
    <header class="header">
      <h1 class="title">卫星天线参数计算器</h1>
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
</template>

<script setup>
import { ref } from 'vue';
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
.container {
  font-family: sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.input-section {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.location-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  width: 100px;
  font-weight: bold;
}

.picker-view, .input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px; /* Prevent zoom on mobile */
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
}

.output-header, .map-header {
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.output-title, .map-title {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.output-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.output-label {
  color: #666;
}

.output-text {
  font-weight: bold;
  color: #333;
}

.map-section {
  margin-top: 20px;
}

.map-wrapper {
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ccc;
}
</style>
