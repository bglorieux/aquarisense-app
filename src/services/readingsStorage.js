import AsyncStorage from '@react-native-async-storage/async-storage';

const READINGS_KEY = '@aquarisense_readings_history';
const MAX_READINGS = 288; // Store up to 24 hours at 5-min intervals

class ReadingsStorage {
  constructor() {
    this.cache = [];
    this.loaded = false;
  }

  async loadReadings() {
    if (this.loaded) return this.cache;

    try {
      const data = await AsyncStorage.getItem(READINGS_KEY);
      if (data) {
        this.cache = JSON.parse(data);
        console.log('Loaded', this.cache.length, 'historical readings');
      }
      this.loaded = true;
    } catch (e) {
      console.error('Failed to load readings history:', e);
      this.loaded = true;
    }
    return this.cache;
  }

  async addReading(reading) {
    if (!reading || reading.temperature == null) return;

    const entry = {
      timestamp: new Date().toISOString(),
      temperature: reading.temperature,
      tds: reading.tds,
      turbidity: reading.turbidity,
      device_id: reading.device_id,
    };

    // Load if not already loaded
    if (!this.loaded) {
      await this.loadReadings();
    }

    // Add new reading
    this.cache.push(entry);

    // Trim to max size (keep most recent)
    if (this.cache.length > MAX_READINGS) {
      this.cache = this.cache.slice(-MAX_READINGS);
    }

    // Persist async
    this.saveReadings();

    return entry;
  }

  async saveReadings() {
    try {
      await AsyncStorage.setItem(READINGS_KEY, JSON.stringify(this.cache));
    } catch (e) {
      console.error('Failed to save readings history:', e);
    }
  }

  async getReadings(hours = 24) {
    if (!this.loaded) {
      await this.loadReadings();
    }

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.cache.filter(r => new Date(r.timestamp) >= cutoff);
  }

  async clearReadings() {
    this.cache = [];
    try {
      await AsyncStorage.removeItem(READINGS_KEY);
    } catch (e) {
      console.error('Failed to clear readings history:', e);
    }
  }
}

export default new ReadingsStorage();
