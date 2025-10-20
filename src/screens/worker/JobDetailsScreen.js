// import React, { useState, useContext } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';
// import { JobContext } from '../../context/JobContext';
// import { AuthContext } from '../../context/AuthContext';
// import { colors } from '../../constants/colors';

// const JobDetailsScreen = ({ route, navigation }) => {
//   const { jobId } = route.params;
//   const { jobs, applyForJob } = useContext(JobContext);
//   const { user } = useContext(AuthContext);
//   const [applying, setApplying] = useState(false);

//   const job = jobs.find(j => j.id === jobId);

//   if (!job) {
//     return (
//       <View style={styles.container}>
//         <Text>Job not found</Text>
//       </View>
//     );
//   }

//   const handleApply = async () => {
//     setApplying(true);
//     try {
//       await applyForJob(jobId, user.uid);
//       Alert.alert('Success', 'Application submitted successfully!');
//       navigation.goBack();
//     } catch (error) {
//       Alert.alert('Error', 'Failed to apply for job');
//     }
//     setApplying(false);
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>{job.title}</Text>
//         <Text style={styles.company}>{job.company}</Text>
//         <Text style={styles.salary}>₹{job.salary} / month</Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Job Description</Text>
//         <Text style={styles.description}>{job.description}</Text>
//       </View>

//       <View style={styles.details}>
//         <View style={styles.detailItem}>
//           <Text style={styles.detailLabel}>Location</Text>
//           <Text style={styles.detailValue}>{job.location}</Text>
//         </View>
//         <View style={styles.detailItem}>
//           <Text style={styles.detailLabel}>Job Type</Text>
//           <Text style={styles.detailValue}>{job.jobType}</Text>
//         </View>
//         <View style={styles.detailItem}>
//           <Text style={styles.detailLabel}>Experience</Text>
//           <Text style={styles.detailValue}>{job.experienceLevel}</Text>
//         </View>
//       </View>

//       <TouchableOpacity
//         style={styles.applyButton}
//         onPress={handleApply}
//         disabled={applying}
//       >
//         <Text style={styles.applyButtonText}>
//           {applying ? 'Applying...' : 'Apply for this Job'}
//         </Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: colors.background,
//   },
//   header: {
//     backgroundColor: colors.white,
//     padding: 20,
//     marginBottom: 10,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: colors.text,
//     marginBottom: 5,
//   },
//   company: {
//     fontSize: 18,
//     color: colors.primary,
//     marginBottom: 5,
//   },
//   salary: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: colors.success,
//   },
//   section: {
//     backgroundColor: colors.white,
//     padding: 20,
//     marginBottom: 10,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.text,
//     marginBottom: 10,
//   },
//   description: {
//     fontSize: 16,
//     color: colors.textSecondary,
//     lineHeight: 24,
//   },
//   details: {
//     backgroundColor: colors.white,
//     padding: 20,
//     marginBottom: 10,
//   },
//   detailItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   detailLabel: {
//     fontSize: 16,
//     color: colors.textSecondary,
//   },
//   detailValue: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: colors.text,
//   },
//   applyButton: {
//     backgroundColor: colors.primary,
//     margin: 20,
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   applyButtonText: {
//     color: colors.white,
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
// });

// export default JobDetailsScreen;

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { jobs, applyForJob } = useJob();
  const { user, userProfile, logout } = useAuth();
  const [applying, setApplying] = useState(false);

  const job = jobs.find(j => j.id === jobId);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyForJob(jobId, user.uid);
      Alert.alert('Success', 'Application submitted successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to apply for job');
    }
    setApplying(false);
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text>Job not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.jobHeader}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.company}</Text>
          <Text style={styles.salary}>₹{job.salary} / month</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{job.location}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Job Type</Text>
            <Text style={styles.detailValue}>{job.jobType}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Experience</Text>
            <Text style={styles.detailValue}>{job.experienceLevel}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          disabled={applying}
        >
          <Text style={styles.applyButtonText}>
            {applying ? 'Applying...' : 'Apply for this Job'}
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  backButton: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobHeader: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  company: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 5,
  },
  salary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
  },
  section: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  details: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default JobDetailsScreen;