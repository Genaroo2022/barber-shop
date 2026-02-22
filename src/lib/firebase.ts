import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, GoogleAuthProvider, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

const assertFirebaseConfigured = () => {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Firebase no configurado. Faltan: ${missingKeys.join(", ")}`);
  }
};

export const getFirebaseAuth = (): Auth => {
  assertFirebaseConfigured();
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
};

export const getGoogleProvider = (): GoogleAuthProvider => new GoogleAuthProvider();
