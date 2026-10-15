// Client SDK. API routes should use lib/firebase-admin.ts instead.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// avoid initialising twice on hot reload
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);
auth = getAuth(app);

export { db };

/** Signs in anonymously if needed and returns the uid (persists across refreshes) */
export async function ensureAnonymousAuth(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        unsubscribe();
        if (user) {
          resolve(user.uid);
        } else {
          try {
            const credential = await signInAnonymously(auth);
            resolve(credential.user.uid);
          } catch (error) {
            reject(error);
          }
        }
      },
      reject
    );
  });
}
