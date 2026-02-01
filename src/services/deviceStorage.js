import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICES_KEY = '@aquarisense_devices';

class DeviceStorage {
  async saveDevices(devices) {
    try {
      await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
      console.log('Devices saved to storage:', devices.length);
    } catch (e) {
      console.error('Failed to save devices:', e);
    }
  }

  async loadDevices() {
    try {
      const data = await AsyncStorage.getItem(DEVICES_KEY);
      if (data) {
        const devices = JSON.parse(data);
        console.log('Devices loaded from storage:', devices.length);
        return devices;
      }
      return [];
    } catch (e) {
      console.error('Failed to load devices:', e);
      return [];
    }
  }

  async addDevice(device) {
    const devices = await this.loadDevices();
    // Check if device already exists
    const existingIndex = devices.findIndex(d => d.serialNumber === device.serialNumber);
    if (existingIndex >= 0) {
      // Update existing device
      devices[existingIndex] = device;
    } else {
      // Add new device
      devices.push(device);
    }
    await this.saveDevices(devices);
    return devices;
  }

  async removeDevice(serialNumber) {
    const devices = await this.loadDevices();
    const filtered = devices.filter(d => d.serialNumber !== serialNumber);
    await this.saveDevices(filtered);
    return filtered;
  }

  async clearDevices() {
    try {
      await AsyncStorage.removeItem(DEVICES_KEY);
      console.log('Devices cleared from storage');
    } catch (e) {
      console.error('Failed to clear devices:', e);
    }
  }
}

export default new DeviceStorage();
