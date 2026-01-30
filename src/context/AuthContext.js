import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import awsConfig from '../config/aws';

// Use in-memory storage (simpler, works reliably)
const memoryStorage = {
  data: {},
  setItem(key, value) {
    this.data[key] = value;
    return value;
  },
  getItem(key) {
    return this.data[key] || null;
  },
  removeItem(key) {
    delete this.data[key];
    return true;
  },
  clear() {
    this.data = {};
    return true;
  },
};

const userPool = new CognitoUserPool({
  UserPoolId: awsConfig.Auth.userPoolId,
  ClientId: awsConfig.Auth.userPoolWebClientId,
  Storage: memoryStorage,
});

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // With memory storage, no persisted session on app restart
    setLoading(false);
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
        Storage: memoryStorage,
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
        Storage: memoryStorage,
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
        Storage: memoryStorage,
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
