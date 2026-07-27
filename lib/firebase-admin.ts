/**
 * Server-only Firebase Admin SDK singleton.
 * Lazy initialization from FIREBASE_SERVICE_ACCOUNT_KEY env var.
 */

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
      "FIREBASE_SERVICE_ACCOUNT_KEY env var is not set — see README"
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

  // Guard for HMR / multiple invocations
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

// Re-export field value helpers for convenience
export { Timestamp, FieldValue };
