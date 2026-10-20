/**
 * Precarga el vademÃ©cum global (100 medicamentos) en Firestore `/medications`.
 *
 * Uso:  npx tsx scripts/seed-medications.ts
 * Requiere en .env.local: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Costo: ~100 escrituras (una sola vez). Idempotente: usa el id del medicamento como id del documento.
 */
import { readFileSync, existsSync } from 'fs';
import admin from 'firebase-admin';
import { VADEMECUM } from '../lib/data/vademecum';

// Cargar .env.local sin dependencias externas
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Faltan variables FIREBASE_* en .env.local');
  }

  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Lotes de mÃ¡x. 500 operaciones
  for (let i = 0; i < VADEMECUM.length; i += 400) {
    const batch = db.batch();
    for (const med of VADEMECUM.slice(i, i + 400)) {
      batch.set(db.collection('medications').doc(med.id), { ...med, createdAt: now, updatedAt: now });
    }
    await batch.commit();
  }
  console.log(`âœ… ${VADEMECUM.length} medicamentos precargados en /medications`);
}

main().catch((e) => {
  console.error('âŒ', e.message);
  process.exit(1);
});
