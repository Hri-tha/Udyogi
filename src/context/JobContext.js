// import React, { createContext, useState, useContext } from 'react';
// import { 
//   collection, 
//   doc, 
//   getDocs, 
//   addDoc, 
//   updateDoc, 
//   arrayUnion,
//   query, 
//   where 
// } from 'firebase/firestore';
// import { firestore } from '../services/firebase';

// const JobContext = createContext();

// export const JobProvider = ({ children }) => {
//   const [jobs, setJobs] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const fetchJobs = async () => {
//     setLoading(true);
//     try {
//       const querySnapshot = await getDocs(collection(firestore, 'jobs'));
//       const jobsData = querySnapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       }));
//       setJobs(jobsData);
//     } catch (error) {
//       console.error('Error fetching jobs:', error);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const applyForJob = async (jobId, userId) => {
//     try {
//       const jobRef = doc(firestore, 'jobs', jobId);
//       await updateDoc(jobRef, {
//         applications: arrayUnion(userId)
//       });
//       // Refresh jobs after applying
//       await fetchJobs();
//     } catch (error) {
//       console.error('Error applying for job:', error);
//       throw new Error('Failed to apply for job');
//     }
//   };

//   const value = {
//     jobs,
//     loading,
//     fetchJobs,
//     applyForJob,
//   };

//   return (
//     <JobContext.Provider value={value}>
//       {children}
//     </JobContext.Provider>
//   );
// };

// export const useJob = () => {
//   const context = useContext(JobContext);
//   if (!context) {
//     throw new Error('useJob must be used within a JobProvider');
//   }
//   return context;
// };

// export default JobContext;

import React, { createContext, useState, useContext } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';
import { firestore } from '../services/firebase';

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(firestore, 'jobs'));
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const applyForJob = async (jobId, userId) => {
    try {
      const jobRef = doc(firestore, 'jobs', jobId);
      await updateDoc(jobRef, {
        applications: arrayUnion(userId)
      });
      // Refresh jobs after applying
      await fetchJobs();
    } catch (error) {
      console.error('Error applying for job:', error);
      throw new Error('Failed to apply for job');
    }
  };

  const value = {
    jobs,
    loading,
    fetchJobs,
    applyForJob,
  };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};

export const useJob = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};

export default JobContext;