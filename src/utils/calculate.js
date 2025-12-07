export const satelliteData = {
  "Apstar-5C（Telstar 18 Vantage）": "138.0E",
  "EutelSat-172B": "172.0E",
  "Apstar-6D-Beam8": "134.5E",
  "Apstar-6D-Beam2": "134.1E",
  "Apstar-6C": "134.0E",
  "Apstar-9": "142.0E",
  "Apstar-7": "76.5E",
  "AsiaSat-9": "122.0E",
  "AsiaSat-7": "105.5E",
  "ChinaSat-16（圆极化）": "110.5E",
  "ChinaSat-26（圆极化）": "125.0E"
};

export function calculateParameters(selectedSatellite, earthStationLatitude, earthStationLongitude) {
    const orbitalLongitudeString = satelliteData[selectedSatellite];

    if (isNaN(earthStationLatitude) || isNaN(earthStationLongitude) || !orbitalLongitudeString) {
        return null;
    }

    const orbitalLongitudeDirection = orbitalLongitudeString.slice(-1); // 'E' or 'W'
    let orbitalLongitudeValue = parseFloat(orbitalLongitudeString.slice(0, -1));
    if (orbitalLongitudeDirection === 'W') {
        orbitalLongitudeValue = -orbitalLongitudeValue; // 西经为负值
    }

    // 将经纬度转换为弧度
    const phi_e = earthStationLatitude * Math.PI / 180;
    const lambda_e = earthStationLongitude * Math.PI / 180;
    const lambda_s = orbitalLongitudeValue * Math.PI / 180;

    // 地球半径 (km)
    const R = 6371;
    // 地球静止轨道高度 (km)
    const H = 35786;

    // 计算地心角 cos(Δθ)
    const cos_delta_theta = Math.cos(phi_e) * Math.cos(lambda_s - lambda_e);

    // 计算俯仰角 (弧度)
    let elevation_rad = Math.atan((cos_delta_theta - R / (R + H)) / Math.sqrt(1 - cos_delta_theta * cos_delta_theta));
    if (isNaN(elevation_rad)) {
        elevation_rad = Math.PI / 2;
    }
    const elevation_deg = elevation_rad * 180 / Math.PI;

    // 计算方位角 (弧度)
    let azimuth_rad = Math.atan2(Math.sin(lambda_s - lambda_e), Math.cos(phi_e) * Math.tan(0) - Math.sin(phi_e) * Math.cos(lambda_s - lambda_e));
    if (isNaN(azimuth_rad)) {
        azimuth_rad = 0;
    }
    let azimuth_deg = azimuth_rad * 180 / Math.PI;
    if (azimuth_deg < 0) {
        azimuth_deg += 360;
    }

    // 计算极化角 (弧度)
    let polarization_rad = Math.atan(Math.sin(lambda_s - lambda_e) / Math.tan(phi_e));
    if (isNaN(polarization_rad)) {
        polarization_rad = 0;
    }
    const polarization_deg = polarization_rad * 180 / Math.PI;

    return {
        orbitalLongitude: orbitalLongitudeString,
        elevation: elevation_deg.toFixed(2) + '°',
        azimuth: azimuth_deg.toFixed(2) + '°',
        polarization: polarization_deg.toFixed(2) + '°',
        azimuthValue: azimuth_deg
    };
}
