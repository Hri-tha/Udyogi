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
import { 
  createApplication, 
  createNotification,
  fetchJobApplications,
  updateApplicationStatus 
} from '../services/database';

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

  const applyForJob = async (jobId, userId, userProfile) => {
    try {
      // Find the job to get employer details
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Create application
      const applicationData = {
        jobId,
        workerId: userId,
        workerName: userProfile?.name || 'Worker',
        workerPhone: userProfile?.phoneNumber || '',
        status: 'pending',
        jobTitle: job.title,
        employerId: job.employerId,
        companyName: job.companyName || job.company
      };

      const applicationResult = await createApplication(applicationData);
      
      if (applicationResult.success) {
        // Create notification for employer
        await createNotification({
          userId: job.employerId,
          type: 'new_application',
          title: 'New Job Application',
          message: `${userProfile?.name || 'A worker'} applied for your job: ${job.title}`,
          data: {
            jobId,
            applicationId: applicationResult.applicationId,
            workerId: userId,
            workerName: userProfile?.name || 'Worker'
          }
        });

        // Update local jobs state to reflect the application
        const updatedJobs = jobs.map(j => {
          if (j.id === jobId) {
            return {
              ...j,
              applications: [...(j.applications || []), userId]
            };
          }
          return j;
        });
        setJobs(updatedJobs);

        return { success: true };
      } else {
        throw new Error('Failed to create application');
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      throw new Error('Failed to apply for job: ' + error.message);
    }
  };

  const getJobApplications = async (jobId) => {
    try {
      const result = await fetchJobApplications(jobId);
      return result;
    } catch (error) {
      console.error('Error fetching job applications:', error);
      throw new Error('Failed to fetch job applications: ' + error.message);
    }
  };

  const respondToApplication = async (applicationId, status, employerId, workerId, jobTitle) => {
    try {
      const result = await updateApplicationStatus(applicationId, status);
      
      if (result.success) {
        // Create notification for worker
        await createNotification({
          userId: workerId,
          type: 'application_update',
          title: `Application ${status}`,
          message: `Your application for "${jobTitle}" has been ${status}`,
          data: {
            applicationId,
            status,
            employerId
          }
        });

        return { success: true };
      } else {
        throw new Error('Failed to update application');
      }
    } catch (error) {
      console.error('Error responding to application:', error);
      throw new Error('Failed to respond to application: ' + error.message);
    }
  };

  const checkIfApplied = (jobId, userId) => {
    const job = jobs.find(j => j.id === jobId);
    return job?.applications?.includes(userId) || false;
  };

  const value = {
    jobs,
    loading,
    currentLocation,
    fetchJobs,
    fetchJobsByUserLocation,
    applyForJob,
    getJobApplications,
    respondToApplication,
    checkIfApplied,
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