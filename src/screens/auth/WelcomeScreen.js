import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const COLORS = {
  bgDark: '#1e2a3a',
  teal: '#4ecdc4',
  gold: '#c9a227',
  textLight: '#ffffff',
  textMuted: '#8a9aa8',
};

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Top content */}
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>AquariSense</Text>
          <Text style={styles.tagline}>Smart Aquarium Care</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem icon="📷" text="Vision-powered AI monitoring" />
          <FeatureItem icon="🔔" text="Predictive alerts before problems" />
          <FeatureItem icon="✨" text="Virtually maintenance-free" />
        </View>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.teal, '#00b4d8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    paddingTop: 60,
  },
  topSection: {
    flex: 1,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.gold,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  features: {
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.textMuted,
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  signInLink: {
    color: COLORS.teal,
    fontWeight: '600',
  },
});
