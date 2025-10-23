// src/context/JobContext.js
import React, { createContext, useState, useContext } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  arrayUnion,
  query,
  where
} from 'firebase/firestore';
import { db } from '../services/firebase';

const JobContext = createContext();

export const JobProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');

  const fetchJobs = async (location = '') => {
    setLoading(true);
    try {
      let q;
      
      if (location && location.trim() !== '') {
        // Filter jobs by location
        q = query(
          collection(db, 'jobs'), 
          where('location', '==', location.trim())
        );
        setCurrentLocation(location);
      } else {
        // Get all jobs if no location specified
        q = query(collection(db, 'jobs'));
        setCurrentLocation('');
      }
      
      const querySnapshot = await getDocs(q);
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

  const fetchJobsByUserLocation = async (userLocation) => {
    if (userLocation && userLocation.trim() !== '') {
      await fetchJobs(userLocation);
    } else {
      await fetchJobs(); // Fetch all jobs if no user location
    }
  };

  const applyForJob = async (jobId, userId) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        applications: arrayUnion(userId)
      });
      // Refresh jobs after applying (maintain current location filter)
      if (currentLocation) {
        await fetchJobs(currentLocation);
      } else {
        await fetchJobs();
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      throw new Error('Failed to apply for job');
    }
  };

  const value = {
    jobs,
    loading,
    currentLocation,
    fetchJobs,
    fetchJobsByUserLocation,
    applyForJob,
    setCurrentLocation,
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