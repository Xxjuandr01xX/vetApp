import admin from 'firebase-admin';

export function initAdmin(): typeof admin {
  if (admin.apps.length) return admin;

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  });

  return admin;
}
