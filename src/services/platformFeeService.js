// src/services/platformFeeService.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  addDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

const PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee
const FREE_JOBS_LIMIT = 3; // First 3 jobs are free

/**
 * Calculate platform fee for a job
 * @param {number} totalPayment - Total job payment
 * @returns {number} - Platform fee amount
 */
export const calculatePlatformFee = (totalPayment) => {
  return Math.round((totalPayment * PLATFORM_FEE_PERCENTAGE) / 100);
};

/**
 * Check if employer has pending platform fees
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Pending fees information
 */
export const checkPendingFees = async (employerId) => {
  try {
    console.log('🔍 Checking pending fees for employer:', employerId);
    
    const feesRef = collection(db, 'platformFees');
    const q = query(
      feesRef,
      where('employerId', '==', employerId),
      where('status', 'in', ['pending', 'unpaid']),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const pendingFees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure amount is a number
      amount: Number(doc.data().amount) || 0,
      needsPayment: doc.data().status === 'pending' || doc.data().status === 'unpaid'
    }));
    
    const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    console.log('📊 Found pending fees:', {
      count: pendingFees.length,
      totalAmount: totalPending,
      fees: pendingFees
    });
    
    return {
      success: true,
      hasPending: pendingFees.length > 0,
      pendingFees: pendingFees,
      totalPending: totalPending,
      oldestFee: pendingFees[0] || null
    };
  } catch (error) {
    console.error('❌ Error checking pending fees:', error);
    return { 
      success: false, 
      error: error.message,
      hasPending: false,
      pendingFees: [],
      totalPending: 0
    };
  }
};

/**
 * Get employer's job posting statistics
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Job statistics
 */
export const getEmployerJobStats = async (employerId) => {
  try {
    console.log('📈 Getting job stats for employer:', employerId);
    
    // Get total completed jobs
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId)
    );
    
    const jobsSnapshot = await getDocs(jobsQuery);
    const totalJobsPosted = jobsSnapshot.docs.length;
    
    // Get completed jobs count
    const completedJobs = jobsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.status === 'completed';
    }).length;
    
    const stats = {
      success: true,
      totalJobsPosted: totalJobsPosted,
      completedJobs: completedJobs,
      isFreeEligible: totalJobsPosted < FREE_JOBS_LIMIT,
      freeJobsRemaining: Math.max(0, FREE_JOBS_LIMIT - totalJobsPosted)
    };
    
    console.log('📈 Job stats:', stats);
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting job stats:', error);
    return { 
      success: false, 
      error: error.message,
      totalJobsPosted: 0,
      completedJobs: 0,
      isFreeEligible: false
    };
  }
};

/**
 * Create a platform fee record
 * @param {Object} feeData - Fee information
 * @returns {Object} - Success status and fee ID
 */
export const createPlatformFee = async (feeData) => {
  try {
    console.log('💰 Creating platform fee record:', feeData);
    
    const feeRef = await addDoc(collection(db, 'platformFees'), {
      employerId: feeData.employerId,
      employerName: feeData.employerName,
      jobId: feeData.jobId,
      jobTitle: feeData.jobTitle,
      amount: Number(feeData.amount) || 0,
      totalJobPayment: Number(feeData.totalJobPayment) || 0,
      status: feeData.paymentOption === 'now' ? 'paid' : 'pending',
      paymentOption: feeData.paymentOption, // 'now' or 'later'
      needsPayment: feeData.paymentOption === 'later', // Will need payment when job completes
      createdAt: serverTimestamp(),
      createdDate: new Date().toISOString(),
      dueDate: feeData.paymentOption === 'later' ? feeData.dueDate : null,
      paidAt: feeData.paymentOption === 'now' ? serverTimestamp() : null,
      paymentMethod: feeData.paymentOption === 'now' ? 'online' : null,
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE
    });
    
    console.log('✅ Platform fee created with ID:', feeRef.id);
    
    return { 
      success: true, 
      feeId: feeRef.id,
      feeAmount: feeData.amount
    };
  } catch (error) {
    console.error('❌ Error creating platform fee:', error);
    return { 
      success: false, 
      error: error.message,
      feeId: null
    };
  }
};

/**
 * Process platform fee payment
 * @param {string} feeId - Platform fee ID
 * @param {Object} paymentData - Payment details
 * @returns {Object} - Success status
 */
export const processPlatformFeePayment = async (feeId, paymentData) => {
  try {
    console.log('💳 Processing platform fee payment:', {
      feeId,
      paymentData: {
        ...paymentData,
        // Don't log full razorpay data for security
        razorpayData: paymentData.razorpayData ? '[REDACTED]' : null
      }
    });
    
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error(`Platform fee with ID ${feeId} not found`);
    }
    
    const currentFee = feeDoc.data();
    
    const updateData = {
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentData.method || 'online',
      paymentId: paymentData.paymentId || null,
      paymentDetails: {
        ...paymentData,
        processedAt: new Date().toISOString(),
        amountPaid: currentFee.amount,
        originalAmount: currentFee.totalJobPayment
      },
      needsPayment: false,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(feeRef, updateData);
    
    console.log('✅ Platform fee payment processed successfully:', {
      feeId,
      amount: currentFee.amount,
      status: 'paid'
    });
    
    return { 
      success: true,
      feeId,
      amount: currentFee.amount,
      status: 'paid'
    };
  } catch (error) {
    console.error('❌ Error processing platform fee payment:', error);
    return { 
      success: false, 
      error: error.message,
      feeId
    };
  }
};

/**
 * Mark platform fee as paid when job completes (for "pay later" option)
 * @param {string} jobId - Job ID
 * @returns {Object} - Success status
 */
export const updateFeeOnJobCompletion = async (jobId) => {
  try {
    console.log('⚡ Updating fee on job completion for job:', jobId);
    
    // Find the pending fee for this job
    const q = query(
      collection(db, 'platformFees'),
      where('jobId', '==', jobId),
      where('status', 'in', ['pending', 'unpaid'])
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const feeDoc = snapshot.docs[0];
      const feeData = feeDoc.data();
      const feeRef = doc(db, 'platformFees', feeDoc.id);
      
      const updateData = {
        jobCompletedAt: serverTimestamp(),
        needsPayment: true, // Flag that payment is now due
        updatedAt: serverTimestamp(),
        paymentDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      await updateDoc(feeRef, updateData);
      
      console.log('✅ Fee updated on job completion:', {
        feeId: feeDoc.id,
        amount: feeData.amount,
        jobId
      });
      
      return { 
        success: true, 
        feeId: feeDoc.id,
        feeAmount: feeData.amount,
        needsPayment: true
      };
    }
    
    console.log('ℹ️ No pending fee found for job:', jobId);
    return { 
      success: true, 
      message: 'No pending fee found for this job',
      feeId: null
    };
  } catch (error) {
    console.error('❌ Error updating fee on job completion:', error);
    return { 
      success: false, 
      error: error.message,
      feeId: null
    };
  }
};

/**
 * Get all platform fees for an employer
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Fees list
 */
export const getEmployerPlatformFees = async (employerId, limitCount = 50) => {
  try {
    console.log('📋 Getting all platform fees for employer:', employerId);
    
    const q = query(
      collection(db, 'platformFees'),
      where('employerId', '==', employerId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const fees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure numeric fields
      amount: Number(doc.data().amount) || 0,
      totalJobPayment: Number(doc.data().totalJobPayment) || 0
    }));
    
    const paidFees = fees.filter(fee => fee.status === 'paid');
    const pendingFees = fees.filter(fee => fee.status === 'pending');
    const unpaidFees = fees.filter(fee => fee.status === 'unpaid');
    
    const totalPaid = paidFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalUnpaid = unpaidFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    const result = {
      success: true,
      fees: fees,
      totalFees: fees.length,
      paidFees: paidFees.length,
      pendingFees: pendingFees.length,
      unpaidFees: unpaidFees.length,
      totalPaid: totalPaid,
      totalPending: totalPending,
      totalUnpaid: totalUnpaid,
      totalDue: totalPending + totalUnpaid
    };
    
    console.log('📋 Fee summary:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error getting employer fees:', error);
    return { 
      success: false, 
      error: error.message, 
      fees: [],
      totalFees: 0,
      totalPaid: 0,
      totalPending: 0,
      totalDue: 0
    };
  }
};

/**
 * Check if employer can post a job (no blocking pending fees)
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Can post status
 */
export const canPostJob = async (employerId) => {
  try {
    console.log('✅ Checking if employer can post job:', employerId);
    
    const stats = await getEmployerJobStats(employerId);
    
    if (!stats.success) {
      return { 
        success: false, 
        error: stats.error,
        canPost: false,
        reason: 'Failed to get job statistics'
      };
    }
    
    // First 3 jobs are free, no restrictions
    if (stats.totalJobsPosted < FREE_JOBS_LIMIT) {
      const result = {
        success: true,
        canPost: true,
        isFree: true,
        freeJobsRemaining: stats.freeJobsRemaining,
        reason: `Free job ${stats.totalJobsPosted + 1} of ${FREE_JOBS_LIMIT}`
      };
      
      console.log('✅ Can post (free job):', result);
      return result;
    }
    
    // Check for pending fees from completed jobs
    const pendingResult = await checkPendingFees(employerId);
    
    if (!pendingResult.success) {
      return { 
        success: false, 
        error: pendingResult.error,
        canPost: false,
        reason: 'Failed to check pending fees'
      };
    }
    
    // Check if there are any fees that need immediate payment
    const blockingFees = pendingResult.pendingFees.filter(fee => 
      fee.needsPayment === true || fee.status === 'unpaid'
    );
    
    if (blockingFees.length > 0) {
      const result = {
        success: true,
        canPost: false,
        requiresPayment: true,
        blockingFees: blockingFees,
        totalDue: blockingFees.reduce((sum, fee) => sum + fee.amount, 0),
        feeCount: blockingFees.length,
        reason: 'Please pay pending platform fees from completed jobs before posting new jobs'
      };
      
      console.log('❌ Cannot post (blocking fees):', result);
      return result;
    }
    
    // Has pending fees but job not completed yet - can still post
    const result = {
      success: true,
      canPost: true,
      isFree: false,
      hasPendingFees: pendingResult.hasPending,
      pendingAmount: pendingResult.totalPending,
      pendingCount: pendingResult.pendingFees.length,
      reason: pendingResult.hasPending 
        ? 'Has pending fees (job not completed yet) - can post new job' 
        : 'No pending fees - can post new job'
    };
    
    console.log('✅ Can post (with conditions):', result);
    return result;
  } catch (error) {
    console.error('❌ Error checking can post job:', error);
    return { 
      success: false, 
      error: error.message,
      canPost: false,
      reason: 'Error checking posting eligibility'
    };
  }
};

/**
 * Calculate job posting fee information
 * @param {number} jobPayment - Total job payment
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Fee calculation details
 */
export const calculateJobPostingFee = async (jobPayment, employerId) => {
  try {
    console.log('🧮 Calculating job posting fee:', { jobPayment, employerId });
    
    const stats = await getEmployerJobStats(employerId);
    
    if (!stats.success) {
      return { 
        success: false, 
        error: stats.error,
        jobPayment,
        platformFee: 0,
        isFree: false
      };
    }
    
    const isFree = stats.totalJobsPosted < FREE_JOBS_LIMIT;
    const platformFee = isFree ? 0 : calculatePlatformFee(jobPayment);
    const freeJobsRemaining = Math.max(0, FREE_JOBS_LIMIT - stats.totalJobsPosted);
    
    const result = {
      success: true,
      isFree: isFree,
      jobNumber: stats.totalJobsPosted + 1,
      freeJobsRemaining: freeJobsRemaining,
      platformFee: platformFee,
      feePercentage: PLATFORM_FEE_PERCENTAGE,
      jobPayment: jobPayment,
      totalWithFee: jobPayment + platformFee,
      message: isFree 
        ? `Free job posting (${stats.totalJobsPosted + 1}/${FREE_JOBS_LIMIT}) - ${freeJobsRemaining} free jobs remaining`
        : `Platform fee: ₹${platformFee} (${PLATFORM_FEE_PERCENTAGE}% of ₹${jobPayment})`,
      breakdown: {
        jobPayment: jobPayment,
        platformFee: platformFee,
        total: jobPayment + platformFee,
        isFree: isFree
      }
    };
    
    console.log('🧮 Fee calculation result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error calculating job posting fee:', error);
    return { 
      success: false, 
      error: error.message,
      jobPayment,
      platformFee: 0,
      isFree: false
    };
  }
};

/**
 * Get blocking fees that prevent job posting
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Blocking fees information
 */
export const getBlockingFees = async (employerId) => {
  try {
    console.log('🚫 Getting blocking fees for employer:', employerId);
    
    const pendingResult = await checkPendingFees(employerId);
    
    if (!pendingResult.success) {
      return { 
        success: false, 
        error: pendingResult.error,
        hasBlockingFees: false,
        blockingFees: []
      };
    }
    
    const blockingFees = pendingResult.pendingFees.filter(fee => 
      fee.needsPayment === true || fee.status === 'unpaid'
    );
    
    const totalDue = blockingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    const result = {
      success: true,
      hasBlockingFees: blockingFees.length > 0,
      blockingFees: blockingFees,
      totalDue: totalDue,
      feeCount: blockingFees.length
    };
    
    console.log('🚫 Blocking fees result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error getting blocking fees:', error);
    return { 
      success: false, 
      error: error.message,
      hasBlockingFees: false,
      blockingFees: []
    };
  }
};

/**
 * Record cash payment (admin verification required)
 * @param {string} feeId - Platform fee ID
 * @param {Object} paymentData - Cash payment details
 * @returns {Object} - Success status
 */
export const recordCashPayment = async (feeId, paymentData) => {
  try {
    console.log('💵 Recording cash payment:', { feeId, paymentData });
    
    const feeRef = doc(db, 'platformFees', feeId);
    
    const updateData = {
      status: 'pending_verification',
      paymentMethod: 'cash',
      cashPaymentDetails: {
        amount: paymentData.amount,
        recordedAt: serverTimestamp(),
        recordedBy: paymentData.employerId,
        employerName: paymentData.employerName,
        notes: paymentData.notes || '',
        verified: false
      },
      needsPayment: false, // Temporarily marked as not needing payment
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(feeRef, updateData);
    
    console.log('✅ Cash payment recorded (pending verification):', feeId);
    
    return { 
      success: true,
      feeId,
      status: 'pending_verification'
    };
  } catch (error) {
    console.error('❌ Error recording cash payment:', error);
    return { 
      success: false, 
      error: error.message,
      feeId
    };
  }
};

/**
 * Verify cash payment (admin only)
 * @param {string} feeId - Platform fee ID
 * @param {Object} verificationData - Verification details
 * @returns {Object} - Success status
 */
export const verifyCashPayment = async (feeId, verificationData) => {
  try {
    console.log('🔍 Verifying cash payment:', { feeId, verificationData });
    
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error(`Fee with ID ${feeId} not found`);
    }
    
    const currentFee = feeDoc.data();
    
    const updateData = {
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentMethod: 'cash',
      cashPaymentDetails: {
        ...currentFee.cashPaymentDetails,
        verified: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: verificationData.adminId,
        adminNotes: verificationData.notes || ''
      },
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(feeRef, updateData);
    
    console.log('✅ Cash payment verified:', feeId);
    
    return { 
      success: true,
      feeId,
      status: 'paid',
      verified: true
    };
  } catch (error) {
    console.error('❌ Error verifying cash payment:', error);
    return { 
      success: false, 
      error: error.message,
      feeId
    };
  }
};

/**
 * Get fee summary for dashboard
 * @param {string} employerId - Employer's user ID
 * @returns {Object} - Fee summary
 */
export const getFeeSummary = async (employerId) => {
  try {
    console.log('📊 Getting fee summary for:', employerId);
    
    const [statsResult, feesResult] = await Promise.all([
      getEmployerJobStats(employerId),
      getEmployerPlatformFees(employerId)
    ]);
    
    if (!statsResult.success || !feesResult.success) {
      return {
        success: false,
        error: statsResult.error || feesResult.error,
        stats: {},
        fees: {}
      };
    }
    
    const summary = {
      success: true,
      stats: statsResult,
      fees: feesResult,
      totalJobs: statsResult.totalJobsPosted,
      completedJobs: statsResult.completedJobs,
      freeJobsRemaining: statsResult.freeJobsRemaining,
      totalPaid: feesResult.totalPaid,
      totalDue: feesResult.totalDue,
      hasBlockingFees: feesResult.totalDue > 0
    };
    
    console.log('📊 Fee summary:', summary);
    
    return summary;
  } catch (error) {
    console.error('❌ Error getting fee summary:', error);
    return {
      success: false,
      error: error.message,
      stats: {},
      fees: {}
    };
  }
};

/**
 * Get a specific fee by ID
 * @param {string} feeId - Fee ID
 * @returns {Object} - Fee data
 */
export const getFeeById = async (feeId) => {
  try {
    console.log('🔍 Getting fee by ID:', feeId);
    
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (feeDoc.exists()) {
      const feeData = feeDoc.data();
      return {
        id: feeDoc.id,
        ...feeData,
        amount: Number(feeData.amount) || 0,
        totalJobPayment: Number(feeData.totalJobPayment) || 0,
        needsPayment: feeData.needsPayment === true || feeData.status === 'pending'
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting fee by ID:', error);
    throw error;
  }
};

// Export constants
export const PLATFORM_FEE_CONSTANTS = {
  PERCENTAGE: PLATFORM_FEE_PERCENTAGE,
  FREE_JOBS_LIMIT: FREE_JOBS_LIMIT
};

export default {
  calculatePlatformFee,
  checkPendingFees,
  getEmployerJobStats,
  createPlatformFee,
  processPlatformFeePayment,
  updateFeeOnJobCompletion,
  getEmployerPlatformFees,
  canPostJob,
  calculateJobPostingFee,
  getBlockingFees,
  recordCashPayment,
  verifyCashPayment,
  getFeeSummary,
  PLATFORM_FEE_CONSTANTS,
  PLATFORM_FEE_PERCENTAGE,
  FREE_JOBS_LIMIT
};