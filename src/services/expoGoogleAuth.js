// src/services/expoGoogleAuth.js
import * as AuthSession  from 'expo-auth-session';
import * as WebBrowser   from 'expo-web-browser';
import { Platform }      from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase'; // ✅ lazy getter, not { functions }

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

class ExpoGoogleAuth {
  constructor() {
    console.log('🔥 [ExpoGoogleAuth] Initializing...');

    this.clientId = Platform.select({
      web:     '960400461165-mvjoj7t4kvsj1b3skgjvfsa8hlr18kvl.apps.googleusercontent.com',
      ios:     '960400461165-xxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
      android: '960400461165-ft6rparr6896bigs7kvbn1heop6qi4hq.apps.googleusercontent.com',
    });

    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: 'exp',
      path:   'oauth2callback',
    });

    console.log('Google Auth Config:', {
      clientId:    this.clientId,
      redirectUri: this.redirectUri,
      platform:    Platform.OS,
    });

    // ✅ Don't call getFirebaseFunctions() here in the constructor (module load time).
    // Call it lazily inside signInWithGoogle() instead.
  }

  async signInWithGoogle(userType = 'worker') {
    try {
      console.log('🔐 Starting Google Sign-In via Expo...');

      const request = new AuthSession.AuthRequest({
        clientId:     this.clientId,
        redirectUri:  this.redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        scopes:       ['openid', 'profile', 'email'],
        usePKCE:      false,
      });

      const authUrl = await request.makeAuthUrlAsync();

      let result;
      if (Platform.OS === 'web') {
        result = await this.handleWebAuth(authUrl);
      } else {
        result = await WebBrowser.openAuthSessionAsync(authUrl, this.redirectUri, {
          showTitle:            false,
          enableBarCollapsing:  true,
          ephemeralWebSession:  false,
        });
      }

      console.log('Auth result type:', result.type);

      if (result.type !== 'success') {
        throw new Error('Authentication cancelled or failed');
      }

      const idToken = this.extractIdTokenFromUrl(result.url);
      if (!idToken) throw new Error('No ID token received');

      console.log('✅ Got Google ID token');
      return await this.callBackendWithToken(idToken, userType);
    } catch (error) {
      console.error('❌ Google Sign-In Error:', error);
      return { success: false, error: error.message || 'Failed to sign in with Google' };
    }
  }

  async handleWebAuth(authUrl) {
    return new Promise((resolve, reject) => {
      const width  = 600;
      const height = 800;
      const left   = (window.screen.width  - width)  / 2;
      const top    = (window.screen.height - height) / 2;

      const popup = window.open(
        authUrl,
        'google_signin',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups.'));
        return;
      }

      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error('Popup closed without completing authentication'));
        }
        try {
          if (popup.location.href.startsWith(this.redirectUri)) {
            clearInterval(interval);
            resolve({ type: 'success', url: popup.location.href });
            popup.close();
          }
        } catch (_) { /* cross-origin, ignore */ }
      }, 500);
    });
  }

  extractIdTokenFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.hash.substring(1));
      return params.get('id_token');
    } catch (error) {
      console.error('Error extracting ID token:', error);
      return null;
    }
  }

  async callBackendWithToken(idToken, userType) {
    try {
      console.log('📞 Calling backend with Google token...');
      // ✅ Lazy: getFirebaseFunctions() called here, inside a running async fn
      const fns    = getFirebaseFunctions();
      const result = await httpsCallable(fns, 'handleGoogleSignIn')({ idToken, userType });
      console.log('✅ Backend response:', result.data);
      return { success: true, ...result.data };
    } catch (error) {
      console.error('Backend call error:', error);
      throw error;
    }
  }
}

export default new ExpoGoogleAuth();