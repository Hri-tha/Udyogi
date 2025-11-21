// src/components/JobTrackingBanner.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getWorkerCurrentJob } from '../services/database';

const { width, height } = Dimensions.get('window');

const JobTrackingBanner = () => {
  const navigation = useNavigation(); // Use hook to get navigation
  const { user } = useAuth();
  const [currentJob, setCurrentJob] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showBanner, setShowBanner] = React.useState(true);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  // Track navigation state
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const state = navigation.getState();
      const currentRouteName = state?.routes[state?.index]?.name;
      
      // Hide banner on JobTracking screen
      if (currentRouteName === 'JobTracking') {
        setShowBanner(false);
      } else {
        setShowBanner(true);
      }
    });

    return unsubscribe;
  }, [navigation]);

  React.useEffect(() => {
    loadCurrentJob();
    
    // Check for current job every 30 seconds
    const interval = setInterval(loadCurrentJob, 30000);
    
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    // Animate banner slide in/out
    if (currentJob && showBanner) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [currentJob, showBanner]);

  const loadCurrentJob = async () => {
    try {
      if (!user?.uid) return;
      
      const result = await getWorkerCurrentJob(user.uid);
      if (result.success) {
        setCurrentJob(result.currentJob);
      } else {
        setCurrentJob(null);
      }
    } catch (error) {
      console.error('Error loading current job:', error);
      setCurrentJob(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackJob = () => {
    if (currentJob?.application?.id && navigation) {
      navigation.navigate('JobTracking', {
        applicationId: currentJob.application.id
      });
    } else {
      console.error('Navigation not available or missing application ID');
    }
  };

  const getStatusInfo = () => {
    if (!currentJob?.application?.journeyStatus) return null;

    const status = currentJob.application.journeyStatus;
    const statusConfig = {
      accepted: { 
        text: 'Job Accepted - Ready to start?', 
        color: colors.info,
        icon: '🎉'
      },
      onTheWay: { 
        text: 'On the way to job location', 
        color: colors.warning,
        icon: '🚗'
      },
      reached: { 
        text: 'Arrived at location - Ready to work', 
        color: colors.info,
        icon: '📍'
      },
      started: { 
        text: 'Work in progress', 
        color: colors.primary,
        icon: '⏰'
      }
    };

    return statusConfig[status] || statusConfig.accepted;
  };

  if (loading || !currentJob || !showBanner) {
    return null;
  }

  const statusInfo = getStatusInfo();

  return (
    <Animated.View 
      style={[
        styles.bannerContainer,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity 
        style={[styles.banner, { backgroundColor: statusInfo.color }]}
        onPress={handleTrackJob}
        activeOpacity={0.8}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerIcon}>{statusInfo.icon}</Text>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {currentJob.job?.title || 'Current Job'}
            </Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {statusInfo.text}
            </Text>
          </View>
          <View style={styles.bannerActions}>
            <Text style={styles.trackText}>Track →</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill,
              { 
                width: `${getProgressPercentage(currentJob.application.journeyStatus)}%`,
                backgroundColor: colors.white
              }
            ]} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getProgressPercentage = (status) => {
  const progressMap = {
    accepted: 25,
    onTheWay: 50,
    reached: 75,
    started: 90,
    completed: 100
  };
  return progressMap[status] || 0;
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 60, // Position above bottom tab bar
    left: 10,
    right: 10,
    zIndex: 1000,
    elevation: 10,
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default JobTrackingBanner;