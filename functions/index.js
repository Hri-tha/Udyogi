// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize with service account for custom token creation
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
exports.sendOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber } = data;

  if (!phoneNumber || !phoneNumber.startsWith('+91')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid Indian phone number is required'
    );
  }

  try {
    const otp = generateOTP();
    const now = Date.now();
    
    console.log(`Generated OTP for ${phoneNumber}: ${otp}`);
    
    // Store OTP in Firestore with 10-minute expiry
    try {
      const docRef = db.collection('otps').doc(phoneNumber);
      await docRef.set({
        otp: otp,
        expiresAt: now + 10 * 60 * 1000, // 10 minutes
        attempts: 0,
        createdAt: now
      });
      console.log(`✅ OTP stored successfully in Firestore for ${phoneNumber}`);
      
      // Verify it was written
      const verification = await docRef.get();
      console.log('Verification - Document exists:', verification.exists);
      if (verification.exists) {
        console.log('Verification - Stored data:', verification.data());
      }
    } catch (firestoreError) {
      console.error('❌ Firestore write error:', firestoreError);
      console.error('Error code:', firestoreError.code);
      console.error('Error message:', firestoreError.message);
      throw new functions.https.HttpsError('internal', `Firestore error: ${firestoreError.message}`);
    }

    // TODO: Send actual SMS here
    console.log(`📱 OTP ready for SMS: ${phoneNumber} -> ${otp}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      // DEVELOPMENT ONLY - Remove in production:
      devOTP: otp
    };
  } catch (error) {
    console.error('❌ Error in sendOTP:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Failed to send OTP: ${error.message}`);
  }
});

// Verify OTP and return custom token
exports.verifyOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, otp } = data;

  if (!phoneNumber || !otp) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Phone number and OTP are required'
    );
  }

  try {
    console.log('🔍 Verifying OTP for:', phoneNumber);
    console.log('🔍 Received OTP:', otp);
    
    // Get OTP from Firestore
    const otpDoc = await db.collection('otps').doc(phoneNumber).get();
    console.log('🔍 OTP document exists:', otpDoc.exists);

    if (!otpDoc.exists) {
      console.log('❌ No OTP document found in Firestore');
      throw new functions.https.HttpsError(
        'not-found',
        'No OTP found. Please request a new OTP.'
      );
    }

    const storedData = otpDoc.data();
    console.log('🔍 Stored OTP:', storedData.otp);
    console.log('🔍 Stored OTP type:', typeof storedData.otp);
    console.log('🔍 Received OTP type:', typeof otp);
    console.log('🔍 OTP match (===):', storedData.otp === otp);
    console.log('🔍 OTP match (==):', storedData.otp == otp);
    
    const now = Date.now();

    // Check expiry
    if (now > storedData.expiresAt) {
      await db.collection('otps').doc(phoneNumber).delete();
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'OTP has expired. Please request a new OTP.'
      );
    }

    // Check attempts (max 3 tries)
    if (storedData.attempts >= 3) {
      await db.collection('otps').doc(phoneNumber).delete();
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many incorrect attempts. Please request a new OTP.'
      );
    }

    // Verify OTP - Convert both to strings for comparison
    if (String(storedData.otp) !== String(otp)) {
      // Increment attempts
      await db.collection('otps').doc(phoneNumber).update({
        attempts: storedData.attempts + 1
      });
      
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid OTP. ${2 - storedData.attempts} attempts remaining.`
      );
    }

    console.log('✅ OTP verified successfully');

    // OTP verified successfully - delete it
    await db.collection('otps').doc(phoneNumber).delete();

    // Get or create user
    let uid;
    try {
      const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
      uid = userRecord.uid;
      console.log('✅ Existing user found:', uid);
    } catch (error) {
      // User doesn't exist - create new user
      const newUser = await admin.auth().createUser({
        phoneNumber: phoneNumber,
      });
      uid = newUser.uid;
      console.log('✅ New user created:', uid);
    }

    // Create custom token with explicit service account
    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(uid);
      console.log('✅ Custom token created successfully');
    } catch (tokenError) {
      console.error('Token creation error:', tokenError);
      // Fallback: Try with explicit service account email
      try {
        const serviceAccount = 'firebase-adminsdk-fbsvc@udyogi-1ed9c.iam.gserviceaccount.com';
        customToken = await admin.auth().createCustomToken(uid, {}, {
          serviceAccountId: serviceAccount
        });
        console.log('✅ Custom token created with explicit service account');
      } catch (fallbackError) {
        console.error('Fallback token creation also failed:', fallbackError);
        throw new functions.https.HttpsError(
          'internal', 
          'Unable to create authentication token. Please contact support.'
        );
      }
    }

    return {
      success: true,
      customToken: customToken,
      uid: uid
    };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Re-throw HttpsErrors as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `Failed to verify OTP: ${error.message}`);
  }
});

// Optional: Cleanup expired OTPs (runs daily)
exports.cleanupExpiredOTPs = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const now = Date.now();
  const expiredOTPs = await db.collection('otps')
    .where('expiresAt', '<', now)
    .get();
  
  const batch = db.batch();
  expiredOTPs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up ${expiredOTPs.size} expired OTPs`);
  return null;
});