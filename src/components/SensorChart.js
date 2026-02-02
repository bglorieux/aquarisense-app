import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Dimensions, TouchableOpacity} from 'react-native';
import {LineChart} from 'react-native-chart-kit';

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

const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: COLORS.red,
    decimals: 1,
  },
  tds: {
    label: 'TDS',
    unit: 'ppm',
    color: COLORS.teal,
    decimals: 0,
  },
  turbidity: {
    label: 'Turbidity',
    unit: 'NTU',
    color: COLORS.gold,
    decimals: 0,
  },
};

const TIME_RANGES = [
  {label: '1H', hours: 1},
  {label: '6H', hours: 6},
  {label: '24H', hours: 24},
];

const screenWidth = Dimensions.get('window').width;

export default function SensorChart({readings, loading}) {
  const [selectedSensor, setSelectedSensor] = useState('temperature');
  const [timeRange, setTimeRange] = useState(6); // Default 6 hours

  // Filter readings by time range
  const filteredReadings = React.useMemo(() => {
    if (!readings || readings.length === 0) return [];

    const cutoff = new Date(Date.now() - timeRange * 60 * 60 * 1000);
    return readings.filter(r => new Date(r.timestamp) >= cutoff);
  }, [readings, timeRange]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (filteredReadings.length === 0) {
      return null;
    }

    // Get sensor values and labels
    const config = SENSOR_CONFIG[selectedSensor];

    // Sample data points (max 12 points for readability)
    const maxPoints = 12;
    const step = Math.max(1, Math.floor(filteredReadings.length / maxPoints));
    const sampledReadings = filteredReadings.filter((_, i) => i % step === 0);

    // If we have more than maxPoints, take last maxPoints
    const displayReadings = sampledReadings.slice(-maxPoints);

    const values = displayReadings.map(r => {
      const val = r[selectedSensor];
      return val != null ? Number(val) : 0;
    });

    // Create time labels (HH:MM)
    const labels = displayReadings.map(r => {
      const date = new Date(r.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    // Show fewer labels for clarity
    const labelStep = Math.ceil(labels.length / 4);
    const displayLabels = labels.map((l, i) => (i % labelStep === 0 ? l : ''));

    return {
      labels: displayLabels,
      datasets: [
        {
          data: values,
          color: () => config.color,
          strokeWidth: 2,
        },
      ],
    };
  }, [filteredReadings, selectedSensor]);

  // Get stats
  const stats = React.useMemo(() => {
    if (filteredReadings.length === 0) return null;

    const values = filteredReadings
      .map(r => r[selectedSensor])
      .filter(v => v != null)
      .map(Number);

    if (values.length === 0) return null;

    const config = SENSOR_CONFIG[selectedSensor];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      min: min.toFixed(config.decimals),
      max: max.toFixed(config.decimals),
      avg: avg.toFixed(config.decimals),
    };
  }, [filteredReadings, selectedSensor]);

  const config = SENSOR_CONFIG[selectedSensor];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historical Data</Text>
        <Text style={styles.subtitle}>
          {filteredReadings.length} readings
        </Text>
      </View>

      {/* Sensor Selector */}
      <View style={styles.selectorRow}>
        {Object.keys(SENSOR_CONFIG).map(key => (
          <TouchableOpacity
            key={key}
            style={[
              styles.selectorButton,
              selectedSensor === key && {
                backgroundColor: SENSOR_CONFIG[key].color + '33',
                borderColor: SENSOR_CONFIG[key].color,
              },
            ]}
            onPress={() => setSelectedSensor(key)}
          >
            <Text
              style={[
                styles.selectorText,
                selectedSensor === key && {color: SENSOR_CONFIG[key].color},
              ]}
            >
              {SENSOR_CONFIG[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRow}>
        {TIME_RANGES.map(range => (
          <TouchableOpacity
            key={range.hours}
            style={[
              styles.timeButton,
              timeRange === range.hours && styles.timeButtonActive,
            ]}
            onPress={() => setTimeRange(range.hours)}
          >
            <Text
              style={[
                styles.timeText,
                timeRange === range.hours && styles.timeTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      {chartData && chartData.datasets[0].data.length > 1 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={screenWidth - 50}
            height={180}
            chartConfig={{
              backgroundColor: COLORS.bgCard,
              backgroundGradientFrom: COLORS.bgCard,
              backgroundGradientTo: COLORS.bgCard,
              decimalPlaces: config.decimals,
              color: () => config.color,
              labelColor: () => COLORS.textMuted,
              style: {
                borderRadius: 8,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: config.color,
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#3a4a5a',
                strokeWidth: 1,
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>
            {loading ? 'Loading chart data...' : 'Not enough data for chart'}
          </Text>
          <Text style={styles.noDataSubtext}>
            Keep the app open to accumulate readings
          </Text>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={[styles.statValue, {color: COLORS.teal}]}>
              {stats.min} {config.unit}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={[styles.statValue, {color: config.color}]}>
              {stats.avg} {config.unit}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={[styles.statValue, {color: COLORS.orange}]}>
              {stats.max} {config.unit}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  selectorRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a4a5a',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  timeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#3a4a5a',
  },
  timeButtonActive: {
    backgroundColor: COLORS.teal,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  timeTextActive: {
    color: COLORS.bgDark,
  },
  chartContainer: {
    marginHorizontal: -8,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  noData: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#5a6a7a',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a4a5a',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
