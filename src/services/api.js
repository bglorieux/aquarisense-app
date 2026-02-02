import awsConfig from '../config/aws';

class ApiService {
  setToken(token) {
    this.token = token;
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async linkDevice(serialNumber, userId) {
    const url = awsConfig.API.devices + '/devices/link';
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        serialNumber,
        userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to link device');
    }

    return data;
  }

  async getUserDevices(userId) {
    const url = awsConfig.API.devices + '/devices?userId=' + encodeURIComponent(userId);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get devices');
    }

    return data.devices || [];
  }

  async getLatestReadings() {
    const response = await fetch(awsConfig.API.readings, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get readings');
    }

    return data;
  }

  async getHistoricalReadings(deviceId, hours = 24) {
    // Calculate time range
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const url = `${awsConfig.API.readings}?deviceId=${encodeURIComponent(deviceId)}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get historical readings');
      }

      return data.readings || data;
    } catch (error) {
      console.log('Historical API not available, using local data:', error.message);
      return null; // Signal to use local accumulation
    }
  }
}

export default new ApiService();