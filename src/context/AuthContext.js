import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import awsConfig from '../config/aws';

// AsyncStorage-backed storage for Cognito (with sync cache)
// Cognito SDK needs sync methods, so we cache in memory and persist async
const AUTH_STORAGE_KEY = '@aquarisense_auth_';
let storageCache = {};
let storageLoaded = false;

const asyncStorage = {
  setItem(key, value) {
    storageCache[key] = value;
    // Persist async (fire and forget)
    AsyncStorage.setItem(AUTH_STORAGE_KEY + key, value).catch(e =>
      console.log('Auth storage write error:', e)
    );
    return value;
  },
  getItem(key) {
    return storageCache[key] || null;
  },
  removeItem(key) {
    delete storageCache[key];
    AsyncStorage.removeItem(AUTH_STORAGE_KEY + key).catch(e =>
      console.log('Auth storage remove error:', e)
    );
    return true;
  },
  clear() {
    const keys = Object.keys(storageCache);
    storageCache = {};
    keys.forEach(key => {
      AsyncStorage.removeItem(AUTH_STORAGE_KEY + key).catch(() => {});
    });
    return true;
  },
  // Load cached data from AsyncStorage (call on app start)
  async loadFromStorage() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const authKeys = allKeys.filter(k => k.startsWith(AUTH_STORAGE_KEY));
      if (authKeys.length > 0) {
        const pairs = await AsyncStorage.multiGet(authKeys);
        pairs.forEach(([key, value]) => {
          const shortKey = key.replace(AUTH_STORAGE_KEY, '');
          storageCache[shortKey] = value;
        });
      }
      storageLoaded = true;
      console.log('Auth storage loaded:', Object.keys(storageCache).length, 'items');
    } catch (e) {
      console.log('Auth storage load error:', e);
      storageLoaded = true;
    }
  }
};

const userPool = new CognitoUserPool({
  UserPoolId: awsConfig.Auth.userPoolId,
  ClientId: awsConfig.Auth.userPoolWebClientId,
  Storage: asyncStorage,
});

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth storage then check for existing session
    const initAuth = async () => {
      await asyncStorage.loadFromStorage();

      // Check if there's an existing session
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
          if (!err && session && session.isValid()) {
            // Restore user data
            cognitoUser.getUserAttributes((attrErr, attributes) => {
              if (!attrErr && attributes) {
                const userData = { sub: cognitoUser.getUsername() };
                attributes.forEach(attr => {
                  userData[attr.Name] = attr.Value;
                });
                setUser(userData);
                console.log('Session restored for:', userData.email || userData.sub);
              }
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const signUp = (email, password, name) => {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
      ];
      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          console.log('SignUp error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };

  const confirmSignUp = (email, code) => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
        Storage: asyncStorage,
      });
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          console.log('Confirm error:', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };

  const resendConfirmationCode = (email) => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
        Storage: asyncStorage,
      });
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };

  const signIn = (email, password) => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
        Storage: asyncStorage,
      });
      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          cognitoUser.getUserAttributes((err, attributes) => {
            if (!err && attributes) {
              const userData = { sub: cognitoUser.getUsername() };
              attributes.forEach(attr => {
                userData[attr.Name] = attr.Value;
              });
              setUser(userData);
            }
            resolve(session);
          });
        },
        onFailure: (err) => {
          console.log('SignIn error:', err);
          reject(err);
        },
      });
    });
  };

  const signOut = () => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
      setUser(null);
      resolve();
    });
  };

  const getToken = () => {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) {
        reject(new Error('No user logged in'));
        return;
      }
      cognitoUser.getSession((err, session) => {
        if (err) reject(err);
        else resolve(session.getIdToken().getJwtToken());
      });
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        confirmSignUp,
        resendConfirmationCode,
        signIn,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
