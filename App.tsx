import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import apiService from './src/services/api';
import deviceStorage from './src/services/deviceStorage';
import WiFiSetupScreen from './src/screens/setup/WiFiSetupScreen';


// Auth Screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import ConfirmEmailScreen from './src/screens/auth/ConfirmEmailScreen';

// Activation Screens
import AddDeviceScreen from './src/screens/activation/AddDeviceScreen';

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  gold: '#c9a227',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
  green: '#4ade80',
  red: '#ff6b6b',
  teal: '#4ecdc4',
  orange: '#f59e0b',
};

type SensorCardProps = {
  title: string;
  value: string;
  unit: string;
  status: string;
  statusColor: string;
  color: string;
  range: string;
};

const SensorCard = ({title, value, unit, status, statusColor, color, range}: SensorCardProps) => (
  <View style={styles.card}>
    <View style={[styles.cardAccent, {backgroundColor: color}]} />
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={[styles.cardValue, {color}]}>{value}</Text>
    <Text style={styles.cardUnit}>{unit}</Text>
    <View style={styles.cardFooter}>
      <Text style={[styles.cardStatus, {color: statusColor}]}>● {status}</Text>
      <Text style={styles.cardRange}>{range}</Text>
    </View>
  </View>
);

const DeviceCard = ({device, isSelected, onPress}: any) => {
  const statusColors: any = {
    online: COLORS.green,
    pending_wifi: COLORS.orange,
    offline: COLORS.red,
  };
  const statusLabels: any = {
    online: 'Online',
    pending_wifi: 'Setup Required',
    offline: 'Offline',
  };
  
  return (
    <TouchableOpacity 
      style={[styles.deviceCard, isSelected && styles.deviceCardSelected]}
      onPress={onPress}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{device.name || 'My AquariSense'}</Text>
        <Text style={styles.deviceSerial}>{device.serialNumber}</Text>
      </View>
      <View style={styles.deviceStatus}>
        <View style={[styles.statusDot, {backgroundColor: statusColors[device.status] || COLORS.textMuted}]} />
        <Text style={[styles.statusText, {color: statusColors[device.status] || COLORS.textMuted}]}>
          {statusLabels[device.status] || device.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({onAddDevice}: {onAddDevice: () => void}) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>🐠</Text>
    <Text style={styles.emptyTitle}>No Devices Yet</Text>
    <Text style={styles.emptySubtitle}>Add your AquariSense to start monitoring</Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onAddDevice}>
      <Text style={styles.emptyButtonText}>+ Add Your First Device</Text>
    </TouchableOpacity>
  </View>
);

const getStatus = (type: string, value: number) => {
  const ranges: {[key: string]: [number, number]} = {
    temp: [24, 28],
    tds: [150, 400],
    turb: [0, 50],
  };
  const [min, max] = ranges[type] || [0, 100];
  
  if (value >= min && value <= max) {
    return {status: 'Optimal', color: COLORS.green};
  } else if (value < min * 0.7 || value > max * 1.3) {
    return {status: 'Alert!', color: COLORS.red};
  }
  return {status: 'Warning', color: COLORS.gold};
};

// TEST MODE: Set to true to bypass backend API
const TEST_MODE = false;

// Dashboard Screen
const DashboardScreen = ({navigation, route}: any) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [sensorData, setSensorData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {user, signOut} = useAuth();

  // Load saved devices from storage on mount
  useEffect(() => {
    const loadSavedDevices = async () => {
      const savedDevices = await deviceStorage.loadDevices();
      if (savedDevices.length > 0) {
        setDevices(savedDevices);
        setSelectedDevice(savedDevices[0]);
      }
      setLoadingDevices(false);
    };

    // If coming from WiFi setup, add the new device
    if (route.params?.deviceConnected && route.params?.serialNumber) {
      console.log('Device connected from WiFi setup:', route.params.serialNumber);
      const newDevice = {
        serialNumber: route.params.serialNumber,
        name: 'My AquariSense',
        status: 'online',
      };
      // Save to storage and update state
      deviceStorage.addDevice(newDevice).then(allDevices => {
        setDevices(allDevices);
        setSelectedDevice(newDevice);
        setLoadingDevices(false);
      });
    } else {
      // No new device, just load from storage
      loadSavedDevices();
    }
  }, []); // Empty deps - only run on mount

  const fetchDevices = useCallback(async () => {
    if (!user?.sub) return;

    // TEST MODE: Load from local storage instead of API
    if (TEST_MODE) {
      const savedDevices = await deviceStorage.loadDevices();
      if (savedDevices.length > 0 && devices.length === 0) {
        setDevices(savedDevices);
        setSelectedDevice(savedDevices[0]);
      }
      setLoadingDevices(false);
      return;
    }

    try {
      const userDevices = await apiService.getUserDevices(user.sub);
      setDevices(userDevices);
      if (userDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(userDevices[0]);
      }
      setError(null);
    } catch (e) {
      console.error('Failed to fetch devices:', e);
      setError('Failed to load devices');
    } finally {
      setLoadingDevices(false);
    }
  }, [user?.sub, selectedDevice, devices.length]);

  const fetchSensorData = useCallback(async () => {
    if (!selectedDevice || selectedDevice.status !== 'online') {
      setSensorData(null);
      return;
    }
    try {
      const data = await apiService.getLatestReadings();
      setSensorData(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      console.error('Failed to fetch sensor data:', e);
    }
  }, [selectedDevice]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDevices();
    await fetchSensorData();
    setRefreshing(false);
  };

  useEffect(() => {
    // Skip if we got device from route params
    if (!route.params?.deviceConnected) {
      fetchDevices();
    }
  }, [fetchDevices, route.params?.deviceConnected]);

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000);
    return () => clearInterval(interval);
  }, [fetchSensorData]);

  // Re-fetch devices when returning from AddDevice screen (but not after WiFi setup)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Don't fetch if we just came from WiFi setup with a connected device
      if (!route.params?.deviceConnected) {
        fetchDevices();
      }
    });
    return unsubscribe;
  }, [navigation, fetchDevices, route.params?.deviceConnected]);

  const temp = sensorData?.temperature;
  const tds = sensorData?.tds;
  const turb = sensorData?.turbidity;

  const tempStatus = temp != null ? getStatus('temp', temp) : {status: 'Loading', color: COLORS.textMuted};
  const tdsStatus = tds != null ? getStatus('tds', tds) : {status: 'Loading', color: COLORS.textMuted};
  const turbStatus = turb != null ? getStatus('turb', turb) : {status: 'Loading', color: COLORS.textMuted};

  if (loadingDevices) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.teal} />
        <Text style={styles.loadingText}>Loading your devices...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐠 AquariSense</Text>
          <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome message */}
        <View style={styles.welcomeBar}>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {devices.length === 0 ? (
          <EmptyState onAddDevice={() => navigation.navigate('AddDevice')} />
        ) : (
          <>
            {/* Device List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Devices</Text>
              {devices.map((device) => (
                <DeviceCard
                  key={device.serialNumber}
                  device={device}
                  isSelected={selectedDevice?.serialNumber === device.serialNumber}
                  onPress={() => setSelectedDevice(device)}
                />
              ))}
              <TouchableOpacity 
                style={styles.addDeviceButton}
                onPress={() => navigation.navigate('AddDevice')}
              >
                <Text style={styles.addDeviceText}>+ Add Another Device</Text>
              </TouchableOpacity>
            </View>

            {/* Sensor Data for Selected Device */}
            {selectedDevice && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {selectedDevice.name || 'My AquariSense'}
                </Text>
                
                {selectedDevice.status === 'pending_wifi' ? (
                  <View style={styles.setupRequired}>
                    <Text style={styles.setupIcon}>📶</Text>
                    <Text style={styles.setupTitle}>WiFi Setup Required</Text>
                    <Text style={styles.setupText}>
                      Connect your device to WiFi to start monitoring
                    </Text>
                    <TouchableOpacity style={styles.setupButton} onPress={() => navigation.navigate('WiFiSetup', { device: selectedDevice })}>
                      <Text style={styles.setupButtonText}>Setup WiFi</Text>
                    </TouchableOpacity>
                  </View>
                ) : selectedDevice.status === 'online' ? (
                  <View style={styles.cardsContainer}>
                    <SensorCard
                      title="TEMPERATURE"
                      value={temp != null ? temp.toFixed(1) : '--'}
                      unit="°C"
                      status={tempStatus.status}
                      statusColor={tempStatus.color}
                      color={COLORS.red}
                      range="24-28 °C"
                    />
                    <SensorCard
                      title="TDS"
                      value={tds != null ? Math.round(tds).toString() : '--'}
                      unit="ppm"
                      status={tdsStatus.status}
                      statusColor={tdsStatus.color}
                      color={COLORS.teal}
                      range="150-400 ppm"
                    />
                    <SensorCard
                      title="TURBIDITY"
                      value={turb != null ? Math.round(turb).toString() : '--'}
                      unit="NTU"
                      status={turbStatus.status}
                      statusColor={turbStatus.color}
                      color={COLORS.gold}
                      range="0-50 NTU"
                    />
                  </View>
                ) : (
                  <View style={styles.offlineState}>
                    <Text style={styles.offlineIcon}>📡</Text>
                    <Text style={styles.offlineTitle}>Device Offline</Text>
                    <Text style={styles.offlineText}>
                      Check that your device is powered on and connected to WiFi
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Footer */}
            {selectedDevice?.status === 'online' && (
              <View style={styles.footer}>
                <Text style={styles.lastUpdate}>Last update: {lastUpdate}</Text>
                <Text style={styles.deviceId}>{sensorData?.device_id || ''}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddDevice" component={AddDeviceScreen} />
      <Stack.Screen name="WiFiSetup" component={WiFiSetupScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.logo}>🐠 AquariSense</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: COLORS.teal,
    fontSize: 14,
  },
  welcomeBar: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: COLORS.red,
    padding: 10,
    marginHorizontal: 15,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 12,
  },
  deviceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.teal,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  deviceSerial: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  cardsContainer: {
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  cardAccent: {
    height: 4,
    borderRadius: 2,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  cardUnit: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3a4a5a',
    paddingTop: 10,
  },
  cardStatus: {
    fontSize: 14,
  },
  cardRange: {
    fontSize: 12,
    color: '#5a6a7a',
  },
  addDeviceButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addDeviceText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#3a4a5a',
  },
  lastUpdate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  deviceId: {
    fontSize: 10,
    color: '#5a6a7a',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  setupRequired: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  setupIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  setupText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: COLORS.orange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  setupButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  offlineState: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  offlineIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});