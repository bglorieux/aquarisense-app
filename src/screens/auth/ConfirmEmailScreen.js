import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  bgDark: '#1e2a3a',
  bgCard: '#2a3a4a',
  teal: '#4ecdc4',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
};

export default function ConfirmEmailScreen({ navigation, route }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { confirmSignUp, resendConfirmationCode } = useAuth();

  const handleConfirm = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await confirmSignUp(email, code);
      Alert.alert(
        'Success!',
        'Your email has been verified. You can now sign in.',
        [{ text: 'Sign In', onPress: () => navigation.navigate('SignIn') }]
      );
    } catch (error) {
      console.error('Confirm error:', error);
      Alert.alert('Verification Failed', error.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await resendConfirmationCode(email);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email');
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert('Error', error.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.icon}>📧</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="#666"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleConfirm}
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
                <Text style={styles.verifyButtonText}>Verify Email</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color={COLORS.teal} />
            ) : (
              <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  backText: {
    color: COLORS.teal,
    fontSize: 16,
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
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
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    letterSpacing: 10,
    fontWeight: 'bold',
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 25,
    alignItems: 'center',
    padding: 10,
  },
  resendText: {
    color: COLORS.teal,
    fontSize: 14,
  },
});
