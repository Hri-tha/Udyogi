// C:\Users\hktha\Udyogi\functions\index.js - COMPLETE VERSION WITH GOOGLE SIGN-IN
const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Set global options for Node.js 20
setGlobalOptions({
  region: 'asia-south1',
  memory: '256MiB',
  timeoutSeconds: 60,
  nodeVersion: '20'
});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ================== EMAIL CONFIG ==================
const EMAIL_USER = "udyogitechnology@gmail.com";
const EMAIL_PASS = "mwmo jbjb wwsu qktu";

// Initialize transporter
let transporter;

const initializeEmailTransporter = () => {
  if (transporter) return transporter;
  
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
    
    console.log('✅ Email transporter initialized');
    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error.message);
    return null;
  }
};

// ================== SEND EMAIL OTP ==================
exports.sendEmailOTP = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    try {
      const email = String(request.data.email || '').trim().toLowerCase();

      console.log('📧 Backend received email:', email);

      // Validate email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid email address'
        );
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Firestore
      await db.collection('otp').doc(email).set({
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0
      });

      // Initialize email transporter
      const emailTransporter = initializeEmailTransporter();
      
      if (!emailTransporter) {
        throw new functions.https.HttpsError(
          'internal',
          'Email service not configured'
        );
      }

      // Send email
      try {
        const mailOptions = {
          from: '"Udyogi" <udyogitechnology@gmail.com>',
          to: email,
          subject: 'Your Udyogi Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #007AFF, #34C759); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Udyogi</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verification Code</p>
              </div>
              <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 15px 15px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6;">Your verification code is:</p>
                <div style="background: white; padding: 25px; border-radius: 12px; border: 2px solid #e0e0e0; text-align: center; margin: 25px 0;">
                  <h2 style="font-size: 42px; letter-spacing: 8px; color: #007AFF; margin: 0; font-weight: bold;">${otp}</h2>
                </div>
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  This code will expire in <strong>5 minutes</strong>.<br>
                  If you didn't request this code, please ignore this email.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    Udyogi - Connecting Workers with Employers<br>
                    Need help? Contact us at udyogitechnology@gmail.com
                  </p>
                </div>
              </div>
            </div>
          `,
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully to:', email);

        return {
          success: true,
          message: 'OTP sent to your email',
          timestamp: Date.now()
        };
      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError.message);
        
        // Clean up OTP record
        await db.collection('otp').doc(email).delete();
        
        throw new functions.https.HttpsError(
          'internal',
          'Failed to send email. Please check your email address and try again.'
        );
      }
    } catch (error) {
      console.error('❌ Send OTP function error:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred. Please try again.'
      );
    }
  }
);

// ================== VERIFY EMAIL OTP ==================
exports.verifyEmailOTP = onCall(
  { 
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    try {
      const email = String(request.data.email || '').trim().toLowerCase();
      const otp = String(request.data.otp || '').trim();
      const userType = request.data.userType || 'worker';

      console.log('🔐 Verifying OTP for:', { email, userType });

      // Validate inputs
      if (!email || !otp) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email and OTP are required'
        );
      }

      // Get OTP record
      const otpDoc = await db.collection('otp').doc(email).get();

      if (!otpDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'OTP not found or expired. Please request a new OTP.'
        );
      }

      const record = otpDoc.data();

      // Check expiration
      if (Date.now() > record.expiresAt) {
        await otpDoc.ref.delete();
        throw new functions.https.HttpsError(
          'deadline-exceeded',
          'OTP has expired. Please request a new OTP.'
        );
      }

      // Check attempts
      if (record.attempts >= 5) {
        await otpDoc.ref.delete();
        throw new functions.https.HttpsError(
          'permission-denied',
          'Too many failed attempts. Please request a new OTP.'
        );
      }

      // Verify OTP
      if (record.otp !== otp) {
        // Increment attempts
        await otpDoc.ref.update({
          attempts: admin.firestore.FieldValue.increment(1)
        });
        
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Invalid OTP. Please try again.'
        );
      }

      // OTP verified successfully - delete it
      await otpDoc.ref.delete();

      let user;
      let isNewUser = false;

      try {
        // Try to get existing user by email
        user = await admin.auth().getUserByEmail(email);
        console.log('✅ Existing user found:', user.uid);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user
          isNewUser = true;
          try {
            user = await admin.auth().createUser({
              email: email,
              emailVerified: true,
              displayName: `User-${email.split('@')[0]}`,
            });
            console.log('🆕 New user created:', user.uid);
          } catch (createError) {
            console.error('❌ User creation failed:', createError);
            throw new functions.https.HttpsError(
              'internal',
              'Failed to create user account. Please try again.'
            );
          }
        } else {
          console.error('❌ Get user error:', error);
          throw new functions.https.HttpsError(
            'internal',
            'Failed to verify user. Please try again.'
          );
        }
      }

      // Get or create user document in Firestore
      const userDocRef = db.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();

      let needsProfile = true;

      if (!userDoc.exists) {
        // Create new user document
        await userDocRef.set({
          email: email,
          userType: userType,
          profileComplete: false,
          emailVerified: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('📄 New user document created');
      } else {
        // Update existing user document
        const userData = userDoc.data();
        needsProfile = !userData.profileComplete;
        
        await userDocRef.update({
          userType: userType,
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('📄 Existing user document updated');
      }

      // Generate custom token for authentication
      let customToken;
      try {
        customToken = await admin.auth().createCustomToken(user.uid);
        console.log('🔑 Custom token generated');
      } catch (tokenError) {
        console.error('❌ Token generation failed:', tokenError);
        throw new functions.https.HttpsError(
          'internal',
          'Failed to generate authentication token'
        );
      }

      console.log('✅ OTP verification successful for user:', user.uid);

      return {
        success: true,
        verified: true,
        uid: user.uid,
        email: email,
        userType: userType,
        customToken: customToken,
        isNewUser: isNewUser,
        emailVerified: true,
        needsProfile: needsProfile,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Verify OTP function error:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred. Please try again.'
      );
    }
  }
);

// ================== GOOGLE SIGN-IN ==================
exports.handleGoogleSignIn = onCall(
  { 
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    try {
      const { idToken, userType } = request.data;
      
      if (!idToken) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'ID token is required'
        );
      }

      console.log('🔐 Processing Google sign-in for userType:', userType);

      // Verify Google ID token
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (authError) {
        console.error('❌ Google token verification failed:', authError);
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Invalid Google token. Please try signing in again.'
        );
      }

      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const name = decodedToken.name || email.split('@')[0];
      const phoneNumber = decodedToken.phone_number || '';

      console.log('✅ Google sign-in verified:', { email, uid, name });

      // Get or create user in Firestore
      const userDocRef = db.collection('users').doc(uid);
      const userDoc = await userDocRef.get();

      let isNewUser = false;
      let needsProfile = true;

      if (!userDoc.exists) {
        isNewUser = true;
        await userDocRef.set({
          email: email,
          phoneNumber: phoneNumber,
          name: name,
          userType: userType,
          profileComplete: false,
          emailVerified: true,
          googleSignIn: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('🆕 New Google user created in Firestore');
      } else {
        // Update existing user
        const existingData = userDoc.data();
        needsProfile = !existingData.profileComplete;
        
        await userDocRef.update({
          lastLogin: admin.firestore.FieldValue.serverTimestamp(),
          userType: userType,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('📄 Existing Google user updated');
      }

      // Generate custom token
      let customToken;
      try {
        customToken = await admin.auth().createCustomToken(uid);
      } catch (tokenError) {
        console.error('❌ Token generation failed for Google user:', tokenError);
        throw new functions.https.HttpsError(
          'internal',
          'Failed to generate authentication token'
        );
      }

      console.log('✅ Google sign-in successful for:', email);

      return {
        success: true,
        uid: uid,
        email: email,
        phoneNumber: phoneNumber,
        name: name,
        userType: userType,
        customToken: customToken,
        isNewUser: isNewUser,
        needsProfile: needsProfile,
        emailVerified: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Google Sign-in function error:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'Google sign-in failed. Please try again.'
      );
    }
  }
);

// ================== RESEND OTP ==================
exports.resendEmailOTP = onCall(
  { 
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (request) => {
    try {
      const email = String(request.data.email || '').trim().toLowerCase();

      console.log('🔄 Resending OTP to:', email);

      if (!email) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email is required'
        );
      }

      // Delete existing OTP if any
      await db.collection('otp').doc(email).delete();
      
      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Firestore
      await db.collection('otp').doc(email).set({
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0
      });

      // Initialize email transporter
      const emailTransporter = initializeEmailTransporter();
      
      if (!emailTransporter) {
        throw new functions.https.HttpsError(
          'internal',
          'Email service not configured'
        );
      }

      // Send email
      const mailOptions = {
        from: '"Udyogi" <udyogitechnology@gmail.com>',
        to: email,
        subject: 'Your Udyogi Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #007AFF, #34C759); padding: 30px; border-radius: 15px 15px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Udyogi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verification Code</p>
            </div>
            <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 15px 15px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Your verification code is:</p>
              <div style="background: white; padding: 25px; border-radius: 12px; border: 2px solid #e0e0e0; text-align: center; margin: 25px 0;">
                <h2 style="font-size: 42px; letter-spacing: 8px; color: #007AFF; margin: 0; font-weight: bold;">${otp}</h2>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                This code will expire in <strong>5 minutes</strong>.<br>
                If you didn't request this code, please ignore this email.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Udyogi - Connecting Workers with Employers<br>
                  Need help? Contact us at udyogitechnology@gmail.com
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await emailTransporter.sendMail(mailOptions);
      console.log('✅ Resent OTP email successfully to:', email);

      return {
        success: true,
        message: 'New OTP sent successfully',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Resend OTP failed:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to resend OTP. Please try again.'
      );
    }
  }
);

// ================== CHECK EMAIL STATUS ==================
exports.checkEmailStatus = onCall(
  { 
    memory: '256MiB',
    timeoutSeconds: 10
  },
  async (request) => {
    const email = String(request.data.email || '').trim().toLowerCase();

    if (!email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email is required'
      );
    }

    try {
      // Check if email exists in Firebase Auth
      await admin.auth().getUserByEmail(email);
      return {
        success: true,
        emailExists: true,
        message: 'Email is already registered'
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return {
          success: true,
          emailExists: false,
          message: 'Email is available'
        };
      }
      throw new functions.https.HttpsError(
        'internal',
        'Failed to check email status'
      );
    }
  }
);

// ================== DELETE EXPIRED OTPS ==================
exports.deleteExpiredOTPs = onSchedule(
  {
    schedule: 'every 5 minutes',
    memory: '128MiB',
    timeoutSeconds: 60
  },
  async () => {
    try {
      const now = Date.now();
      const expiredOTPs = await db.collection('otp')
        .where('expiresAt', '<', now)
        .get();
      
      const deletePromises = [];
      expiredOTPs.forEach(doc => {
        deletePromises.push(doc.ref.delete());
      });
      
      await Promise.all(deletePromises);
      console.log(`🧹 Deleted ${expiredOTPs.size} expired OTPs`);
      return null;
    } catch (error) {
      console.error('Error deleting expired OTPs:', error);
      return null;
    }
  }
);