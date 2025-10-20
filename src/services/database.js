// src/services/database.js
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs,
  query, 
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// ========== JOB FUNCTIONS ==========

export const createJob = async (jobData) => {
  try {
    const docRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      status: 'open',
      createdAt: serverTimestamp(),
      applications: 0
    });
    return { success: true, jobId: docRef.id };
  } catch (error) {
    console.error('Create Job Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchJobs = async (filters = {}) => {
  try {
    let q = query(collection(db, 'jobs'), where('status', '==', 'open'));
    
    if (filters.location) {
      q = query(q, where('location', '==', filters.location));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, jobs };
  } catch (error) {
    console.error('Fetch Jobs Error:', error);
    return { success: false, error: error.message, jobs: [] };
  }
};

export const fetchJobById = async (jobId) => {
  try {
    const docRef = doc(db, 'jobs', jobId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        job: { id: docSnap.id, ...docSnap.data() } 
      };
    } else {
      return { success: false, error: 'Job not found' };
    }
  } catch (error) {
    console.error('Fetch Job Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchEmployerJobs = async (employerId) => {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, jobs };
  } catch (error) {
    console.error('Fetch Employer Jobs Error:', error);
    return { success: false, error: error.message, jobs: [] };
  }
};

export const updateJob = async (jobId, updates) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Update Job Error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteJob = async (jobId) => {
  try {
    await deleteDoc(doc(db, 'jobs', jobId));
    return { success: true };
  } catch (error) {
    console.error('Delete Job Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== APPLICATION FUNCTIONS ==========

export const createApplication = async (applicationData) => {
  try {
    const docRef = await addDoc(collection(db, 'applications'), {
      ...applicationData,
      status: 'pending',
      appliedAt: serverTimestamp()
    });
    
    // Increment application count on job
    const jobRef = doc(db, 'jobs', applicationData.jobId);
    const jobSnap = await getDoc(jobRef);
    if (jobSnap.exists()) {
      await updateDoc(jobRef, {
        applications: (jobSnap.data().applications || 0) + 1
      });
    }
    
    return { success: true, applicationId: docRef.id };
  } catch (error) {
    console.error('Create Application Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchWorkerApplications = async (workerId) => {
  try {
    const q = query(
      collection(db, 'applications'),
      where('workerId', '==', workerId),
      orderBy('appliedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, applications };
  } catch (error) {
    console.error('Fetch Applications Error:', error);
    return { success: false, error: error.message, applications: [] };
  }
};

export const fetchJobApplications = async (jobId) => {
  try {
    const q = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      orderBy('appliedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, applications };
  } catch (error) {
    console.error('Fetch Job Applications Error:', error);
    return { success: false, error: error.message, applications: [] };
  }
};

export const updateApplicationStatus = async (applicationId, status) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    await updateDoc(appRef, {
      status,
      respondedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update Application Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== USER FUNCTIONS ==========

export const fetchUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        profile: docSnap.data() 
      };
    } else {
      return { success: false, error: 'Profile not found' };
    }
  } catch (error) {
    console.error('Fetch Profile Error:', error);
    return { success: false, error: error.message };
  }
};