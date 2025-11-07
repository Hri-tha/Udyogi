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
      applications: [],
      // Ensure category field exists
      category: jobData.category || 'General',
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
    
    if (filters.category && filters.category.trim() !== '' && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category.trim()));
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

export const updateApplicationStatus = async (applicationId, status, locationData = null) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const updates = {
      status,
      respondedAt: serverTimestamp()
    };

    // If accepted and location data provided, share location
    if (status === 'accepted' && locationData) {
      updates.employerLocation = locationData;
      updates.locationShared = true;
      updates.chatEnabled = true; 
      updates.locationSharedAt = serverTimestamp();
    }

    await updateDoc(appRef, updates);

    // Create chat when application is accepted
    if (status === 'accepted') {
      const appSnap = await getDoc(appRef);
      const application = appSnap.data();
      
      await createChat(applicationId, [
        application.employerId,
        application.workerId
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('Update Application Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== NOTIFICATION FUNCTIONS ==========

export const createNotification = async (userId, notificationData) => {
  try {
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      read: false,
      actionType: notificationData.actionType || null,
      actionId: notificationData.actionId || null,
      createdAt: new Date(),
    });

    console.log('Notification created:', notificationRef.id);
    return { success: true, id: notificationRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

export const fetchUserNotifications = async (userId) => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(notificationsQuery);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, notifications };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message, notifications: [] };
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const sendApplicationAcceptedNotification = async (workerId, jobTitle, employerName) => {
  return await createNotification(workerId, {
    title: '🎉 Application Accepted!',
    message: `Congratulations! ${employerName} has accepted your application for ${jobTitle}.`,
    type: 'application_accepted',
    actionType: 'view_application',
  });
};

export const sendApplicationRejectedNotification = async (workerId, jobTitle, employerName) => {
  return await createNotification(workerId, {
    title: 'Application Update',
    message: `Your application for ${jobTitle} at ${employerName} was not selected. Keep applying!`,
    type: 'application_rejected',
    actionType: 'view_jobs',
  });
};

export const sendNewApplicationNotification = async (employerId, jobTitle, workerName) => {
  return await createNotification(employerId, {
    title: '📥 New Application Received',
    message: `${workerName} has applied for your ${jobTitle} position.`,
    type: 'new_application',
    actionType: 'view_application',
  });
};

export const sendNewMessageNotification = async (recipientId, senderName, jobTitle) => {
  return await createNotification(recipientId, {
    title: '💬 New Message',
    message: `${senderName} sent you a message about ${jobTitle}.`,
    type: 'new_message',
    actionType: 'view_chat',
  });
};

export const sendJobReminderNotification = async (workerId, jobTitle, reminderTime) => {
  return await createNotification(workerId, {
    title: '⏰ Job Reminder',
    message: `Reminder: Your job "${jobTitle}" starts ${reminderTime}.`,
    type: 'job_reminder',
    actionType: 'view_job',
  });
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

// ========== LOCATION FUNCTIONS ==========

export const shareEmployerLocation = async (applicationId, locationData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    await updateDoc(appRef, {
      employerLocation: locationData,
      locationShared: true,
      locationSharedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Share Location Error:', error);
    return { success: false, error: error.message };
  }
};

export const updateMeetingLocation = async (applicationId, locationData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    await updateDoc(appRef, {
      meetingLocation: locationData,
      meetingLocationUpdatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Update Meeting Location Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== CHAT FUNCTIONS ==========

export const createChat = async (applicationId, participants) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('applicationId', '==', applicationId)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const existingChat = snapshot.docs[0];
      return { success: true, chatId: existingChat.id };
    }
    
    const chatRef = await addDoc(collection(db, 'chats'), {
      applicationId,
      participants,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp()
    });

    return { success: true, chatId: chatRef.id };
  } catch (error) {
    console.error('Create Chat Error:', error);
    return { success: false, error: error.message };
  }
};

export const sendMessage = async (chatId, messageData) => {
  try {
    const messageRef = await addDoc(collection(db, 'messages'), {
      chatId,
      ...messageData,
      timestamp: serverTimestamp(),
      read: false
    });

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: messageData.message,
      lastMessageAt: serverTimestamp()
    });

    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error('Send Message Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchChatMessages = async (chatId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, messages };
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    return { success: false, error: error.message, messages: [] };
  }
};

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      where('senderId', '!=', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Mark Messages Read Error:', error);
    return { success: false, error: error.message };
  }
};

export const fetchUserChats = async (userId) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, chats };
  } catch (error) {
    console.error('Fetch Chats Error:', error);
    return { success: false, error: error.message, chats: [] };
  }
};