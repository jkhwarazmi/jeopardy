// Server only. Uses the service account in FIREBASE_SERVICE_ACCOUNT_KEY.

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  type Firestore,
} from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDb) return adminDb;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set (see README)"
    );
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: " +
        (error instanceof Error ? error.message : String(error))
    );
  }

  // avoid initialising twice on hot reload
  if (!getApps().length) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = getApps()[0];
  }

  adminDb = getFirestore(adminApp);
  return adminDb;
}

export { Timestamp, FieldValue };
