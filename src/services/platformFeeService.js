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

const PLATFORM_FEE_PERCENTAGE = 5;
const FREE_JOBS_LIMIT = 3;

export const calculatePlatformFee = (totalPayment) => {
  return Math.round((totalPayment * PLATFORM_FEE_PERCENTAGE) / 100);
};

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
      amount: Number(doc.data().amount) || 0,
      needsPayment: doc.data().status === 'pending' || doc.data().status === 'unpaid'
    }));
    
    const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return {
      success: true,
      hasPending: pendingFees.length > 0,
      pendingFees,
      totalPending,
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

export const getEmployerJobStats = async (employerId) => {
  try {
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('employerId', '==', employerId)
    );
    
    const jobsSnapshot = await getDocs(jobsQuery);
    const totalJobsPosted = jobsSnapshot.docs.length;
    const completedJobs = jobsSnapshot.docs.filter(doc => doc.data().status === 'completed').length;
    
    return {
      success: true,
      totalJobsPosted,
      completedJobs,
      isFreeEligible: totalJobsPosted < FREE_JOBS_LIMIT,
      freeJobsRemaining: Math.max(0, FREE_JOBS_LIMIT - totalJobsPosted)
    };
  } catch (error) {
    console.error('❌ Error getting job stats:', error);
    return { success: false, error: error.message, totalJobsPosted: 0, completedJobs: 0, isFreeEligible: false };
  }
};

// FIX: Never pass undefined to Firestore — strip out null/undefined fields
const cleanForFirestore = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export const createPlatformFee = async (feeData) => {
  try {
    console.log('💰 Creating platform fee record:', feeData);
    
    // Build the document — omit dueDate when not provided
    const docData = cleanForFirestore({
      employerId: feeData.employerId,
      employerName: feeData.employerName,
      jobId: feeData.jobId,
      jobTitle: feeData.jobTitle,
      amount: Number(feeData.amount) || 0,
      totalJobPayment: Number(feeData.totalJobPayment) || 0,
      status: feeData.paymentOption === 'now' ? 'paid' : 'pending',
      paymentOption: feeData.paymentOption,
      needsPayment: feeData.paymentOption === 'later',
      createdAt: serverTimestamp(),
      createdDate: new Date().toISOString(),
      paidAt: feeData.paymentOption === 'now' ? serverTimestamp() : null,
      paymentMethod: feeData.paymentOption === 'now' ? 'online' : null,
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
      // Only include dueDate when it's actually provided
      ...(feeData.dueDate ? { dueDate: feeData.dueDate } : {}),
    });

    // Remove any null values that slipped through
    Object.keys(docData).forEach(key => {
      if (docData[key] === null || docData[key] === undefined) {
        delete docData[key];
      }
    });
    
    const feeRef = await addDoc(collection(db, 'platformFees'), docData);
    console.log('✅ Platform fee created with ID:', feeRef.id);
    
    return { success: true, feeId: feeRef.id, feeAmount: feeData.amount };
  } catch (error) {
    console.error('❌ Error creating platform fee:', error);
    return { success: false, error: error.message, feeId: null };
  }
};

export const processPlatformFeePayment = async (feeId, paymentData) => {
  try {
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    
    if (!feeDoc.exists()) {
      throw new Error(`Platform fee with ID ${feeId} not found`);
    }
    
    const currentFee = feeDoc.data();
    
    const updateData = cleanForFirestore({
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentDate: new Date().toISOString(),
      paymentMethod: paymentData.method || 'online',
      paymentId: paymentData.paymentId || null,
      needsPayment: false,
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(feeRef, updateData);
    
    return { success: true, feeId, amount: currentFee.amount, status: 'paid' };
  } catch (error) {
    console.error('❌ Error processing platform fee payment:', error);
    return { success: false, error: error.message, feeId };
  }
};

export const updateFeeOnJobCompletion = async (jobId) => {
  try {
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
      
      await updateDoc(feeRef, {
        jobCompletedAt: serverTimestamp(),
        needsPayment: true,
        updatedAt: serverTimestamp(),
        paymentDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      return { success: true, feeId: feeDoc.id, feeAmount: feeData.amount, needsPayment: true };
    }
    
    return { success: true, message: 'No pending fee found', feeId: null };
  } catch (error) {
    console.error('❌ Error updating fee on job completion:', error);
    return { success: false, error: error.message, feeId: null };
  }
};

export const getEmployerPlatformFees = async (employerId, limitCount = 50) => {
  try {
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
      amount: Number(doc.data().amount) || 0,
      totalJobPayment: Number(doc.data().totalJobPayment) || 0
    }));
    
    const paidFees = fees.filter(fee => fee.status === 'paid');
    const pendingFees = fees.filter(fee => fee.status === 'pending');
    const unpaidFees = fees.filter(fee => fee.status === 'unpaid');
    
    const totalPaid = paidFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPending = pendingFees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalUnpaid = unpaidFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return {
      success: true,
      fees,
      totalFees: fees.length,
      paidFees: paidFees.length,
      pendingFees: pendingFees.length,
      unpaidFees: unpaidFees.length,
      totalPaid,
      totalPending,
      totalUnpaid,
      totalDue: totalPending + totalUnpaid
    };
  } catch (error) {
    console.error('❌ Error getting employer fees:', error);
    return { success: false, error: error.message, fees: [], totalFees: 0, totalPaid: 0, totalPending: 0, totalDue: 0 };
  }
};

export const canPostJob = async (employerId) => {
  try {
    const stats = await getEmployerJobStats(employerId);
    if (!stats.success) return { success: false, error: stats.error, canPost: false };
    
    if (stats.totalJobsPosted < FREE_JOBS_LIMIT) {
      return { success: true, canPost: true, isFree: true, freeJobsRemaining: stats.freeJobsRemaining };
    }
    
    const pendingResult = await checkPendingFees(employerId);
    if (!pendingResult.success) return { success: false, error: pendingResult.error, canPost: false };
    
    const blockingFees = pendingResult.pendingFees.filter(fee => fee.needsPayment === true || fee.status === 'unpaid');
    
    if (blockingFees.length > 0) {
      return {
        success: true,
        canPost: false,
        requiresPayment: true,
        blockingFees,
        totalDue: blockingFees.reduce((sum, fee) => sum + fee.amount, 0),
        feeCount: blockingFees.length,
      };
    }
    
    return { success: true, canPost: true, isFree: false, hasPendingFees: pendingResult.hasPending };
  } catch (error) {
    console.error('❌ Error checking can post job:', error);
    return { success: false, error: error.message, canPost: false };
  }
};

export const calculateJobPostingFee = async (jobPayment, employerId) => {
  try {
    const stats = await getEmployerJobStats(employerId);
    if (!stats.success) return { success: false, error: stats.error };
    
    const isFree = stats.totalJobsPosted < FREE_JOBS_LIMIT;
    const platformFee = isFree ? 0 : calculatePlatformFee(jobPayment);
    
    return {
      success: true,
      isFree,
      jobNumber: stats.totalJobsPosted + 1,
      freeJobsRemaining: Math.max(0, FREE_JOBS_LIMIT - stats.totalJobsPosted),
      platformFee,
      feePercentage: PLATFORM_FEE_PERCENTAGE,
      jobPayment,
      totalWithFee: jobPayment + platformFee,
    };
  } catch (error) {
    console.error('❌ Error calculating job posting fee:', error);
    return { success: false, error: error.message, jobPayment, platformFee: 0, isFree: false };
  }
};

export const getBlockingFees = async (employerId) => {
  try {
    const pendingResult = await checkPendingFees(employerId);
    if (!pendingResult.success) return { success: false, error: pendingResult.error, hasBlockingFees: false, blockingFees: [] };
    
    const blockingFees = pendingResult.pendingFees.filter(fee => fee.needsPayment === true || fee.status === 'unpaid');
    const totalDue = blockingFees.reduce((sum, fee) => sum + fee.amount, 0);
    
    return { success: true, hasBlockingFees: blockingFees.length > 0, blockingFees, totalDue, feeCount: blockingFees.length };
  } catch (error) {
    return { success: false, error: error.message, hasBlockingFees: false, blockingFees: [] };
  }
};

export const recordCashPayment = async (feeId, paymentData) => {
  try {
    const feeRef = doc(db, 'platformFees', feeId);
    await updateDoc(feeRef, cleanForFirestore({
      status: 'pending_verification',
      paymentMethod: 'cash',
      cashPaymentDetails: {
        amount: paymentData.amount,
        recordedAt: serverTimestamp(),
        recordedBy: paymentData.employerId,
        verified: false
      },
      needsPayment: false,
      updatedAt: serverTimestamp()
    }));
    return { success: true, feeId, status: 'pending_verification' };
  } catch (error) {
    return { success: false, error: error.message, feeId };
  }
};

export const verifyCashPayment = async (feeId, verificationData) => {
  try {
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    if (!feeDoc.exists()) throw new Error(`Fee ${feeId} not found`);
    const currentFee = feeDoc.data();
    await updateDoc(feeRef, {
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentMethod: 'cash',
      cashPaymentDetails: { ...currentFee.cashPaymentDetails, verified: true, verifiedAt: serverTimestamp() },
      updatedAt: serverTimestamp()
    });
    return { success: true, feeId, status: 'paid', verified: true };
  } catch (error) {
    return { success: false, error: error.message, feeId };
  }
};

export const getFeeSummary = async (employerId) => {
  try {
    const [statsResult, feesResult] = await Promise.all([getEmployerJobStats(employerId), getEmployerPlatformFees(employerId)]);
    if (!statsResult.success || !feesResult.success) return { success: false, error: statsResult.error || feesResult.error };
    return {
      success: true, stats: statsResult, fees: feesResult,
      totalJobs: statsResult.totalJobsPosted, completedJobs: statsResult.completedJobs,
      freeJobsRemaining: statsResult.freeJobsRemaining, totalPaid: feesResult.totalPaid,
      totalDue: feesResult.totalDue, hasBlockingFees: feesResult.totalDue > 0
    };
  } catch (error) {
    return { success: false, error: error.message, stats: {}, fees: {} };
  }
};

export const getFeeById = async (feeId) => {
  try {
    const feeRef = doc(db, 'platformFees', feeId);
    const feeDoc = await getDoc(feeRef);
    if (feeDoc.exists()) {
      const feeData = feeDoc.data();
      return {
        id: feeDoc.id, ...feeData,
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

export const PLATFORM_FEE_CONSTANTS = { PERCENTAGE: PLATFORM_FEE_PERCENTAGE, FREE_JOBS_LIMIT };

export default {
  calculatePlatformFee, checkPendingFees, getEmployerJobStats, createPlatformFee,
  processPlatformFeePayment, updateFeeOnJobCompletion, getEmployerPlatformFees,
  canPostJob, calculateJobPostingFee, getBlockingFees, recordCashPayment,
  verifyCashPayment, getFeeSummary, PLATFORM_FEE_CONSTANTS, PLATFORM_FEE_PERCENTAGE, FREE_JOBS_LIMIT
};