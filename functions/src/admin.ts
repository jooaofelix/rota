import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export const app = getApps().length ? getApps()[0] : initializeApp();
export const db = getFirestore(app);
export const messaging = getMessaging(app);
