// import React, { useState, useEffect, useContext } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   RefreshControl,
//   Alert,
//   TouchableOpacity,
// } from 'react-native';
// import { JobContext } from '../../context/JobContext';
// import { AuthContext } from '../../context/AuthContext';
// import JobCard from '../../components/JobCard';
// import { colors } from '../../constants/colors';

// const WorkerHomeScreen = ({ navigation }) => {
//   const [refreshing, setRefreshing] = useState(false);
//   const { jobs, fetchJobs, applyForJob } = useContext(JobContext);
//   const { user } = useContext(AuthContext);

//   useEffect(() => {
//     loadJobs();
//   }, []);

//   const loadJobs = async () => {
//     try {
//       await fetchJobs();
//     } catch (error) {
//       Alert.alert('Error', 'Failed to load jobs');
//     }
//   };

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadJobs();
//     setRefreshing(false);
//   };

//   const handleApplyJob = async (jobId) => {
//     try {
//       await applyForJob(jobId, user.uid);
//       Alert.alert('Success', 'Job application submitted!');
//     } catch (error) {
//       Alert.alert('Error', 'Failed to apply for job');
//     }
//   };

//   const availableJobs = jobs.filter(job => job.status === 'active');

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Available Jobs</Text>
//         <Text style={styles.subtitle}>
//           Find your next opportunity from {availableJobs.length} available jobs
//         </Text>
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {availableJobs.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyText}>No jobs available at the moment</Text>
//             <Text style={styles.emptySubtext}>
//               Check back later for new opportunities
//             </Text>
//           </View>
//         ) : (
//           availableJobs.map((job) => (
//             <JobCard
//               key={job.id}
//               job={job}
//               onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
//               onApply={() => handleApplyJob(job.id)}
//               showApplyButton={true}
//             />
//           ))
//         )}
//       </ScrollView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   header: {
//     padding: 20,
//     paddingTop: 60,
//     backgroundColor: colors.primary,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: colors.white,
//     marginBottom: 5,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: colors.white,
//     opacity: 0.9,
//   },
//   scrollView: {
//     flex: 1,
//     padding: 15,
//   },
//   emptyState: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 40,
//   },
//   emptyText: {
//     fontSize: 18,
//     color: colors.textSecondary,
//     textAlign: 'center',
//     marginBottom: 10,
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: colors.textSecondary,
//     textAlign: 'center',
//     opacity: 0.7,
//   },
// });

// export default WorkerHomeScreen;

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import JobCard from '../../components/JobCard';
import { colors } from '../../constants/colors';

const WorkerHomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { jobs, fetchJobs, applyForJob } = useJob();
  const { user } = useAuth();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      await fetchJobs();
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'Failed to load jobs');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleApplyJob = async (jobId) => {
    try {
      await applyForJob(jobId, user.uid);
      Alert.alert('Success', 'Job application submitted!');
    } catch (error) {
      console.error('Error applying for job:', error);
      Alert.alert('Error', 'Failed to apply for job');
    }
  };

  const availableJobs = jobs.filter(job => job.status === 'active');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Jobs</Text>
        <Text style={styles.subtitle}>
          Find your next opportunity from {availableJobs.length} available jobs
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {availableJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No jobs available at the moment</Text>
            <Text style={styles.emptySubtext}>
              Check back later for new opportunities
            </Text>
          </View>
        ) : (
          availableJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
              onApply={() => handleApplyJob(job.id)}
              showApplyButton={true}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default WorkerHomeScreen;