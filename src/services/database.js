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

// In src/services/database.js - UPDATE THIS FUNCTION
export const fetchEmployerJobs = async (employerId) => {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId)
      // REMOVED: where('status', '==', 'open') - Fetch all jobs
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
    // Check if rating already exists
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

    // CRITICAL: Update application status to completed and set hasRating flag
    if (ratingData.applicationId) {
      const appRef = doc(db, 'applications', ratingData.applicationId);
      await updateDoc(appRef, {
        status: 'completed',
        hasRating: true,
        ratedAt: serverTimestamp(),
        employerRating: ratingData.rating,
        employerComment: ratingData.comment || '',
      });
    }

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
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('workerId', '==', workerId)
    );
    
    const snapshot = await getDocs(ratingsQuery);
    const ratings = snapshot.docs.map(doc => doc.data());
    
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
      const average = sum / ratings.length;
      
      const userRef = doc(db, 'users', workerId);
      await updateDoc(userRef, {
        rating: parseFloat(average.toFixed(2)),
        totalRatings: ratings.length,
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
// In src/services/database.js - UPDATE THIS FUNCTION
/**
 * Update worker's journey status (on the way, reached, started, completed)
 * @param {string} applicationId - Application ID
 * @param {string} status - Journey status
 * @param {Object} additionalData - Any additional data to store
 * @returns {Object} - Success status
 */
// In src/services/database.js - FIX THE PAYMENT CALCULATION
export const updateWorkerJourneyStatus = async (applicationId, status) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const timestamp = serverTimestamp();
    const currentTime = new Date().getTime();
    
    const updates = {
      journeyStatus: status,
      updatedAt: timestamp
    };

    console.log('=== UPDATING JOURNEY STATUS ===');
    console.log('Application ID:', applicationId);
    console.log('New Status:', status);
    console.log('Current Time:', currentTime);

    // Add specific timestamps based on status
    if (status === 'onTheWay') {
      updates.onTheWayAt = timestamp;
    } else if (status === 'reached') {
      updates.reachedAt = timestamp;
    } else if (status === 'started') {
      updates.workStartedAt = timestamp;
      updates.workStartedTimestamp = currentTime;
      console.log('Work started - timestamp set:', currentTime);
    } else if (status === 'completed') {
      // CRITICAL: Set BOTH server timestamp and client timestamp
      updates.workCompletedAt = timestamp;
      updates.workCompletedTimestamp = currentTime;
      updates.completedAt = timestamp;
      
      console.log('Work completed - setting timestamps:', {
        serverTimestamp: timestamp,
        clientTimestamp: currentTime
      });
      
      // CRITICAL: Set payment status to pending when work completes
      updates.paymentStatus = 'pending';
      updates.status = 'awaiting_payment';
      
      // Get current application data to calculate payment
      const appSnap = await getDoc(appRef);
      const appData = appSnap.data();
      
      console.log('Current application data for payment calculation:', {
        workStartedTimestamp: appData.workStartedTimestamp,
        workCompletedTimestamp: currentTime,
        hourlyRate: appData.hourlyRate,
        expectedPayment: appData.expectedPayment
      });
      
      // Calculate work duration and payment based on actual hours worked
      if (appData.workStartedTimestamp) {
        const durationMs = currentTime - appData.workStartedTimestamp;
        const durationMinutes = durationMs / (1000 * 60);
        const durationHours = durationMinutes / 60;
        
        updates.actualWorkDuration = parseFloat(durationHours.toFixed(4));
        updates.actualWorkMinutes = Math.round(durationMinutes);
        
        console.log('Work duration calculation:', {
          startTime: appData.workStartedTimestamp,
          endTime: currentTime,
          durationMs: durationMs,
          durationMinutes: durationMinutes,
          durationHours: durationHours
        });

        // FIXED PAYMENT CALCULATION - PROPER MINUTE-BASED CALCULATION
        if (appData.hourlyRate) {
          const hourlyRate = appData.hourlyRate;
          let calculatedPayment = 0;
          
          // Calculate payment per minute
          const ratePerMinute = hourlyRate / 60;
          calculatedPayment = Math.round(durationMinutes * ratePerMinute);
          
          // Ensure minimum payment of at least 1 rupee
          calculatedPayment = Math.max(1, calculatedPayment);
          
          updates.calculatedPayment = calculatedPayment;
          
          console.log('WORK COMPLETED - CORRECTED PAYMENT CALCULATION:', {
            workStarted: new Date(appData.workStartedTimestamp).toLocaleString(),
            workCompleted: new Date(currentTime).toLocaleString(),
            durationMinutes: Math.round(durationMinutes),
            durationHours: durationHours.toFixed(4),
            hourlyRate: hourlyRate,
            ratePerMinute: ratePerMinute.toFixed(2),
            calculatedPayment: calculatedPayment,
            expectedPayment: appData.expectedPayment
          });
        } else {
          console.warn('No hourly rate found for payment calculation');
          updates.calculatedPayment = appData.expectedPayment || 0;
        }
      } else {
        // Fallback to expected payment if no start timestamp
        console.warn('No work start timestamp found, using expected payment');
        updates.calculatedPayment = appData.expectedPayment || 0;
      }
    }

    console.log('Final updates to be applied:', updates);
    await updateDoc(appRef, updates);
    console.log('Successfully updated application with journey status:', status);

    // Get updated application data for notifications
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
        const actualPayment = application.calculatedPayment || application.expectedPayment;
        const durationText = application.actualWorkMinutes < 60 
          ? `${application.actualWorkMinutes} minutes` 
          : `${(application.actualWorkDuration || 0).toFixed(2)} hours`;
        
        notificationTitle = '💰 Payment Required';
        notificationMessage = `${application.workerName} has completed the work in ${durationText}. Payment due: ₹${actualPayment}`;
        break;
    }

    if (notificationTitle) {
      await createNotification(application.employerId, {
        title: notificationTitle,
        message: notificationMessage,
        type: status === 'completed' ? 'payment_required' : 'worker_status_update',
        actionType: status === 'completed' ? 'process_payment' : 'view_application',
        actionId: applicationId,
      });
      console.log('Notification sent successfully');
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
// src/services/database.js - FIXED processPayment function
export const processPayment = async (applicationId, paymentData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Use calculated payment if available, otherwise use the provided amount
    const finalAmount = application.calculatedPayment || paymentData.amount;
    
    console.log('Processing Payment:', {
      providedAmount: paymentData.amount,
      calculatedPayment: application.calculatedPayment,
      finalAmount: finalAmount,
      actualWorkDuration: application.actualWorkDuration,
      hourlyRate: application.hourlyRate
    });

    // CRITICAL FIX: Ensure all required fields have values
    const employerName = application.employerName || 'Employer';
    const workerName = application.workerName || 'Worker';
    const jobTitle = application.jobTitle || 'Job';
    const actualWorkDuration = application.actualWorkDuration || 0;
    const hourlyRate = application.hourlyRate || 0;

    console.log('Payment data validation:', {
      employerName,
      workerName,
      jobTitle,
      actualWorkDuration,
      hourlyRate
    });

    // Update application with payment details
    await updateDoc(appRef, {
      paymentStatus: 'paid',
      paymentAmount: finalAmount,
      paymentMethod: paymentData.method,
      paymentNotes: paymentData.notes || '',
      paidAt: serverTimestamp(),
      status: 'completed', // CRITICAL: Change from 'awaiting_rating' to 'completed'
      hasRating: false,
      journeyStatus: 'completed', // Ensure journey status is also completed
    });

    // Update job status to completed
    const jobRef = doc(db, 'jobs', application.jobId);
    await updateDoc(jobRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Update worker's earnings
    const workerRef = doc(db, 'users', application.workerId);
    const workerSnap = await getDoc(workerRef);
    const workerData = workerSnap.data();

    await updateDoc(workerRef, {
      totalEarnings: (workerData.totalEarnings || 0) + finalAmount,
      completedJobs: (workerData.completedJobs || 0) + 1,
    });

    // Update employer stats
    const employerRef = doc(db, 'users', application.employerId);
    const employerSnap = await getDoc(employerRef);
    const employerData = employerSnap.data();

    await updateDoc(employerRef, {
      totalPayments: (employerData.totalPayments || 0) + finalAmount,
      totalHires: (employerData.totalHires || 0) + 1,
    });

    // Add to worker's earnings history - FIXED: Ensure no undefined values
    const earningsData = {
      workerId: application.workerId,
      applicationId: applicationId,
      amount: finalAmount,
      jobTitle: jobTitle,
      employerName: employerName,
      paymentMethod: paymentData.method,
      actualWorkDuration: actualWorkDuration,
      hourlyRate: hourlyRate,
      status: 'completed',
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    console.log('Creating earnings record:', earningsData);
    
    await addDoc(collection(db, 'earnings'), earningsData);

    // Send notifications
    await createNotification(application.workerId, {
      title: '💰 Payment Received',
      message: `You've received ₹${finalAmount} for ${jobTitle} (${actualWorkDuration} hours worked)`,
      type: 'payment_received',
      actionType: 'view_earnings',
    });

    await createNotification(application.employerId, {
      title: '⭐ Rate Worker Performance',
      message: `Payment of ₹${finalAmount} processed for ${actualWorkDuration} hours of work. Please rate ${workerName}'s work.`,
      type: 'rating_required',
      actionType: 'rate_worker',
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
// src/services/database.js - FIXED processOnlinePayment function
export const processOnlinePayment = async (applicationId, paymentData) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const appSnap = await getDoc(appRef);
    const application = appSnap.data();
    
    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    // Use calculated payment if available, otherwise use the provided amount
    const finalAmount = application.calculatedPayment || paymentData.amount;
    
    console.log('Processing Online Payment:', {
      providedAmount: paymentData.amount,
      calculatedPayment: application.calculatedPayment,
      finalAmount: finalAmount,
      actualWorkDuration: application.actualWorkDuration
    });

    // CRITICAL FIX: Ensure all required fields have values
    const employerName = application.employerName || 'Employer';
    const workerName = application.workerName || 'Worker';
    const jobTitle = application.jobTitle || 'Job';
    const actualWorkDuration = application.actualWorkDuration || 0;
    const hourlyRate = application.hourlyRate || 0;

    const paymentRecord = {
      paymentId: paymentData.paymentId,
      orderId: paymentData.orderId,
      amount: finalAmount,
      method: 'online',
      provider: 'razorpay',
      status: 'completed',
      verified: paymentData.verified,
      processedAt: serverTimestamp(),
      razorpayData: paymentData
    };

    await updateDoc(appRef, {
      paymentStatus: 'paid',
      paymentAmount: finalAmount,
      paymentMethod: 'online',
      paymentProvider: 'razorpay',
      paymentDetails: paymentRecord,
      paidAt: serverTimestamp(),
      status: 'completed', // CRITICAL: Change from 'awaiting_rating' to 'completed'
      hasRating: false,
      journeyStatus: 'completed', // Ensure journey status is also completed
    });

    // Update job status to completed
    const jobRef = doc(db, 'jobs', application.jobId);
    await updateDoc(jobRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Update worker's earnings
    const workerRef = doc(db, 'users', application.workerId);
    const workerSnap = await getDoc(workerRef);
    const workerData = workerSnap.data();

    await updateDoc(workerRef, {
      totalEarnings: (workerData.totalEarnings || 0) + finalAmount,
      completedJobs: (workerData.completedJobs || 0) + 1,
      lastPayment: finalAmount,
      lastPaymentDate: serverTimestamp()
    });

    // Update employer stats
    const employerRef = doc(db, 'users', application.employerId);
    const employerSnap = await getDoc(employerRef);
    const employerData = employerSnap.data();

    await updateDoc(employerRef, {
      totalPayments: (employerData.totalPayments || 0) + finalAmount,
      totalHires: (employerData.totalHires || 0) + 1,
      onlinePayments: (employerData.onlinePayments || 0) + finalAmount
    });

    // Add to worker's earnings history - FIXED: Ensure no undefined values
    const earningsData = {
      workerId: application.workerId,
      applicationId: applicationId,
      amount: finalAmount,
      jobTitle: jobTitle,
      employerName: employerName,
      paymentMethod: 'online',
      paymentProvider: 'razorpay',
      paymentId: paymentData.paymentId,
      actualWorkDuration: actualWorkDuration,
      hourlyRate: hourlyRate,
      status: 'completed',
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    console.log('Creating online earnings record:', earningsData);
    
    await addDoc(collection(db, 'earnings'), earningsData);

    // Send notifications
    await createNotification(application.workerId, {
      title: '💰 Online Payment Received',
      message: `You've received ₹${finalAmount} for ${jobTitle} via online payment (${actualWorkDuration} hours worked)`,
      type: 'payment_received',
      actionType: 'view_earnings',
    });

    await createNotification(application.employerId, {
      title: '⭐ Rate Worker Performance',
      message: `Payment of ₹${finalAmount} processed for ${actualWorkDuration} hours of work. Please rate ${workerName}'s work.`,
      type: 'rating_required',
      actionType: 'rate_worker',
      actionId: applicationId,
    });

    return { success: true, paymentRecord };
  } catch (error) {
    console.error('Process Online Payment Error:', error);
    return { success: false, error: error.message };
  }
};

// FIXED calculateActualPayment function
const calculateActualPayment = (appData) => {
  try {
    console.log('=== CALCULATE ACTUAL PAYMENT DEBUG ===');
    console.log('All relevant data:', {
      workStartedTimestamp: appData.workStartedTimestamp,
      workCompletedTimestamp: appData.workCompletedTimestamp,
      calculatedPayment: appData.calculatedPayment,
      actualWorkDuration: appData.actualWorkDuration,
      actualWorkMinutes: appData.actualWorkMinutes,
      hourlyRate: appData.hourlyRate,
      expectedPayment: appData.expectedPayment,
      journeyStatus: appData.journeyStatus
    });

    // Priority 1: Use calculated payment from database
    if (appData.calculatedPayment !== undefined && appData.calculatedPayment !== null && appData.calculatedPayment > 0) {
      console.log('Using database calculated payment:', appData.calculatedPayment);
      return appData.calculatedPayment;
    }

    // Priority 2: Calculate from actual work timestamps
    if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
      const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
      const durationMinutes = durationMs / (1000 * 60);
      const hourlyRate = appData.hourlyRate || 0;
      
      // CORRECTED CALCULATION: Payment per minute
      const ratePerMinute = hourlyRate / 60;
      let calculatedPayment = Math.round(durationMinutes * ratePerMinute);
      calculatedPayment = Math.max(1, calculatedPayment);

      console.log('CORRECTED Calculation from timestamps:', {
        durationMinutes: Math.round(durationMinutes),
        hourlyRate: hourlyRate,
        ratePerMinute: ratePerMinute.toFixed(2),
        calculatedPayment: calculatedPayment
      });

      return calculatedPayment;
    }

    // Priority 3: Calculate from actualWorkMinutes
    if (appData.actualWorkMinutes && appData.actualWorkMinutes > 0) {
      const durationMinutes = appData.actualWorkMinutes;
      const hourlyRate = appData.hourlyRate || 0;
      
      // CORRECTED CALCULATION: Payment per minute
      const ratePerMinute = hourlyRate / 60;
      let calculatedPayment = Math.round(durationMinutes * ratePerMinute);
      calculatedPayment = Math.max(1, calculatedPayment);

      console.log('CORRECTED Calculation from actualWorkMinutes:', {
        durationMinutes: durationMinutes,
        hourlyRate: hourlyRate,
        ratePerMinute: ratePerMinute.toFixed(2),
        calculatedPayment: calculatedPayment
      });

      return calculatedPayment;
    }

    // Final fallback: Expected payment
    console.log('Using expected payment as fallback:', appData.expectedPayment);
    return appData.expectedPayment || 0;

  } catch (error) {
    console.error('Payment calculation error:', error);
    return appData.expectedPayment || 0;
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

/**
 * Fix completed jobs that are missing completion timestamps and calculated payments
 * @param {string} applicationId - Application ID
 * @returns {Object} - Success status
 */
export const fixCompletedJobPayment = async (applicationId) => {
  try {
    const appRef = doc(db, 'applications', applicationId);
    const appSnap = await getDoc(appRef);
    
    if (!appSnap.exists()) {
      return { success: false, error: 'Application not found' };
    }

    const appData = appSnap.data();
    
    // Only fix jobs that are completed but missing completion timestamp
    if (appData.journeyStatus === 'completed' && appData.workStartedTimestamp && !appData.workCompletedTimestamp) {
      console.log('Fixing completed job payment for:', applicationId);
      
      const currentTime = new Date().getTime();
      const durationMs = currentTime - appData.workStartedTimestamp;
      const durationMinutes = durationMs / (1000 * 60);
      const durationHours = durationMs / (1000 * 60 * 60);
      
      let calculatedPayment = 0;
      const hourlyRate = appData.hourlyRate || 0;
      
      if (durationMinutes < 60) {
        const proportion = durationMinutes / 60;
        calculatedPayment = Math.round(hourlyRate * proportion);
        const minPayment = Math.round(hourlyRate * 0.25);
        if (calculatedPayment < minPayment && durationMinutes > 0) {
          calculatedPayment = minPayment;
        }
      } else {
        calculatedPayment = Math.round(durationHours * hourlyRate);
      }
      
      calculatedPayment = Math.max(1, calculatedPayment);
      
      const updates = {
        workCompletedTimestamp: currentTime,
        workCompletedAt: serverTimestamp(),
        calculatedPayment: calculatedPayment,
        actualWorkDuration: parseFloat(durationHours.toFixed(4)),
        actualWorkMinutes: Math.round(durationMinutes),
        paymentStatus: 'pending',
        status: 'awaiting_payment'
      };
      
      console.log('Fixing job with updates:', updates);
      await updateDoc(appRef, updates);
      
      return { 
        success: true, 
        message: 'Job payment data fixed successfully',
        calculatedPayment: calculatedPayment,
        workDuration: durationHours
      };
    }
    
    return { success: true, message: 'No fix needed - job data is complete' };
  } catch (error) {
    console.error('Fix Completed Job Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a job date is in the future
 * @param {string} jobDate - Job date in YYYY-MM-DD format
 * @param {string} jobTime - Job time (optional)
 * @returns {boolean} - True if job is in future
 */
export const isJobInFuture = (jobDate, jobTime = null) => {
  try {
    if (!jobDate) return false;
    
    const now = new Date();
    
    // Parse the job date safely
    const [year, month, day] = jobDate.split('-').map(Number);
    
    // Validate date components
    if (!year || !month || !day || year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('Invalid job date format:', jobDate);
      return false;
    }
    
    let jobDateTime;
    
    if (jobTime) {
      // Parse time safely
      const [hours, minutes] = jobTime.split(':').map(Number);
      
      // Validate time components
      if (hours === undefined || minutes === undefined || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Invalid job time format:', jobTime);
        // If time is invalid, use start of day
        jobDateTime = new Date(year, month - 1, day, 0, 0, 0);
      } else {
        jobDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      }
    } else {
      // If no time provided, consider the entire day as future
      jobDateTime = new Date(year, month - 1, day, 0, 0, 0);
    }
    
    // Validate the created date
    if (isNaN(jobDateTime.getTime())) {
      console.error('Invalid job date/time combination:', { jobDate, jobTime });
      return false;
    }
    
    console.log('Date comparison:', {
      jobDate,
      jobTime,
      jobDateTime: jobDateTime.toISOString(),
      now: now.toISOString(),
      isFuture: jobDateTime > now
    });
    
    return jobDateTime > now;
  } catch (error) {
    console.error('Error checking job date:', error);
    return false;
  }
};
/**
 * Fetch only future jobs for workers
 * @param {Object} filters - Filters object
 * @returns {Object} - Success status and filtered jobs
 */
export const fetchFutureJobs = async (filters = {}) => {
  try {
    let q = query(collection(db, 'jobs'), where('status', '==', 'open'));
    
    if (filters.location && filters.location.trim() !== '') {
      q = query(q, where('location', '==', filters.location.trim()));
    }
    
    if (filters.category && filters.category.trim() !== '' && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category.trim()));
    }
    
    const snapshot = await getDocs(q);
    const allJobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter only future jobs
    const futureJobs = allJobs.filter(job => 
      isJobInFuture(job.jobDate, job.startTime)
    );
    
    // Sort by date (closest first)
    futureJobs.sort((a, b) => {
      const aDate = new Date(a.jobDate + ' ' + (a.startTime || '00:00'));
      const bDate = new Date(b.jobDate + ' ' + (b.startTime || '00:00'));
      return aDate - bDate;
    });
    
    return { success: true, jobs: futureJobs };
  } catch (error) {
    console.error('Fetch Future Jobs Error:', error);
    return { success: false, error: error.message, jobs: [] };
  }
};

/**
 * Fetch all jobs for employer (including past jobs)
 * @param {string} employerId - Employer ID
 * @returns {Object} - Success status and all jobs
 */
/**
 * Fetch all jobs for employer (including past jobs)
 * @param {string} employerId - Employer ID
 * @returns {Object} - Success status and all jobs
 */
export const fetchAllEmployerJobs = async (employerId) => {
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
    
    // Separate future and past jobs using the same logic
    const now = new Date();
    const futureJobs = [];
    const pastJobs = [];
    
    jobs.forEach(job => {
      if (isJobInFuture(job.jobDate, job.startTime)) {
        futureJobs.push(job);
      } else {
        pastJobs.push(job);
      }
    });
    
    // Safe date sorting function
    const safeDateSort = (a, b) => {
      try {
        const getJobTimestamp = (job) => {
          if (!job.jobDate) return 0;
          
          const [year, month, day] = job.jobDate.split('-').map(Number);
          const [hours = 0, minutes = 0] = (job.startTime || '').split(':').map(Number);
          
          if (!year || !month || !day) return 0;
          
          const date = new Date(year, month - 1, day, hours, minutes, 0);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        const aTime = getJobTimestamp(a);
        const bTime = getJobTimestamp(b);
        
        return aTime - bTime; // Ascending for future jobs (closest first)
      } catch (error) {
        console.error('Error in date sorting:', error);
        return 0;
      }
    };
    
    // Sort future jobs by date (closest first)
    futureJobs.sort(safeDateSort);
    
    // Sort past jobs by date (most recent first)
    pastJobs.sort((a, b) => safeDateSort(b, a)); // Reverse for descending
    
    console.log('Job categorization:', {
      total: jobs.length,
      future: futureJobs.length,
      past: pastJobs.length,
      futureJobTitles: futureJobs.map(j => j.title),
      pastJobTitles: pastJobs.map(j => j.title)
    });
    
    return { 
      success: true, 
      futureJobs, 
      pastJobs,
      allJobs: jobs 
    };
  } catch (error) {
    console.error('Fetch All Employer Jobs Error:', error);
    return { success: false, error: error.message, futureJobs: [], pastJobs: [] };
  }
};
/**
 * Delete past job (only past jobs can be deleted)
 * @param {string} jobId - Job ID
 * @param {string} employerId - Employer ID
 * @returns {Object} - Success status
 */
export const deletePastJob = async (jobId, employerId) => {
  try {
    // Verify job belongs to employer and is in the past
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) {
      return { success: false, error: 'Job not found' };
    }

    const jobData = jobSnap.data();
    
    if (jobData.employerId !== employerId) {
      return { success: false, error: 'Unauthorized: This is not your job' };
    }

    // Check if job is in the past
    const jobDate = new Date(jobData.jobDate + ' ' + (jobData.startTime || '00:00'));
    const now = new Date();
    
    if (jobDate > now) {
      return { 
        success: false, 
        error: 'Cannot delete future jobs. Please wait until the job date has passed.' 
      };
    }

    // Check for completed applications
    const applicationsQuery = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      where('status', '==', 'completed')
    );
    
    const applicationsSnap = await getDocs(applicationsQuery);
    
    if (!applicationsSnap.empty) {
      return { 
        success: false, 
        error: 'Cannot delete job with completed applications.' 
      };
    }

    // Get all applications to notify workers and delete them
    const allApplicationsQuery = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId)
    );
    
    const allApplicationsSnap = await getDocs(allApplicationsQuery);
    
    // Delete all applications
    for (const appDoc of allApplicationsSnap.docs) {
      const appData = appDoc.data();
      
      // Notify workers if application was pending
      if (appData.status === 'pending') {
        await createNotification(appData.workerId, {
          title: '🗑️ Job Deleted',
          message: `The job "${jobData.title}" has been deleted by the employer.`,
          type: 'job_deleted',
          actionType: 'view_jobs',
        });
      }
      
      // Delete application
      await deleteDoc(doc(db, 'applications', appDoc.id));
    }

    // Delete the job
    await deleteDoc(jobRef);

    return { success: true, message: 'Past job deleted successfully' };
  } catch (error) {
    console.error('Delete Past Job Error:', error);
    return { success: false, error: error.message };
  }
};