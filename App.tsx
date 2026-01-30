import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';

const API_URL = 'https://0i944omjwf.execute-api.eu-central-1.amazonaws.com/readings';

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  gold: '#c9a227',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
  green: '#4ade80',
  red: '#ff6b6b',
  teal: '#4ecdc4',
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

const App = () => {
  const [sensorData, setSensorData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setSensorData(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError('Failed to fetch data');
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const temp = sensorData?.temperature;
  const tds = sensorData?.tds;
  const turb = sensorData?.turbidity;

  const tempStatus = temp != null ? getStatus('temp', temp) : {status: 'Loading', color: COLORS.textMuted};
  const tdsStatus = tds != null ? getStatus('tds', tds) : {status: 'Loading', color: COLORS.textMuted};
  const turbStatus = turb != null ? getStatus('turb', turb) : {status: 'Loading', color: COLORS.textMuted};

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
          <View style={styles.headerRight}>
            <Text style={[styles.cloudStatus, {color: sensorData ? COLORS.green : COLORS.red}]}>
              ☁ {sensorData ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Sensor Cards */}
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.lastUpdate}>Last update: {lastUpdate}</Text>
          <Text style={styles.deviceId}>{sensorData?.device_id || ''}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cloudStatus: {
    fontSize: 14,
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
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
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
});

export default App;
