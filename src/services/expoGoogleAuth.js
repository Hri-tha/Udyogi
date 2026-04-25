// src/services/expoGoogleAuth.js
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Required for web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

class ExpoGoogleAuth {
  constructor() {
    console.log('🔥 [ExpoGoogleAuth] Initializing...');
    
    // Your Google OAuth Client ID (from Google Cloud Console)
    // For now, using a placeholder - you need to get your own
    this.clientId = Platform.select({
      web: '960400461165-mvjoj7t4kvsj1b3skgjvfsa8hlr18kvl.apps.googleusercontent.com', // Web client ID
      ios: '960400461165-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // iOS client ID
      android: '960400461165-ft6rparr6896bigs7kvbn1heop6qi4hq.apps.googleusercontent.com', // Android client ID
    });
    
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: 'exp',
      path: 'oauth2callback'
    });
    
    console.log('Google Auth Config:', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      platform: Platform.OS
    });
    
    this.googleSignInFunction = httpsCallable(functions, 'handleGoogleSignIn');
  }

  async signInWithGoogle(userType = 'worker') {
    try {
      console.log('🔐 Starting Google Sign-In via Expo...');
      
      // Request configuration
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: false,
      });
      
      console.log('Making auth request...');
      
      // Get the authorization URL
      const authUrl = await request.makeAuthUrlAsync();
      
      // Open the browser for authentication
      let result;
      
      if (Platform.OS === 'web') {
        // For web, we need to handle it differently
        result = await this.handleWebAuth(authUrl);
      } else {
        // For mobile
        result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          this.redirectUri,
          {
            showTitle: false,
            enableBarCollapsing: true,
            ephemeralWebSession: false,
          }
        );
      }
      
      console.log('Auth result type:', result.type);
      
      if (result.type !== 'success') {
        throw new Error('Authentication cancelled or failed');
      }
      
      // Extract ID token from URL
      const idToken = this.extractIdTokenFromUrl(result.url);
      
      if (!idToken) {
        throw new Error('No ID token received');
      }
      
      console.log('✅ Got Google ID token');
      
      // Call backend function
      return await this.callBackendWithToken(idToken, userType);
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with Google'
      };
    }
  }

  async handleWebAuth(authUrl) {
    // For web, open in a new window
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        authUrl,
        'google_signin',
        `width=${width},height=${height},top=${top},left=${left}`
      );
      
      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups.'));
        return;
      }
      
      // Poll for popup closure
      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error('Popup closed without completing authentication'));
        }
        
        try {
          // Check if we've been redirected to our redirect URI
          if (popup.location.href.startsWith(this.redirectUri)) {
            clearInterval(interval);
            resolve({
              type: 'success',
              url: popup.location.href
            });
            popup.close();
          }
        } catch (error) {
          // Cross-origin error, ignore
        }
      }, 500);
    });
  }

  extractIdTokenFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hash = urlObj.hash.substring(1); // Remove the # at the beginning
      const params = new URLSearchParams(hash);
      return params.get('id_token');
    } catch (error) {
      console.error('Error extracting ID token:', error);
      return null;
    }
  }

  async callBackendWithToken(idToken, userType) {
    try {
      console.log('📞 Calling backend with Google token...');
      
      const result = await this.googleSignInFunction({
        idToken: idToken,
        userType: userType
      });
      
      console.log('✅ Backend response:', result.data);
      
      return {
        success: true,
        ...result.data
      };
    } catch (error) {
      console.error('Backend call error:', error);
      throw error;
    }
  }
}

export default new ExpoGoogleAuth();