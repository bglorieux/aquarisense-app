import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  teal: '#4ecdc4',
  gold: '#c9a227',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
  green: '#4ade80',
  orange: '#f59e0b',
  red: '#ff6b6b',
};

// Production BLE UUIDs - same on all AquariSense devices
const AQUARISENSE_SERVICE_UUID = '67fdd12e-9cd6-44b7-8be9-c2570df58644';
const DEVICE_ID_UUID = '38020776-89ec-4de7-ae14-89c6e988f720';
const DEVICE_NAME_UUID = '2c7f018a-ad6f-4d01-89bb-ec0259a70587';
const WIFI_NETWORKS_UUID = 'cdad060e-80fb-4958-921d-0fd896a4eac6';
const WIFI_CREDENTIALS_UUID = '9f330499-a7d3-49d3-9243-7f9d09f7d37d';
const WIFI_STATUS_UUID = '1605ae78-0793-4cab-90d1-32290901e0c2';

const bleManager = new BleManager();

export default function WiFiSetupScreen({ navigation, route }) {
  const { device: linkedDevice } = route.params || {};
  
  const [step, setStep] = useState('init');
  const [bleDevice, setBleDevice] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('WiFiSetupScreen mounted');
    
    const subscription = bleManager.onStateChange((state) => {
      console.log('BLE state changed:', state);
      if (state === 'PoweredOn') {
        console.log('Bluetooth is ready');
        startScanning();
      }
    }, true);

    return () => {
      console.log('Cleaning up...');
      subscription.remove();
      bleManager.stopDeviceScan();
    };
  }, []);

  const startScanning = () => {
    console.log('=== Starting BLE scan ===');
    setStep('scanning');
    setError(null);

    bleManager.startDeviceScan(null, null, (err, device) => {
      if (err) {
        console.error('Scan error:', err.message);
        setError('Scan failed: ' + err.message);
        return;
      }

      if (device) {
        const name = device.name || device.localName || '';
        if (name) {
          console.log('Found:', name, '| ID:', device.id);
        }
        
        if (name.toLowerCase().includes('aquarisense')) {
          console.log('*** Found AquariSense device! ***');
          bleManager.stopDeviceScan();
          connectToDevice(device);
        }
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      console.log('Scan timeout');
    }, 30000);
  };

  const connectToDevice = async (device) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Connecting to', device.name || device.id);
      
      const connected = await device.connect();
      console.log('Connected, discovering services...');
      
      await connected.discoverAllServicesAndCharacteristics();
      console.log('Services discovered');
      
      setBleDevice(connected);
      await fetchNetworks(connected);
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect: ' + err.message);
      setLoading(false);
      setStep('scanning');
    }
  };

  const fetchNetworks = async (device) => {
    try {
      setLoading(true);
      console.log('Reading WiFi networks...');
      
      const characteristic = await device.readCharacteristicForService(
        AQUARISENSE_SERVICE_UUID,
        WIFI_NETWORKS_UUID
      );
      
      const decoded = atob(characteristic.value);
      console.log('Networks raw:', decoded);
      const networkList = JSON.parse(decoded);
      console.log('Parsed networks:', networkList);
      
      setNetworks(networkList);
      setStep('networks');
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch networks:', err);
      setError('Failed to scan WiFi: ' + err.message);
      setLoading(false);
    }
  };

  const selectNetwork = (network) => {
    setSelectedNetwork(network);
    setStep('password');
  };

  const connectToWiFi = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter the WiFi password');
      return;
    }

    try {
      setLoading(true);
      setStep('connecting');
      setError(null);

      const credentials = JSON.stringify({
        ssid: selectedNetwork.ssid,
        password: password,
      });

      const encoded = btoa(credentials);
      
      await bleDevice.writeCharacteristicWithResponseForService(
        AQUARISENSE_SERVICE_UUID,
        WIFI_CREDENTIALS_UUID,
        encoded
      );

      console.log('Credentials sent');

      let attempts = 0;
      const checkStatus = async () => {
        try {
          const statusChar = await bleDevice.readCharacteristicForService(
            AQUARISENSE_SERVICE_UUID,
            WIFI_STATUS_UUID
          );
          const decoded = atob(statusChar.value);
          const status = JSON.parse(decoded);
          console.log('Status:', status);

          if (status.status === 'connected') {
            setStep('done');
            setLoading(false);
            return;
          } else if (status.status === 'failed') {
            setError('WiFi connection failed. Check password.');
            setStep('password');
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Status error:', e);
        }

        attempts++;
        if (attempts < 30) {
          setTimeout(checkStatus, 2000);
        } else {
          setError('Connection timed out');
          setStep('password');
          setLoading(false);
        }
      };

      setTimeout(checkStatus, 3000);
    } catch (err) {
      console.error('WiFi error:', err);
      setError('Failed to send credentials: ' + err.message);
      setStep('password');
      setLoading(false);
    }
  };

  const renderInit = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={COLORS.teal} />
      <Text style={styles.stepTitle}>Initializing Bluetooth...</Text>
    </View>
  );

  const renderScanning = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={COLORS.teal} />
      <Text style={styles.stepTitle}>Searching for AquariSense...</Text>
      <Text style={styles.stepSubtitle}>Make sure it is powered on and nearby</Text>
      {error && <Text style={styles.errorInline}>{error}</Text>}
      <TouchableOpacity style={styles.retryButton} onPress={startScanning}>
        <Text style={styles.retryText}>Retry Scan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNetworks = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Select WiFi network</Text>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.teal} style={{marginTop: 40}} />
      ) : (
        <>
          <FlatList
            data={networks}
            keyExtractor={(item, index) => item.ssid + index}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.networkItem} onPress={() => selectNetwork(item)}>
                <Text style={styles.networkName}>{item.ssid}</Text>
                <Text style={styles.networkSignal}>
                  {item.signal > -50 ? '●●●' : item.signal > -70 ? '●●○' : '●○○'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No networks found</Text>}
            style={styles.networkList}
          />
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchNetworks(bleDevice)}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderPassword = () => (
    <View style={styles.content}>
      <Text style={styles.stepTitle}>Enter WiFi password</Text>
      <Text style={styles.networkSelected}>{selectedNetwork?.ssid}</Text>
      <TextInput
        style={styles.passwordInput}
        placeholder="Password"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoFocus
      />
      <TouchableOpacity style={styles.connectButton} onPress={connectToWiFi}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backLink} onPress={() => setStep('networks')}>
        <Text style={styles.backLinkText}>← Choose different network</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConnecting = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={COLORS.orange} />
      <Text style={styles.stepTitle}>Connecting to WiFi...</Text>
      <Text style={styles.stepSubtitle}>This may take a moment</Text>
    </View>
  );

  const renderDone = () => (
    <View style={styles.centerContent}>
      <Text style={styles.doneIcon}>✓</Text>
      <Text style={styles.stepTitle}>Connected!</Text>
      <Text style={styles.stepSubtitle}>Your AquariSense is online</Text>
      <TouchableOpacity style={styles.doneButton} onPress={() => {
        // Reset the navigation stack so Dashboard remounts with fresh params
        navigation.reset({
          index: 0,
          routes: [{
            name: 'Dashboard',
            params: {
              deviceConnected: true,
              serialNumber: route.params?.serialNumber || 'AQS-EU-M01-25-000001'
            }
          }],
        });
      }}>
        <Text style={styles.doneButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WiFi Setup</Text>
      </View>

      {error && step !== 'scanning' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'init' && renderInit()}
      {step === 'scanning' && renderScanning()}
      {step === 'networks' && renderNetworks()}
      {step === 'password' && renderPassword()}
      {step === 'connecting' && renderConnecting()}
      {step === 'done' && renderDone()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backText: {
    color: COLORS.teal,
    fontSize: 16,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  errorInline: {
    fontSize: 14,
    color: COLORS.red,
    textAlign: 'center',
    marginTop: 15,
  },
  retryButton: {
    marginTop: 30,
    padding: 15,
  },
  retryText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  networkList: {
    flex: 1,
    marginTop: 10,
  },
  networkItem: {
    backgroundColor: COLORS.bgCard,
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkName: {
    fontSize: 16,
    color: COLORS.textLight,
    flex: 1,
  },
  networkSignal: {
    fontSize: 14,
    color: COLORS.teal,
    marginLeft: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  refreshButton: {
    padding: 15,
    alignItems: 'center',
  },
  refreshText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  networkSelected: {
    fontSize: 18,
    color: COLORS.teal,
    marginBottom: 20,
  },
  passwordInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: COLORS.teal,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
  backLink: {
    padding: 15,
    alignItems: 'center',
  },
  backLinkText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  doneIcon: {
    fontSize: 64,
    color: COLORS.green,
  },
  doneButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 30,
  },
  doneButtonText: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: COLORS.red,
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  errorText: {
    color: COLORS.textLight,
    flex: 1,
  },
  errorDismiss: {
    color: COLORS.textLight,
    fontSize: 18,
    paddingLeft: 10,
  },
});
