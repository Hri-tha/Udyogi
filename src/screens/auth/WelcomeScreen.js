// src/screens/auth/WelcomeScreen.js
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Section with Gradient */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          {/* Logo Image */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/UdyogiLogo.png')} // Update path as needed
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Udyogi</Text>
          <Text style={styles.subtitle}>
            Connect workers with opportunities.{'\n'}Build your future today.
          </Text>
        </View>
      </LinearGradient>

      {/* Bottom Section */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Choose Your Role</Text>
        <Text style={styles.sectionSubtitle}>
          Select how you want to get started
        </Text>

        {/* Worker Card */}
        <TouchableOpacity
          style={styles.userTypeCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Login', { userType: 'worker' })}
        >
          <View style={[styles.iconContainer, styles.workerIconBg]}>
            <Text style={styles.cardIcon}>👷</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>I'm Looking for Work</Text>
            <Text style={styles.cardDesc}>
              Find flexible jobs, earn money, and build your career
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        {/* Employer Card */}
        <TouchableOpacity
          style={styles.userTypeCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Login', { userType: 'employer' })}
        >
          <View style={[styles.iconContainer, styles.employerIconBg]}>
            <Text style={styles.cardIcon}>🏭</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>I Need Workers</Text>
            <Text style={styles.cardDesc}>
              Post jobs, hire skilled workers, and grow your business
            </Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Trusted by thousands of workers and employers
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    height: height * 0.4,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 60,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 600,
    height: 150,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  userTypeCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  workerIconBg: {
    backgroundColor: '#E3F2FF',
  },
  employerIconBg: {
    backgroundColor: '#FFF4E6',
  },
  cardIcon: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  arrow: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});