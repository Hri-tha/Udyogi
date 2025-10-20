// src/screens/auth/WelcomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>💼</Text>
        <Text style={styles.title}>Labor Connect</Text>
        <Text style={styles.subtitle}>
          Find work. Get paid. Build your future.
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>I am a...</Text>

        <TouchableOpacity
          style={styles.userTypeCard}
          onPress={() => navigation.navigate('Login', { userType: 'worker' })}
        >
          <Text style={styles.cardIcon}>👷</Text>
          <Text style={styles.cardTitle}>Worker</Text>
          <Text style={styles.cardDesc}>Find flexible jobs near you</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userTypeCard}
          onPress={() => navigation.navigate('Login', { userType: 'employer' })}
        >
          <Text style={styles.cardIcon}>🏭</Text>
          <Text style={styles.cardTitle}>Employer</Text>
          <Text style={styles.cardDesc}>Post jobs and hire workers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 70,
    marginBottom: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  userTypeCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});