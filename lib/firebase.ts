"use client";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Null until the Firebase environment variables are set, so the site runs without it. */
export function firebaseApp(): FirebaseApp | null {
  if (!cfg.apiKey || !cfg.projectId) return null;
  return getApps()[0] ?? initializeApp(cfg);
}
