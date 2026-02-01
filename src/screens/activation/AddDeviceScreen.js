import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BleManager } from 'react-native-ble-plx';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

// Helper to parse JSON from BLE characteristic
const parseDeviceId = (base64Value) => {
  try {
    const decoded = atob(base64Value);
    const json = JSON.parse(decoded);
    return json.id;
  } catch (e) {
    // Fallback: try URL decoding
    const decoded = decodeURIComponent(
      atob(base64Value)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const json = JSON.parse(decoded);
    return json.id;
  }
};

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  teal: '#4ecdc4',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
};

// AquariSense BLE UUIDs
const AQUARISENSE_SERVICE_UUID = '67fdd12e-9cd6-44b7-8be9-c2570df58644';
const DEVICE_ID_UUID = '38020776-89ec-4de7-ae14-89c6e988f720';

const bleManager = new BleManager();

export default function AddDeviceScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connecting, setConnecting] = useState(null);
  const { user, getToken } = useAuth();

  useEffect(() => {
    requestPermissions();
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const startScan = () => {
    setDevices([]);
    setScanning(true);

    // Scan for all devices, filter by name (more reliable on iOS)
    bleManager.startDeviceScan(
      null,  // No UUID filter - scan all devices
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.log('Scan error:', error);
          setScanning(false);
          return;
        }

        // Filter by name containing "aquarisense" (case-insensitive)
        if (device && device.name?.toLowerCase().includes('aquarisense')) {
          console.log('Found AquariSense device:', device.name, device.id);
          setDevices(prev => {
            if (prev.find(d => d.id === device.id)) return prev;
            return [...prev, device];
          });
        }
      }
    );

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const connectToDevice = async (device) => {
    setConnecting(device.id);
    bleManager.stopDeviceScan();

    try {
      // Connect to device
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Read serial number
      const characteristic = await connectedDevice.readCharacteristicForService(
        AQUARISENSE_SERVICE_UUID,
        DEVICE_ID_UUID
      );

      // Parse the device ID from JSON response
      const serialNumber = parseDeviceId(characteristic.value);
      console.log('Device serial:', serialNumber);

      // Link device to user (skip if backend not ready)
      try {
        const token = await getToken();
        apiService.setToken(token);
        await apiService.linkDevice(serialNumber, user.sub);
        console.log('Device linked successfully');
      } catch (apiError) {
        // API not ready - continue anyway for testing
        console.log('API link skipped (backend not ready):', apiError.message);
      }

      // Navigate to WiFi setup
      navigation.replace('WiFiSetup', {
        device: connectedDevice,
        serialNumber
      });

    } catch (error) {
      console.log('Connection error:', error);
      Alert.alert('Connection Failed', 'Could not connect to device. Please try again.');
      setConnecting(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Your Device</Text>
          <Text style={styles.subtitle}>
            Make sure your AquariSense is powered on and nearby
          </Text>
        </View>

        <View style={styles.scanSection}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={startScan}
            disabled={scanning}
          >
            <LinearGradient
              colors={[COLORS.teal, '#00b4d8']}
              start={{x:0,y:0}}
              end={{x:1,y:0}}
              style={styles.gradientButton}
            >
              {scanning ? (
                <>
                  <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.scanButtonText}>Scanning...</Text>
                </>
              ) : (
                <Text style={styles.scanButtonText}>Scan for Devices</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.deviceList}>
          <Text style={styles.listTitle}>
            {devices.length > 0 ? 'Found Devices' : scanning ? 'Looking for devices...' : 'Tap scan to find your device'}
          </Text>

          {devices.map(device => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceCard}
              onPress={() => connectToDevice(device)}
              disabled={connecting !== null}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name || 'AquariSense'}</Text>
                <Text style={styles.deviceId}>{device.id}</Text>
              </View>
              {connecting === device.id ? (
                <ActivityIndicator color={COLORS.teal} />
              ) : (
                <Text style={styles.connectText}>Connect →</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Don't see your device?</Text>
          <Text style={styles.helpText}>
            • Make sure it's plugged in{'\n'}
            • Move closer to the device{'\n'}
            • Check that Bluetooth is enabled
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark, paddingTop: 60 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 25, paddingBottom: 40 },
  header: { marginBottom: 30 },
  backButton: { marginBottom: 20 },
  backText: { color: COLORS.teal, fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textMuted, lineHeight: 22 },
  scanSection: { marginBottom: 30 },
  scanButton: { width: '100%', height: 54, borderRadius: 12, overflow: 'hidden' },
  gradientButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  deviceList: { flex: 1, marginBottom: 20 },
  listTitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: 15 },
  deviceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfo: { flex: 1 },
  deviceName: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 4 },
  deviceId: { color: COLORS.textMuted, fontSize: 12 },
  connectText: { color: COLORS.teal, fontSize: 15, fontWeight: '600' },
  helpBox: { backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 12, padding: 18 },
  helpTitle: { color: COLORS.teal, fontSize: 15, fontWeight: '600', marginBottom: 10 },
  helpText: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22 },
});
