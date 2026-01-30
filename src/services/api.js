import awsConfig from '../config/aws';

class ApiService {
  // Link a device to the current user
  async linkDevice(serialNumber, userId) {
    const response = await fetch(`${awsConfig.API.devices}/devices/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  // Get all devices for a user
  async getUserDevices(userId) {
    const response = await fetch(
      `${awsConfig.API.devices}/devices?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get devices');
    }
    
    return data.devices || [];
  }

  // Get latest sensor readings (uses your existing API)
  async getLatestReadings() {
    const response = await fetch(awsConfig.API.readings, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get readings');
    }
    
    return data;
  }
}

export default new ApiService();
