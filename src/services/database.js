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
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';

// ========== JOB FUNCTIONS ==========

export const createJob = async (jobData) => {
  try {
    const docRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      status: 'open',
      createdAt: serverTimestamp(),
      applications: []
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
    
    if (filters.location && filters.location.trim() !== '') {
      q = query(q, where('location', '==', filters.location.trim()));
    }
    
    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    jobs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
    return { success: true, jobs };
  } catch (error) {
    console.error('Fetch Jobs Error:', error);
    return { success: false, error: error.message, jobs: [] };
  }
};

export const updateEmployerProfile = async (employerId, profileData) => {
  try {
    const employerRef = doc(db, 'users', employerId);
    await updateDoc(employerRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Update Employer Profile Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchEmployerStats = async (employerId) => {
  try {
    const jobsSnapshot = await getDocs(
      query(collection(db, 'jobs'), where('employerId', '==', employerId))
    );
    
    const jobs = jobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const activeJobs = jobs.filter(job => job.status === 'open').length;
    const totalApplications = jobs.reduce((sum, job) => 
      sum + (job.applications?.length || 0), 0
    );
    const acceptedApplications = jobs.reduce((sum, job) => {
      const accepted = job.applications?.filter(app => app.status === 'accepted').length || 0;
      return sum + accepted;
    }, 0);

    return {
      success: true,
      stats: {
        activeJobs,
        totalApplications,
        acceptedApplications,
        completionRate: totalApplications > 0 ? 
          Math.round((acceptedApplications / totalApplications) * 100) : 0
      }
    };
  } catch (error) {
    console.error('Error fetching employer stats:', error);
    return { success: false, error: error.message };
  }
};

export const closeJob = async (jobId) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
      status: 'closed',
      closedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Close Job Error:', error);
    return { success: false, error: error.message };
  }
};

export const reopenJob = async (jobId) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
      status: 'open',
      reopenedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Reopen Job Error:', error);
    return { success: false, error: error.message };
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
      where('employerId', '==', employerId)
    );
    
    const snapshot = await getDocs(q);
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    jobs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
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
    
    // Update job applications array
    const jobRef = doc(db, 'jobs', applicationData.jobId);
    await updateDoc(jobRef, {
      applications: arrayUnion(applicationData.workerId)
    });
    
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
      where('workerId', '==', workerId)
    );
    
    const snapshot = await getDocs(q);
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    applications.sort((a, b) => {
      const aTime = a.appliedAt?.toMillis() || 0;
      const bTime = b.appliedAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
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
      where('jobId', '==', jobId)
    );
    
    const snapshot = await getDocs(q);
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    applications.sort((a, b) => {
      const aTime = a.appliedAt?.toMillis() || 0;
      const bTime = b.appliedAt?.toMillis() || 0;
      return bTime - aTime;
    });
    
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

// ========== NOTIFICATION FUNCTIONS ==========

// Add this to your database.js file in the notification functions section
export const createNotification = async (notificationData) => {
  try {
    // Ensure all fields have proper values and handle undefined
    const safeData = {
      ...notificationData.data,
      jobId: notificationData.data?.jobId || '',
      applicationId: notificationData.data?.applicationId || '',
      workerId: notificationData.data?.workerId || '',
      workerName: notificationData.data?.workerName || 'Worker',
      employerId: notificationData.data?.employerId || '',
      status: notificationData.data?.status || ''
    };

    // Remove any undefined values from safeData
    Object.keys(safeData).forEach(key => {
      if (safeData[key] === undefined) {
        safeData[key] = '';
      }
    });

    const safeNotificationData = {
      userId: notificationData.userId || '',
      type: notificationData.type || 'general',
      title: notificationData.title || 'Notification',
      message: notificationData.message || '',
      data: safeData,
      read: false,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notifications'), safeNotificationData);
    return { success: true, notificationId: docRef.id };
  } catch (error) {
    console.error('Create Notification Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchUserNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, notifications };
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    return { success: false, error: error.message, notifications: [] };
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true
    });
    return { success: true };
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
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

export const updateUserProfile = async (userId, profileData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update Profile Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== HELPER FUNCTIONS ==========

export const checkIfApplied = async (jobId, workerId) => {
  try {
    const q = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      where('workerId', '==', workerId)
    );
    
    const snapshot = await getDocs(q);
    return { 
      success: true, 
      hasApplied: !snapshot.empty,
      applicationId: snapshot.empty ? null : snapshot.docs[0].id 
    };
  } catch (error) {
    console.error('Check Application Error:', error);
    return { success: false, error: error.message };
  }
};