// src/context/JobContext.js - FIXED VERSION
import React, { createContext, useState, useContext } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  arrayUnion,
  query,
  where,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  createApplication, 
  createNotification,
  fetchJobApplications,
  updateApplicationStatus,
  fetchJobById 
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
    setCurrentLocation(userLocation); // This sets the current location
  } else {
    await fetchJobs(); // Fetch all jobs if no user location
    setCurrentLocation(''); // Clear current location
  }
};

const autoSetUserLocation = async () => {
  try {
    if (userProfile?.location) {
      await fetchJobsByUserLocation(userProfile.location);
    } else {
      await fetchJobs(); // Show all jobs if no location
    }
  } catch (error) {
    console.error('Error auto-setting location:', error);
    await fetchJobs(); // Fallback to all jobs
  }
};

  const applyForJob = async (jobId, userId, userProfile, jobData = null) => {
    try {
      let job;
      
      // First try to use the jobData passed from the screen
      if (jobData) {
        job = jobData;
      } else {
        // If no jobData provided, try to find in local state
        job = jobs.find(j => j.id === jobId);
        
        // If not found in local state, fetch from database
        if (!job) {
          console.log('Job not found in local state, fetching from database...');
          const result = await fetchJobById(jobId);
          if (result.success) {
            job = result.job;
          } else {
            throw new Error('Job not found in database');
          }
        }
      }

      if (!job) {
        throw new Error('Job not found');
      }

      console.log('Applying for job:', {
        jobId,
        jobTitle: job.title,
        employerId: job.employerId,
        workerId: userId,
        workerName: userProfile?.name
      });

      // Create application
      const applicationData = {
        jobId,
        workerId: userId,
        workerName: userProfile?.name || 'Worker',
        workerPhone: userProfile?.phoneNumber || '',
        employerId: job.employerId,
        jobTitle: job.title,
        companyName: job.companyName || job.company || 'Company',
        status: 'pending',
        appliedAt: new Date()
      };

      const applicationResult = await createApplication(applicationData);
      
      if (applicationResult.success) {
        console.log('Application created successfully:', applicationResult.applicationId);
        
        // Create notification for employer
        try {
          await createNotification(job.employerId, {
            title: '📥 New Application Received',
            message: `${userProfile?.name || 'A worker'} has applied for your "${job.title}" position.`,
            type: 'new_application',
            actionType: 'view_applications',
            actionId: jobId,
          });
          console.log('Notification sent to employer');
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Don't fail the application if notification fails
        }

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

        return { success: true, applicationId: applicationResult.applicationId };
      } else {
        throw new Error(applicationResult.error || 'Failed to create application');
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
        await createNotification(workerId, {
          title: status === 'accepted' ? '🎉 Application Accepted!' : 'Application Update',
          message: status === 'accepted' 
            ? `Congratulations! Your application for "${jobTitle}" has been accepted.` 
            : `Your application for "${jobTitle}" was not selected.`,
          type: 'application_update',
          actionType: status === 'accepted' ? 'view_job_tracking' : 'view_jobs',
          actionId: applicationId,
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