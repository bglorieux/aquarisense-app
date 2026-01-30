import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  teal: '#4ecdc4',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
};

export default function AddDeviceScreen({ navigation }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Format serial number as user types (AQS-XX-M01-YY-NNNNNN)
  const formatSerialNumber = (text) => {
    let cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    let formatted = cleaned;
    
    if (cleaned.length > 3 && cleaned[3] !== '-') {
      formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }
    if (formatted.length > 6 && formatted[6] !== '-') {
      formatted = formatted.slice(0, 6) + '-' + formatted.slice(6);
    }
    if (formatted.length > 10 && formatted[10] !== '-') {
      formatted = formatted.slice(0, 10) + '-' + formatted.slice(10);
    }
    if (formatted.length > 13 && formatted[13] !== '-') {
      formatted = formatted.slice(0, 13) + '-' + formatted.slice(13);
    }
    
    return formatted.slice(0, 20);
  };

  const handleSerialChange = (text) => {
    setSerialNumber(formatSerialNumber(text));
  };

  const validateSerialNumber = (serial) => {
    const pattern = /^AQS-[A-Z]{2}-M\d{2}-\d{2}-\d{6}$/;
    return pattern.test(serial);
  };

  const handleAddDevice = async () => {
    if (!serialNumber) {
      Alert.alert('Error', 'Please enter your device serial number');
      return;
    }

    if (!validateSerialNumber(serialNumber)) {
      Alert.alert(
        'Invalid Serial Number',
        'Please check the serial number format.\n\nExample: AQS-US-M01-25-001234'
      );
      return;
    }

    setLoading(true);
    
    try {
      const result = await apiService.linkDevice(serialNumber, user.sub);
      
      Alert.alert(
        'Device Added! 🎉',
        `${result.device.name} has been linked to your account.\n\nNext: Connect it to Wi-Fi.`,
        [
          {
            text: 'Set Up Wi-Fi',
            onPress: () => navigation.navigate('WifiSetup', { device: result.device }),
          },
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Link device error:', error);
      
      if (error.message.includes('already linked to another')) {
        Alert.alert(
          'Device Unavailable',
          'This device is already linked to another account. If you purchased this device used, contact support.'
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to link device');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Your Device</Text>
            <Text style={styles.subtitle}>
              Enter the serial number from your AquariSense unit
            </Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Serial Number</Text>
              <TextInput
                style={styles.serialInput}
                placeholder="AQS-US-M01-25-000000"
                placeholderTextColor="#666"
                value={serialNumber}
                onChangeText={handleSerialChange}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>📍 Where to find it</Text>
              <Text style={styles.helpText}>
                • On the Quick Start card in the box{'\n'}
                • Printed on the bottom of your AquariSense unit
              </Text>
            </View>

            <View style={styles.formatBox}>
              <Text style={styles.formatTitle}>Serial Number Format</Text>
              <View style={styles.formatRow}>
                <FormatPart code="AQS" label="Brand" />
                <Text style={styles.formatDash}>-</Text>
                <FormatPart code="US" label="Region" />
                <Text style={styles.formatDash}>-</Text>
                <FormatPart code="M01" label="Model" />
                <Text style={styles.formatDash}>-</Text>
                <FormatPart code="25" label="Year" />
                <Text style={styles.formatDash}>-</Text>
                <FormatPart code="001234" label="Unit #" />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddDevice}
            disabled={loading}
          >
            <LinearGradient
              colors={[COLORS.teal, '#00b4d8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add Device</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanButton}>
            <Text style={styles.scanButtonText}>📷 Scan QR Code Instead</Text>
            <Text style={styles.scanComingSoon}>(Coming soon)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FormatPart({ code, label }) {
  return (
    <View style={styles.formatPart}>
      <Text style={styles.formatCode}>{code}</Text>
      <Text style={styles.formatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  serialInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  helpBox: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  helpTitle: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  formatBox: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 15,
  },
  formatTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  formatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  formatPart: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  formatCode: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  formatLabel: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
  },
  formatDash: {
    color: '#666',
    fontSize: 12,
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scanButton: {
    alignItems: 'center',
    padding: 15,
  },
  scanButtonText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  scanComingSoon: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
