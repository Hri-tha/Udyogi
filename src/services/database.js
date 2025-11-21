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
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  increment,
  arrayRemove
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

// export const deleteJob = async (jobId) => {
//   try {
//     await deleteDoc(doc(db, 'jobs', jobId));
//     return { success: true };
//   } catch (error) {
//     console.error('Delete Job Error:', error);
//     return { success: false, error: error.message };
//   }
// };

// ========== APPLICATION FUNCTIONS ==========

export const createApplication = async (applicationData) => {
  try {
    // Validate required fields
    if (!applicationData.jobId || !applicationData.workerId) {
      return { 
        success: false, 
        error: 'Missing required fields: jobId or workerId' 
      };
    }

    // Get job details to include in application
    const jobRef = doc(db, 'jobs', applicationData.jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const job = jobSnap.data();

    const docRef = await addDoc(collection(db, 'applications'), {
      ...applicationData,
      status: 'pending',
      appliedAt: serverTimestamp(),
      jobTitle: job.title || 'Job',
      companyName: job.companyName || 'Company',
      hourlyRate: Number(job.rate || job.salary || 0),
      jobDate: job.jobDate || '',
      jobStartTime: job.startTime || '',
      jobEndTime: job.endTime || ''
    });
    
    // Update job applications array
    await updateDoc(jobRef, {
      applications: arrayUnion(applicationData.workerId)
    });

    // Send notification to employer
    try {
      await createNotification(job.employerId, {
        title: '📥 New Application Received',
        message: `${applicationData.workerName} has applied for your ${job.title} position.`,
        type: 'new_application',
        actionType: 'view_applications',
        actionId: applicationData.jobId,
      });
    } catch (notifError) {
      console.error('Error sending application notification:', notifError);
      // Don't fail application creation if notification fails
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

/**
 * Update application status with journey tracking
 * @param {string} applicationId - Application ID
 * @param {string} status - Application status
 * @param {Object} locationData - Location data (optional)
 * @returns {Object} - Success status
 */
export const updateApplicationStatus = async (applicationId, status, locationData = null) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const updates = {
      status,
      respondedAt: serverTimestamp()
    };

    // If accepted, initialize journey tracking
    if (status === 'accepted') {
      updates.journeyStatus = 'accepted';
      updates.chatEnabled = true;
      
      if (locationData) {
        updates.employerLocation = locationData;
        updates.locationShared = true;
        updates.locationSharedAt = serverTimestamp();
      }

      // Get job details to store in application
      const appSnap = await getDoc(appRef);
      const application = appSnap.data();
      
      const jobRef = doc(db, 'jobs', application.jobId);
      const jobSnap = await getDoc(jobRef);
      
      if (jobSnap.exists()) {
        const job = jobSnap.data();
        
        // Calculate total payment properly
        const calculateTotalPayment = () => {
          if (!job.startTime || !job.endTime || !job.rate) {
            return job.salary || 0;
          }

          try {
            const parseTime = (timeStr) => {
              let time = String(timeStr).toLowerCase().trim();
              
              if (time.includes('am') || time.includes('pm')) {
                const [timePart, modifier] = time.split(/(am|pm)/);
                let [hours, minutes] = timePart.split(':').map(Number);
                
                if (modifier === 'pm' && hours < 12) hours += 12;
                if (modifier === 'am' && hours === 12) hours = 0;
                
                return hours + (minutes || 0) / 60;
              } else {
                const [hours, minutes] = time.split(':').map(Number);
                return hours + (minutes || 0) / 60;
              }
            };

            const start = parseTime(job.startTime);
            const end = parseTime(job.endTime);
            
            if (isNaN(start) || isNaN(end) || end <= start) {
              return job.salary || 0;
            }

            const totalHours = end - start;
            const hourlyRate = Number(job.rate || job.salary || 0);
            return Math.round(totalHours * hourlyRate);
          } catch (error) {
            console.error('Error calculating payment:', error);
            return job.salary || 0;
          }
        };

        const totalPayment = calculateTotalPayment();
        
        updates.hourlyRate = Number(job.rate || job.salary || 0);
        updates.expectedPayment = totalPayment;
        updates.jobDate = job.jobDate || '';
        updates.jobStartTime = job.startTime || '';
        updates.jobEndTime = job.endTime || '';
        
        console.log('Storing payment info:', {
          hourlyRate: updates.hourlyRate,
          expectedPayment: updates.expectedPayment,
          jobDate: updates.jobDate
        });
      }
    }

    await updateDoc(appRef, updates);

    // Handle notifications and chat creation
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    if (status === 'accepted') {
      // Create chat first
      try {
        await createChat(applicationId, [
          application.employerId,
          application.workerId
        ]);
        console.log('Chat created successfully');
      } catch (chatError) {
        console.error('Error creating chat:', chatError);
      }

      // Send notification with proper error handling
      try {
        await createNotification(application.workerId, {
          title: '🎉 Application Accepted!',
          message: `Your application for "${application.jobTitle}" has been accepted! You can now track your job.`,
          type: 'application_accepted',
          actionType: 'view_job_tracking',
          actionId: applicationId,
        });
        console.log('Notification sent successfully');
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the whole operation if notification fails
      }
      
    } else if (status === 'rejected') {
      try {
        await createNotification(application.workerId, {
          title: 'Application Update',
          message: `Your application for "${application.jobTitle}" was not selected.`,
          type: 'application_rejected',
          actionType: 'view_jobs',
        });
      } catch (notifError) {
        console.error('Error sending rejection notification:', notifError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Update Application Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== REAL-TIME FUNCTIONS ==========

/**
 * Set up real-time listener for application updates
 * @param {string} applicationId - Application ID
 * @param {function} callback - Callback function when data changes
 * @returns {function} - Unsubscribe function
 */
export const onApplicationUpdate = (applicationId, callback) => {
  const appRef = doc(db, 'applications', applicationId);
  
  return onSnapshot(appRef, (docSnap) => {
    if (docSnap.exists()) {
      const application = { id: docSnap.id, ...docSnap.data() };
      callback(application);
    }
  });
};

/**
 * Set up real-time listener for job updates
 * @param {string} jobId - Job ID
 * @param {function} callback - Callback function when data changes
 * @returns {function} - Unsubscribe function
 */
export const onJobUpdate = (jobId, callback) => {
  const jobRef = doc(db, 'jobs', jobId);
  
  return onSnapshot(jobRef, (docSnap) => {
    if (docSnap.exists()) {
      const job = { id: docSnap.id, ...docSnap.data() };
      callback(job);
    }
  });
};

// ========== NOTIFICATION FUNCTIONS ==========

export const createNotification = async (userId, notificationData) => {
  try {
    // Validate required fields
    if (!userId) {
      console.error('Cannot create notification: userId is missing');
      return { success: false, error: 'User ID is required' };
    }

    if (!notificationData.title || !notificationData.message) {
      console.error('Cannot create notification: title or message is missing');
      return { success: false, error: 'Title and message are required' };
    }

    const notificationRef = await addDoc(collection(db, 'notifications'), {
      userId: String(userId),
      title: String(notificationData.title),
      message: String(notificationData.message),
      type: notificationData.type || 'general',
      read: false,
      actionType: notificationData.actionType || null,
      actionId: notificationData.actionId || null,
      createdAt: serverTimestamp(),
    });

    console.log('Notification created successfully:', notificationRef.id);
    return { success: true, id: notificationRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Notification data:', notificationData);
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

// Add these functions to your database.js file

// ========== RATING FUNCTIONS ==========

/**
 * Create a rating for a worker by an employer
 * @param {Object} ratingData - Rating information
 * @returns {Object} - Success status and rating ID
 */
export const createRating = async (ratingData) => {
  try {
    // Check if rating already exists for this job/worker combination
    const existingRatingQuery = query(
      collection(db, 'ratings'),
      where('jobId', '==', ratingData.jobId),
      where('workerId', '==', ratingData.workerId),
      where('employerId', '==', ratingData.employerId)
    );
    
    const existingRating = await getDocs(existingRatingQuery);
    
    if (!existingRating.empty) {
      return { 
        success: false, 
        error: 'You have already rated this worker for this job' 
      };
    }

    // Create the rating
    const ratingRef = await addDoc(collection(db, 'ratings'), {
      ...ratingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update worker's average rating
    await updateWorkerRating(ratingData.workerId);

    // Create notification for worker
    await createNotification(ratingData.workerId, {
      title: '⭐ New Rating Received',
      message: `${ratingData.employerName} rated you ${ratingData.rating} stars for ${ratingData.jobTitle}`,
      type: 'rating_received',
      actionType: 'view_profile',
    });

    return { success: true, ratingId: ratingRef.id };
  } catch (error) {
    console.error('Create Rating Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create a rating for an employer by a worker
 * @param {Object} ratingData - Rating information
 * @returns {Object} - Success status and rating ID
 */
export const createEmployerRating = async (ratingData) => {
  try {
    // Check if rating already exists
    const existingRatingQuery = query(
      collection(db, 'employerRatings'),
      where('jobId', '==', ratingData.jobId),
      where('workerId', '==', ratingData.workerId),
      where('employerId', '==', ratingData.employerId)
    );
    
    const existingRating = await getDocs(existingRatingQuery);
    
    if (!existingRating.empty) {
      return { 
        success: false, 
        error: 'You have already rated this employer for this job' 
      };
    }

    // Create the rating
    const ratingRef = await addDoc(collection(db, 'employerRatings'), {
      ...ratingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update employer's average rating
    await updateEmployerRating(ratingData.employerId);

    // Create notification for employer
    await createNotification(ratingData.employerId, {
      title: '⭐ New Rating Received',
      message: `${ratingData.workerName} rated you ${ratingData.rating} stars`,
      type: 'rating_received',
      actionType: 'view_profile',
    });

    return { success: true, ratingId: ratingRef.id };
  } catch (error) {
    console.error('Create Employer Rating Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch all ratings for a worker
 * @param {string} workerId - Worker's user ID
 * @returns {Object} - Success status and ratings array
 */
export const fetchWorkerRatings = async (workerId) => {
  try {
    const q = query(
      collection(db, 'ratings'),
      where('workerId', '==', workerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, ratings };
  } catch (error) {
    console.error('Fetch Worker Ratings Error:', error);
    return { success: false, error: error.message, ratings: [] };
  }
};

/**
 * Fetch all ratings for an employer
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Success status and ratings array
 */
export const fetchEmployerRatings = async (employerId) => {
  try {
    const q = query(
      collection(db, 'employerRatings'),
      where('employerId', '==', employerId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, ratings };
  } catch (error) {
    console.error('Fetch Employer Ratings Error:', error);
    return { success: false, error: error.message, ratings: [] };
  }
};

/**
 * Update worker's average rating in their profile
 * @param {string} workerId - Worker's user ID
 * @returns {Object} - Success status
 */
const updateWorkerRating = async (workerId) => {
  try {
    const ratingsResult = await fetchWorkerRatings(workerId);
    
    if (ratingsResult.success && ratingsResult.ratings.length > 0) {
      const sum = ratingsResult.ratings.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / ratingsResult.ratings.length;
      
      const userRef = doc(db, 'users', workerId);
      await updateDoc(userRef, {
        rating: parseFloat(average.toFixed(2)),
        totalRatings: ratingsResult.ratings.length,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update Worker Rating Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update employer's average rating in their profile
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Success status
 */
const updateEmployerRating = async (employerId) => {
  try {
    const ratingsResult = await fetchEmployerRatings(employerId);
    
    if (ratingsResult.success && ratingsResult.ratings.length > 0) {
      const sum = ratingsResult.ratings.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / ratingsResult.ratings.length;
      
      const userRef = doc(db, 'users', employerId);
      await updateDoc(userRef, {
        rating: parseFloat(average.toFixed(2)),
        totalRatings: ratingsResult.ratings.length,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update Employer Rating Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user can rate (job must be completed)
 * @param {string} jobId - Job ID
 * @param {string} workerId - Worker ID
 * @param {string} employerId - Employer ID
 * @returns {Object} - Can rate status and application details
 */
export const checkCanRate = async (jobId, workerId, employerId) => {
  try {
    // Find the application
    const q = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      where('workerId', '==', workerId),
      where('employerId', '==', employerId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { 
        success: false, 
        canRate: false, 
        error: 'Application not found' 
      };
    }
    
    const application = snapshot.docs[0].data();
    
    // Check if job is completed
    if (application.status !== 'completed') {
      return { 
        success: false, 
        canRate: false, 
        error: 'Job must be completed before rating' 
      };
    }
    
    return { 
      success: true, 
      canRate: true,
      application: { id: snapshot.docs[0].id, ...application }
    };
  } catch (error) {
    console.error('Check Can Rate Error:', error);
    return { success: false, canRate: false, error: error.message };
  }
};

/**
 * Mark job application as completed
 * @param {string} applicationId - Application ID
 * @returns {Object} - Success status
 */
export const completeJob = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    await updateDoc(appRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    
    // Get application details
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    // Update job status if needed
    const jobRef = doc(db, 'jobs', application.jobId);
    await updateDoc(jobRef, {
      status: 'closed',
      closedAt: serverTimestamp()
    });
    
    // Update worker stats
    const workerRef = doc(db, 'users', application.workerId);
    const workerSnap = await getDoc(workerRef);
    const workerData = workerSnap.data();
    
    await updateDoc(workerRef, {
      completedJobs: (workerData.completedJobs || 0) + 1,
      totalEarnings: (workerData.totalEarnings || 0) + (application.earnings || 0),
    });
    
    // Update employer stats
    const employerRef = doc(db, 'users', application.employerId);
    const employerSnap = await getDoc(employerRef);
    const employerData = employerSnap.data();
    
    await updateDoc(employerRef, {
      totalHires: (employerData.totalHires || 0) + 1,
    });
    
    // Send notifications
    await createNotification(application.workerId, {
      title: '✅ Job Completed',
      message: `Great work! Please rate your experience with the employer.`,
      type: 'job_completed',
      actionType: 'rate_employer',
      actionId: applicationId,
    });
    
    await createNotification(application.employerId, {
      title: '✅ Job Completed',
      message: `Job completed! Please rate ${application.workerName}'s performance.`,
      type: 'job_completed',
      actionType: 'rate_worker',
      actionId: applicationId,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Complete Job Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get rating statistics for a worker
 * @param {string} workerId - Worker ID
 * @returns {Object} - Rating statistics
 */
export const getWorkerRatingStats = async (workerId) => {
  try {
    const ratingsResult = await fetchWorkerRatings(workerId);
    
    if (!ratingsResult.success || ratingsResult.ratings.length === 0) {
      return {
        success: true,
        stats: {
          averageRating: 0,
          totalRatings: 0,
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }
      };
    }
    
    const ratings = ratingsResult.ratings;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;
    
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    
    return {
      success: true,
      stats: {
        averageRating: parseFloat(average.toFixed(2)),
        totalRatings: ratings.length,
        ratingBreakdown: breakdown
      }
    };
  } catch (error) {
    console.error('Get Rating Stats Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get rating statistics for an employer
 * @param {string} employerId - Employer ID
 * @returns {Object} - Rating statistics
 */
export const getEmployerRatingStats = async (employerId) => {
  try {
    const ratingsResult = await fetchEmployerRatings(employerId);
    
    if (!ratingsResult.success || ratingsResult.ratings.length === 0) {
      return {
        success: true,
        stats: {
          averageRating: 0,
          totalRatings: 0,
          ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }
      };
    }
    
    const ratings = ratingsResult.ratings;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;
    
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });
    
    return {
      success: true,
      stats: {
        averageRating: parseFloat(average.toFixed(2)),
        totalRatings: ratings.length,
        ratingBreakdown: breakdown
      }
    };
  } catch (error) {
    console.error('Get Employer Rating Stats Error:', error);
    return { success: false, error: error.message };
  }
};

// src/services/database.js - ADD THESE NEW FUNCTIONS

// ========== JOB TRACKING FUNCTIONS ==========

/**
 * Update worker's journey status (on the way, reached, started, completed)
 * @param {string} applicationId - Application ID
 * @param {string} status - Journey status
 * @param {Object} additionalData - Any additional data to store
 * @returns {Object} - Success status
 */
export const updateWorkerJourneyStatus = async (applicationId, status) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const timestamp = serverTimestamp();
    
    const updates = {
      journeyStatus: status,
      updatedAt: timestamp
    };

    // Add specific timestamps based on status
    if (status === 'onTheWay') {
      updates.onTheWayAt = timestamp;
    } else if (status === 'reached') {
      updates.reachedAt = timestamp;
    } else if (status === 'started') {
      updates.workStartedAt = timestamp;
      updates.workStartedTimestamp = new Date().getTime();
    } else if (status === 'completed') {
      updates.workCompletedAt = timestamp;
      updates.workCompletedTimestamp = new Date().getTime();
      
      // Calculate work duration if started timestamp exists
      const appSnap = await getDoc(appRef);
      const appData = appSnap.data();
      
      if (appData.workStartedTimestamp) {
        const durationMs = new Date().getTime() - appData.workStartedTimestamp;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
        updates.actualWorkDuration = parseFloat(durationHours);
        
        // Calculate payment
        if (appData.hourlyRate) {
          updates.calculatedPayment = Math.round(parseFloat(durationHours) * appData.hourlyRate);
        }
      }
    }

    await updateDoc(appRef, updates);

    // Send notification to employer
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    let notificationTitle = '';
    let notificationMessage = '';

    switch (status) {
      case 'onTheWay':
        notificationTitle = '🚗 Worker is on the way';
        notificationMessage = `${application.workerName} is heading to your location`;
        break;
      case 'reached':
        notificationTitle = '📍 Worker has arrived';
        notificationMessage = `${application.workerName} has reached your location`;
        break;
      case 'started':
        notificationTitle = '▶️ Work has started';
        notificationMessage = `${application.workerName} has started working`;
        break;
      case 'completed':
        notificationTitle = '✅ Work completed';
        notificationMessage = `${application.workerName} has completed the work`;
        break;
    }

    if (notificationTitle) {
      await createNotification(application.employerId, {
        title: notificationTitle,
        message: notificationMessage,
        type: 'worker_status_update',
        actionType: 'view_application',
        actionId: applicationId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Update Journey Status Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process payment for completed work
 * @param {string} applicationId - Application ID
 * @param {Object} paymentData - Payment details
 * @returns {Object} - Success status
 */
export const processPayment = async (applicationId, paymentData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    
    await updateDoc(appRef, {
      paymentStatus: 'paid',
      paymentAmount: paymentData.amount,
      paymentMethod: paymentData.method,
      paymentNotes: paymentData.notes || '',
      paidAt: serverTimestamp(),
      status: 'completed'
    });

    // Get application details
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();

    // Update worker's earnings
    const workerRef = doc(db, 'users', application.workerId);
    const workerSnap = await getDoc(workerRef);
    const workerData = workerSnap.data();

    await updateDoc(workerRef, {
      totalEarnings: (workerData.totalEarnings || 0) + paymentData.amount,
      completedJobs: (workerData.completedJobs || 0) + 1,
    });

    // Update employer stats
    const employerRef = doc(db, 'users', application.employerId);
    const employerSnap = await getDoc(employerRef);
    const employerData = employerSnap.data();

    await updateDoc(employerRef, {
      totalPayments: (employerData.totalPayments || 0) + paymentData.amount,
      totalHires: (employerData.totalHires || 0) + 1,
    });

    // Send notifications
    await createNotification(application.workerId, {
      title: '💰 Payment Received',
      message: `You've received ₹${paymentData.amount} for ${application.jobTitle}`,
      type: 'payment_received',
      actionType: 'view_earnings',
    });

    await createNotification(application.employerId, {
      title: '✅ Payment Processed',
      message: `Payment of ₹${paymentData.amount} has been processed for ${application.workerName}`,
      type: 'payment_processed',
      actionType: 'view_application',
      actionId: applicationId,
    });

    return { success: true };
  } catch (error) {
    console.error('Process Payment Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mark payment as pending (for cash payments)
 * @param {string} applicationId - Application ID
 * @returns {Object} - Success status
 */
export const markPaymentPending = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    
    await updateDoc(appRef, {
      paymentStatus: 'pending',
      status: 'awaiting_payment'
    });

    return { success: true };
  } catch (error) {
    console.error('Mark Payment Pending Error:', error);
    return { success: false, error: error.message };
  }
};


export const getApplicationWithJob = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const appSnap = await getDoc(appRef);
    
    if (!appSnap.exists()) {
      return { success: false, error: 'Application not found' };
    }

    const application = { id: appSnap.id, ...appSnap.data() };
    
    // Get job details
    const jobRef = doc(db, 'jobs', application.jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const job = { id: jobSnap.id, ...jobSnap.data() };

    return {
      success: true,
      application,
      job
    };
  } catch (error) {
    console.error('Get Application With Job Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get job timing details
 * @param {string} jobId - Job ID
 * @returns {Object} - Job timing information
 */
export const getJobTiming = async (jobId) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const jobData = jobSnap.data();
    return {
      success: true,
      timing: {
        date: jobData.jobDate,
        startTime: jobData.startTime,
        endTime: jobData.endTime,
        duration: jobData.expectedDuration,
      }
    };
  } catch (error) {
    console.error('Get Job Timing Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if worker can start work (based on scheduled time)
 * @param {string} applicationId - Application ID
 * @returns {Object} - Can start status and time details
 */
export const checkCanStartWork = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const appSnap = await getDoc(appRef);
    
    if (!appSnap.exists()) {
      return { success: false, error: 'Application not found' };
    }

    const application = appSnap.data();
    
    // Worker must have reached location first
    if (application.journeyStatus !== 'reached') {
      return { 
        success: true, 
        canStart: false, 
        error: 'Please reach the location first before starting work'
      };
    }

    // Get job timing
    const jobRef = doc(db, 'jobs', application.jobId);
    const jobSnap = await getDoc(jobRef);
    const job = jobSnap.data();

    if (!job.jobDate || !job.startTime) {
      return { success: true, canStart: true }; // No timing restrictions
    }

    const now = new Date();
    const jobDate = new Date(job.jobDate);
    const [startHours, startMinutes] = job.startTime.split(':');
    const startTime = new Date(jobDate);
    startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

    // Allow starting 30 minutes before scheduled time
    const thirtyMinsBefore = new Date(startTime.getTime() - 30 * 60000);
    
    if (now < thirtyMinsBefore) {
      const minutesUntilStart = Math.ceil((thirtyMinsBefore - now) / 60000);
      return {
        success: true,
        canStart: false,
        minutesUntilStart,
        error: `You can start work in ${minutesUntilStart} minutes (from 30 minutes before scheduled time)`
      };
    }

    return { success: true, canStart: true };
  } catch (error) {
    console.error('Check Can Start Work Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== MODIFIED createJob FUNCTION ==========
// Replace the existing createJob function with this updated version

export const createJobWithTiming = async (jobData) => {
  try {
    // Validate required timing fields
    if (!jobData.jobDate) {
      return { success: false, error: 'Job date is required' };
    }
    if (!jobData.startTime) {
      return { success: false, error: 'Start time is required' };
    }
    if (!jobData.endTime) {
      return { success: false, error: 'End time is required' };
    }

    // Calculate expected duration
    const start = new Date(`${jobData.jobDate} ${jobData.startTime}`);
    const end = new Date(`${jobData.jobDate} ${jobData.endTime}`);
    const durationHours = (end - start) / (1000 * 60 * 60);

    const docRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      status: 'open',
      createdAt: serverTimestamp(),
      applications: [],
      category: jobData.category || 'General',
      expectedDuration: durationHours.toFixed(2),
      hourlyRate: jobData.rate,
      totalPayment: Math.round(durationHours * jobData.rate),
    });

    return { success: true, jobId: docRef.id };
  } catch (error) {
    console.error('Create Job Error:', error);
    return { success: false, error: error.message };
  }
};

// ========== MODIFIED updateApplicationStatus FUNCTION ==========
// Replace the existing updateApplicationStatus with this version

export const getWorkerCurrentJob = async (workerId) => {
  try {
    const q = query(
      collection(db, 'applications'),
      where('workerId', '==', workerId),
      where('status', '==', 'accepted'),
      where('journeyStatus', 'in', ['accepted', 'onTheWay', 'reached', 'started']),
      orderBy('appliedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: true, currentJob: null };
    }

    const application = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    
    // Get job details
    const jobRef = doc(db, 'jobs', application.jobId);
    const jobSnap = await getDoc(jobRef);
    const job = jobSnap.exists() ? { id: jobSnap.id, ...jobSnap.data() } : null;

    return {
      success: true,
      currentJob: {
        application,
        job
      }
    };
  } catch (error) {
    console.error('Get Worker Current Job Error:', error);
    return { success: false, error: error.message };
  }
};

export const updateApplicationStatusWithTiming = async (applicationId, status, locationData = null) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const updates = {
      status,
      respondedAt: serverTimestamp()
    };

    if (status === 'accepted' && locationData) {
      updates.employerLocation = locationData;
      updates.locationShared = true;
      updates.chatEnabled = true;
      updates.locationSharedAt = serverTimestamp();
      updates.journeyStatus = 'accepted'; // Initial journey status
      updates.paymentStatus = 'pending';
    }

    await updateDoc(appRef, updates);

    if (status === 'accepted') {
      const appSnap = await getDoc(appRef);
      const application = appSnap.data();
      
      // Get job details for timing info
      const jobRef = doc(db, 'jobs', application.jobId);
      const jobSnap = await getDoc(jobRef);
      const job = jobSnap.data();
      
      // Store hourly rate and expected payment in application
      await updateDoc(appRef, {
        hourlyRate: job.rate,
        expectedPayment: job.totalPayment,
        jobDate: job.jobDate,
        jobStartTime: job.startTime,
        jobEndTime: job.endTime,
      });
      
      await createChat(applicationId, [
        application.employerId,
        application.workerId
      ]);

      // Send notification with job timing
      await createNotification(application.workerId, {
        title: '🎉 Application Accepted!',
        message: `Your application for ${application.jobTitle} has been accepted. Job scheduled for ${job.jobDate} from ${job.startTime} to ${job.endTime}`,
        type: 'application_accepted',
        actionType: 'view_job_details',
        actionId: applicationId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Update Application Error:', error);
    return { success: false, error: error.message };
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

// ========== JOB DELETION ==========

/**
 * Delete a job (only if no accepted applications)
 * @param {string} jobId - Job ID
 * @param {string} employerId - Employer ID (for verification)
 * @returns {Object} - Success status
 */
export const deleteJob = async (jobId, employerId) => {
  try {
    // Verify job belongs to employer
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const jobData = jobSnap.data();
    
    if (jobData.employerId !== employerId) {
      return { success: false, error: 'Unauthorized: This is not your job' };
    }

    // Check for accepted applications
    const applicationsQuery = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      where('status', '==', 'accepted')
    );
    
    const applicationsSnap = await getDocs(applicationsQuery);
    
    if (!applicationsSnap.empty) {
      return { 
        success: false, 
        error: 'Cannot delete job with accepted applications. Please complete or reject them first.' 
      };
    }

    // Get all pending applications to notify workers
    const allApplicationsQuery = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId)
    );
    
    const allApplicationsSnap = await getDocs(allApplicationsQuery);
    
    // Notify all applicants
    for (const appDoc of allApplicationsSnap.docs) {
      const appData = appDoc.data();
      
      if (appData.status === 'pending') {
        await createNotification(appData.workerId, {
          title: '❌ Job Cancelled',
          message: `The job "${jobData.title}" has been cancelled by the employer.`,
          type: 'job_cancelled',
          actionType: 'view_jobs',
        });
      }
      
      // Delete application
      await deleteDoc(doc(db, 'applications', appDoc.id));
    }

    // Delete the job
    await deleteDoc(jobRef);

    return { success: true, message: 'Job deleted successfully' };
  } catch (error) {
    console.error('Delete Job Error:', error);
    return { success: false, error: error.message };
  }
};

// src/services/database.js - ADD THESE FUNCTIONS

/**
 * Process online payment via Razorpay
 * @param {string} applicationId - Application ID
 * @param {Object} paymentData - Payment details including Razorpay response
 * @returns {Object} - Success status
 */
export const processOnlinePayment = async (applicationId, paymentData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    
    const paymentRecord = {
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      method: 'online',
      provider: 'razorpay',
      status: 'completed',
      verified: paymentData.verified,
      processedAt: serverTimestamp(),
      razorpayData: paymentData
    };

    await updateDoc(appRef, {
      paymentStatus: 'paid',
      paymentAmount: paymentData.amount,
      paymentMethod: 'online',
      paymentProvider: 'razorpay',
      paymentDetails: paymentRecord,
      paidAt: serverTimestamp(),
      status: 'completed'
    });

    // Get application details
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();

    // Update worker's earnings
    const workerRef = doc(db, 'users', application.workerId);
    const workerSnap = await getDoc(workerRef);
    const workerData = workerSnap.data();

    await updateDoc(workerRef, {
      totalEarnings: (workerData.totalEarnings || 0) + paymentData.amount,
      completedJobs: (workerData.completedJobs || 0) + 1,
      lastPayment: paymentData.amount,
      lastPaymentDate: serverTimestamp()
    });

    // Update employer stats
    const employerRef = doc(db, 'users', application.employerId);
    const employerSnap = await getDoc(employerRef);
    const employerData = employerSnap.data();

    await updateDoc(employerRef, {
      totalPayments: (employerData.totalPayments || 0) + paymentData.amount,
      totalHires: (employerData.totalHires || 0) + 1,
      onlinePayments: (employerData.onlinePayments || 0) + paymentData.amount
    });

    // Add to worker's earnings history
    const earningsRef = await addDoc(collection(db, 'earnings'), {
      workerId: application.workerId,
      applicationId: applicationId,
      amount: paymentData.amount,
      jobTitle: application.jobTitle,
      employerName: application.employerName,
      paymentMethod: 'online',
      paymentProvider: 'razorpay',
      paymentId: paymentData.paymentId,
      status: 'completed',
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    // Send notifications
    await createNotification(application.workerId, {
      title: '💰 Online Payment Received',
      message: `You've received ₹${paymentData.amount} for ${application.jobTitle} via online payment`,
      type: 'payment_received',
      actionType: 'view_earnings',
    });

    await createNotification(application.employerId, {
      title: '✅ Online Payment Successful',
      message: `Payment of ₹${paymentData.amount} has been processed successfully for ${application.workerName}`,
      type: 'payment_processed',
      actionType: 'view_application',
      actionId: applicationId,
    });

    return { success: true, paymentRecord };
  } catch (error) {
    console.error('Process Online Payment Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get worker's earnings history
 * @param {string} workerId - Worker ID
 * @returns {Object} - Earnings history
 */
export const fetchWorkerEarnings = async (workerId) => {
  try {
    const q = query(
      collection(db, 'earnings'),
      where('workerId', '==', workerId),
      orderBy('paidAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const earnings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, earnings };
  } catch (error) {
    console.error('Fetch Earnings Error:', error);
    return { success: false, error: error.message, earnings: [] };
  }
};

/**
 * Get worker's total earnings statistics
 * @param {string} workerId - Worker ID
 * @returns {Object} - Earnings statistics
 */
export const getWorkerEarningsStats = async (workerId) => {
  try {
    const earningsResult = await fetchWorkerEarnings(workerId);
    
    if (!earningsResult.success) {
      return { success: false, error: earningsResult.error };
    }

    const earnings = earningsResult.earnings;
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    const completedJobs = earnings.length;
    
    // Monthly earnings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyEarnings = earnings
      .filter(earning => {
        const earningDate = earning.paidAt?.toDate();
        return earningDate && 
               earningDate.getMonth() === currentMonth && 
               earningDate.getFullYear() === currentYear;
      })
      .reduce((sum, earning) => sum + earning.amount, 0);

    return {
      success: true,
      stats: {
        totalEarnings,
        completedJobs,
        monthlyEarnings,
        averageEarning: completedJobs > 0 ? totalEarnings / completedJobs : 0
      }
    };
  } catch (error) {
    console.error('Get Earnings Stats Error:', error);
    return { success: false, error: error.message };
  }
};

// Add this function to your Database.js
export const completeJobAndRemoveTracking = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    
    // Update application status to completed
    await updateDoc(appRef, {
      status: 'completed',
      journeyStatus: 'completed',
      completedAt: serverTimestamp(),
      paymentStatus: 'pending' // or 'paid' if payment was processed
    });

    // Get application details for notifications
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    // Update job status
    const jobRef = doc(db, 'jobs', application.jobId);
    await updateDoc(jobRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Send completion notifications
    await createNotification(application.workerId, {
      title: '✅ Job Completed!',
      message: `Great work on completing "${application.jobTitle}"!`,
      type: 'job_completed',
      actionType: 'rate_employer',
      actionId: applicationId,
    });

    await createNotification(application.employerId, {
      title: '✅ Job Completed',
      message: `${application.workerName} has completed the job "${application.jobTitle}"`,
      type: 'job_completed',
      actionType: 'rate_worker',
      actionId: applicationId,
    });

    return { success: true };
  } catch (error) {
    console.error('Complete Job Error:', error);
    return { success: false, error: error.message };
  }
};

// Add this to your Database.js for real-time current job monitoring
export const onWorkerCurrentJobUpdate = (workerId, callback) => {
  const applicationsQuery = query(
    collection(db, 'applications'),
    where('workerId', '==', workerId),
    where('status', '==', 'accepted'),
    where('journeyStatus', 'in', ['accepted', 'onTheWay', 'reached', 'started'])
  );

  return onSnapshot(applicationsQuery, (snapshot) => {
    if (!snapshot.empty) {
      const applicationDoc = snapshot.docs[0];
      const application = { 
        id: applicationDoc.id, 
        ...applicationDoc.data() 
      };
      
      // Get job details
      const jobRef = doc(db, 'jobs', application.jobId);
      getDoc(jobRef).then(jobSnap => {
        if (jobSnap.exists()) {
          const job = { id: jobSnap.id, ...jobSnap.data() };
          callback({ application, job });
        }
      });
    } else {
      callback(null); // No current job
    }
  });
};