import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, firebaseConfig } from '../config/firebase';

const AUTH_USER_KEY = 'retail_auth_user';
const USERS_DIRECTORY_KEY = 'retail_registered_users';

// Helper to get local mock user directory
function getLocalUsers() {
  try {
    const raw = localStorage.getItem(USERS_DIRECTORY_KEY);
    const users = raw ? JSON.parse(raw) : [];
    // Ensure default demo user exists in directory
    if (!users.some((u) => u.email === 'san@gmail.com')) {
      users.push({
        email: 'san@gmail.com',
        password: '123456',
        name: 'San',
        role: 'Lead Retail Planner',
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return [];
  }
}

function saveLocalUser(userData) {
  const users = getLocalUsers();
  const existingIdx = users.findIndex((u) => u.email === userData.email);
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...userData };
  } else {
    users.push(userData);
  }
  localStorage.setItem(USERS_DIRECTORY_KEY, JSON.stringify(users));
}

export const authService = {
  isConfigured() {
    return isFirebaseConfigured && auth !== null;
  },

  getProjectInfo() {
    return {
      configured: isFirebaseConfigured && auth !== null,
      projectId: firebaseConfig.projectId || 'Not set',
      authDomain: firebaseConfig.authDomain || 'Not set',
    };
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  getAllUsers() {
    return getLocalUsers();
  },

  async signUp(email, password, name, role = 'Retail Demand Planner') {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. If Firebase is active and configured, use Firebase Auth
    if (this.isConfigured()) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const fbUser = userCredential.user;

        // Update Firebase profile with display name
        if (name) {
          await updateProfile(fbUser, { displayName: name });
        }

        const userObj = {
          uid: fbUser.uid,
          email: fbUser.email,
          name: name || fbUser.displayName || 'Retail Planner',
          role,
          provider: 'firebase',
          createdAt: new Date().toISOString(),
          loginTime: new Date().toISOString(),
        };

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
        saveLocalUser(userObj);
        return userObj;
      } catch (fbError) {
        // Map common Firebase errors to friendly messages
        let message = fbError.message;
        if (fbError.code === 'auth/configuration-not-found' || fbError.message?.includes('CONFIGURATION_NOT_FOUND')) {
          message = 'Firebase Authentication is not yet activated for project wildemo-3ae07. Please open Firebase Console -> Build -> Authentication, click "Get started", and enable Email/Password.';
        } else if (fbError.code === 'auth/email-already-in-use') {
          message = 'An account with this email address already exists.';
        } else if (fbError.code === 'auth/invalid-email') {
          message = 'The email address is invalid.';
        } else if (fbError.code === 'auth/weak-password') {
          message = 'The password must be at least 6 characters.';
        }
        throw new Error(message);
      }
    }

    // 2. Seamless local multi-user store fallback (instant signup without waiting for API keys)
    const users = getLocalUsers();
    if (users.some((u) => u.email === trimmedEmail)) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const newUser = {
      uid: `local_${Date.now()}`,
      email: trimmedEmail,
      password, // stored locally for testing/demo
      name: name || 'Retail Planner',
      role,
      provider: 'local',
      createdAt: new Date().toISOString(),
      loginTime: new Date().toISOString(),
    };

    saveLocalUser(newUser);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    return newUser;
  },

  async signIn(email, password) {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. If Firebase is configured, try Firebase Auth
    if (this.isConfigured()) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const fbUser = userCredential.user;

        const userObj = {
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || 'Retail Planner',
          role: 'Retail Demand Planner',
          provider: 'firebase',
          loginTime: new Date().toISOString(),
        };

        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
        saveLocalUser(userObj);
        return userObj;
      } catch (fbError) {
        // Check if fallback demo user was requested
        if (trimmedEmail === 'san@gmail.com' && password === '123456') {
          const fallbackUser = {
            uid: 'demo_san',
            email: 'san@gmail.com',
            name: 'San',
            role: 'Lead Retail Planner',
            provider: 'demo',
            loginTime: new Date().toISOString(),
          };
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(fallbackUser));
          return fallbackUser;
        }

        let message = 'Invalid email or password.';
        if (fbError.code === 'auth/configuration-not-found' || fbError.message?.includes('CONFIGURATION_NOT_FOUND')) {
          message = 'Firebase Authentication is not yet activated for project wildemo-3ae07. Please open Firebase Console -> Build -> Authentication, click "Get started", and enable Email/Password.';
        } else if (fbError.code === 'auth/user-not-found' || fbError.code === 'auth/wrong-password' || fbError.code === 'auth/invalid-credential') {
          message = 'Invalid email or password. Please verify your credentials.';
        } else if (fbError.code === 'auth/too-many-requests') {
          message = 'Access temporarily disabled due to many failed login attempts. Try again later.';
        }
        throw new Error(message);
      }
    }

    // 2. Local Multi-User Fallback
    const users = getLocalUsers();
    const found = users.find((u) => u.email === trimmedEmail);

    if (found && found.password === password) {
      const userObj = {
        uid: found.uid || `local_${Date.now()}`,
        email: found.email,
        name: found.name || 'Retail Planner',
        role: found.role || 'Retail Demand Planner',
        provider: 'local',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
      return userObj;
    }

    // Also support default credentials
    if (trimmedEmail === 'san@gmail.com' && password === '123456') {
      const demoUser = {
        uid: 'demo_san',
        email: 'san@gmail.com',
        name: 'San',
        role: 'Lead Retail Planner',
        provider: 'demo',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demoUser));
      return demoUser;
    }

    throw new Error('Invalid email or password. Please verify your credentials or create a new account.');
  },

  async signOut() {
    if (this.isConfigured()) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('[Firebase] Sign out error:', err);
      }
    }
    localStorage.removeItem(AUTH_USER_KEY);
  },

  subscribeToAuth(callback) {
    if (this.isConfigured()) {
      return onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const userObj = {
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || 'Retail Planner',
            role: 'Retail Demand Planner',
            provider: 'firebase',
          };
          callback(userObj);
        } else {
          // If Firebase says logged out, check local storage
          const local = this.getCurrentUser();
          if (!local || local.provider === 'firebase') {
            callback(null);
          }
        }
      });
    }
    return () => {};
  },
};
