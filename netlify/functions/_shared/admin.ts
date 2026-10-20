import admin from 'firebase-admin';

export function initAdmin(): typeof admin {
  if (admin.apps.length) return admin;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');

  try {
    if (projectId && clientEmail && privateKey.includes('PRIVATE KEY')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      admin.initializeApp({
        projectId: projectId || 'vetsaas-dev',
      });
    }
  } catch (err) {
    console.warn('Advertencia inicializando Firebase Admin:', err);
  }

  return admin;
}
