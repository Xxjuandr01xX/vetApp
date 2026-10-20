# VetSaaS — Documento Maestro de Especificación Técnica

**Propósito:** Este documento es la fuente única de verdad para el desarrollo de VetSaaS. Contiene todo el contexto, decisiones técnicas, modelos de datos, flujos y código de referencia necesarios para implementar el sistema completo. Está diseñado para ser consumido por un agente de desarrollo (Claude Opus) en el entorno Antigravity.

## 0\. 🎯 Contexto Rápido para el Agente

**Qué construir:** Un SaaS web (mobile-first) para veterinarios particulares en Venezuela que gestiona fichas de pacientes, tratamientos, citas, historial clínico y un catálogo de medicamentos basado en vademécum veterinario.

**Stack obligatorio:**

* **Frontend:** Next.js 14+ (App Router) \+ React \+ TypeScript \+ TailwindCSS \+ Flowbite React  
* **Backend:** Netlify Functions (Node.js 20\) \+ Firebase Admin SDK  
* **Base de datos:** Firestore (plan Spark, gratuito)  
* **Autenticación:** Firebase Auth con PIN de 6 dígitos vía Custom Tokens  
* **Hosting:** Netlify (free tier)  
* **Storage de archivos:** Cloudinary (Firebase Storage no está en Spark)  
* **Notificaciones:** Telegram Bot API (solo notificación al admin)  
* **Tasas de cambio:** DolarAPI Venezuela ([https\://ve.dolarapi.com/v1/cotizaciones](https://ve.dolarapi.com/v1/cotizaciones))  
* **PDFs:** @react-pdf/renderer (client-side)

**Modelo de negocio:** Freemium con aprobación manual de pagos por Pago Móvil / Binance. **Idioma:** Español (Venezuela). Todos los textos de UI en español. **Regla crítica:** El agente debe respetar los límites del plan Spark de Firebase (50k lecturas/día, 20k escrituras/día) y los 300 créditos/mes de Netlify. Optimizar siempre para minimizar lecturas/escrituras de Firestore y llamadas a Functions.

---

## 1\. 📋 Requisitos Funcionales (Alcance MVP)

### 1.1 Autenticación

* **RF-01:** Registro con email \+ nombre \+ PIN de 6 dígitos.  
* **RF-02:** Login con email \+ PIN (verificado en servidor, no en cliente).  
* **RF-03:** Bloqueo temporal tras 5 intentos fallidos (15 min).  
* **RF-04:** Cambio de PIN (usuario logueado).  
* **RF-05:** Recuperación de PIN vía email (Firebase Password Reset \+ endpoint de reset).  
* **RF-06:** PINs débiles (123456, 000000, etc.) rechazados.

### 1.2 Gestión de Pacientes

* **RF-07:** CRUD de pacientes (nombre, especie, raza, sexo, peso, fecha de nacimiento, dueño, etc.).  
* **RF-08:** Subida de foto del paciente (Cloudinary).  
* **RF-09:** Límite de 30 pacientes para usuarios free.

### 1.3 Citas

* **RF-10:** CRUD de citas (fecha, motivo, duración, estado).  
* **RF-11:** Vista de agenda (día/semana).  
* **RF-12:** Marcar cita como completed, cancelled, no\_show.

### 1.4 Tratamientos

* **RF-13:** CRUD de tratamientos vinculados a un paciente.  
* **RF-14:** Selección de medicamentos desde el catálogo global (autocompletado).  
* **RF-15:** Cálculo automático de dosis según peso (solo premium).  
* **RF-16:** Cálculo de precio en USD y Bs. según tasa BCV del día.

### 1.5 Historial Clínico

* **RF-17:** Registro cronológico inmutable de eventos (citas, tratamientos, notas).  
* **RF-18:** Vista de historial por paciente.

### 1.6 Catálogo de Medicamentos (Vademécum)

* **RF-19:** Catálogo global precargado por el admin.  
* **RF-20:** Búsqueda por principio activo o nombre comercial.  
* **RF-21:** Estructura completa: indicaciones, contraindicaciones, dosificación, etc.  
* **RF-22:** Veterinarios premium pueden crear medicamentos personalizados.

### 1.7 Pagos y Suscripción

* **RF-23:** Formulario de solicitud de pago (Pago Móvil / Binance) con captura.  
* **RF-24:** Notificación al admin vía Telegram (solo informativa).  
* **RF-25:** Panel web de administración para aprobar/rechazar pagos (solo admin).  
* **RF-26:** Al aprobar, el usuario obtiene `role: premium` por 30 días.  
* **RF-27:** Expiración automática de premium (verificación perezosa en login \+ cron externo).

### 1.8 Tasas BCV

* **RF-28:** Obtención de tasa USD y EUR oficial desde DolarAPI.  
* **RF-29:** Caché diario en Firestore (`/bcv_rates/{date}`).  
* **RF-30:** Cálculo automático de precios en Bs. con trazabilidad.

### 1.9 Panel de Administración

* **RF-31:** Ruta `/admin` accesible solo para `role: admin`.  
* **RF-32:** Gestión de pagos (aprobar/rechazar).  
* **RF-33:** Gestión del vademécum global.  
* **RF-34:** Métricas básicas (usuarios, pagos, conversiones).

---

## 2\. 🏗️ Arquitectura del Sistema

┌──────────────────────────────────────────────────────────────┐

│                     CLIENTE (Web / PWA)                      │

│   Next.js 14+ (App Router) \+ TypeScript \+ Tailwind           │

│   ├─ Flowbite React (componentes UI)                         │

│   ├─ Zustand (estado global ligero)                          │

│   ├─ TanStack Query (estado remoto)                          │

│   ├─ React Hook Form \+ Zod (formularios)                     │

│   └─ Firebase JS SDK v10 (Auth \+ Firestore)                  │

└───────────────────────────┬──────────────────────────────────┘

                            │ HTTPS

                            ▼

┌──────────────────────────────────────────────────────────────┐

│                  BACKEND (Netlify Functions)                 │

│   Node.js 20 serverless                                      │

│   ├─ /api/auth/register                                      │

│   ├─ /api/auth/login-pin                                     │

│   ├─ /api/auth/change-pin                                    │

│   ├─ /api/auth/reset-pin                                     │

│   ├─ /api/payments/request                                   │

│   ├─ /api/payments/approve  (solo admin)                     │

│   ├─ /api/payments/reject   (solo admin)                     │

│   ├─ /api/bcv/rates                                          │

│   └─ /api/admin/\*                                            │

│   Firebase Admin SDK (service account)                       │

└─────┬──────────────────────┬─────────────────────┬───────────┘

      │                      │                     │

      ▼                      ▼                     ▼

┌─────────────┐       ┌─────────────────┐   ┌─────────────────┐

│  Firebase   │       │   Firestore     │   │   Servicios     │

│  Auth       │       │   (Spark)       │   │   externos      │

│  (Spark)    │       │                 │   │                 │

│  Custom     │       │  Users, Pets,   │   │ • Cloudinary    │

│  Tokens     │       │  Treatments...  │   │ • Telegram Bot  │

└─────────────┘       └─────────────────┘   │ • DolarAPI      │

                                            │ • Resend (email)│

                                            └─────────────────┘

### 2.1 Estructura de Carpetas del Proyecto

vetsaas/

├── app/                              \# Next.js App Router

│   ├── (auth)/

│   │   ├── login/page.tsx

│   │   ├── register/page.tsx

│   │   └── reset-pin/page.tsx

│   ├── (dashboard)/

│   │   ├── layout.tsx                \# Layout protegido

│   │   ├── dashboard/page.tsx

│   │   ├── pets/

│   │   │   ├── page.tsx              \# Lista

│   │   │   ├── new/page.tsx

│   │   │   └── \[id\]/page.tsx         \# Ficha

│   │   ├── appointments/page.tsx

│   │   ├── treatments/

│   │   │   ├── page.tsx

│   │   │   └── new/page.tsx

│   │   ├── history/\[petId\]/page.tsx

│   │   └── settings/page.tsx

│   ├── (admin)/

│   │   ├── layout.tsx                \# Layout admin (guard role)

│   │   ├── admin/

│   │   │   ├── page.tsx              \# Dashboard admin

│   │   │   ├── payments/page.tsx

│   │   │   ├── medications/page.tsx

│   │   │   └── metrics/page.tsx

│   ├── (marketing)/

│   │   ├── page.tsx                  \# Landing

│   │   ├── pricing/page.tsx

│   │   └── legal/{terms,privacy}/page.tsx

│   ├── api/                          \# Redirige a Netlify Functions

│   └── layout.tsx

├── components/

│   ├── ui/                           \# Wrappers Flowbite

│   ├── forms/                        \# Formularios reutilizables

│   ├── layout/                       \# Navbar, Sidebar

│   └── domain/                       \# Componentes de dominio

├── lib/

│   ├── firebase/

│   │   ├── client.ts                 \# SDK cliente

│   │   └── admin.ts                  \# SDK admin (solo functions)

│   ├── validations/                  \# Esquemas Zod

│   ├── hooks/                        \# Custom hooks

│   ├── utils/                        \# Helpers

│   └── constants.ts

├── netlify/

│   └── functions/

│       ├── auth-register.ts

│       ├── auth-login-pin.ts

│       ├── auth-change-pin.ts

│       ├── auth-reset-pin.ts

│       ├── payments-request.ts

│       ├── payments-approve.ts

│       ├── payments-reject.ts

│       ├── bcv-rates.ts

│       ├── telegram-notify.ts

│       └── \_shared/

│           ├── admin.ts              \# Init Firebase Admin

│           ├── cors.ts

│           └── auth-guard.ts         \# Verifica custom claims

├── public/

│   ├── icons/                        \# Iconos veterinarios

│   └── manifest.json                 \# PWA

├── styles/

│   └── globals.css

├── tailwind.config.ts

├── next.config.js

├── netlify.toml

├── firestore.rules

├── firestore.indexes.json

├── package.json

├── tsconfig.json

└── .env.local                        \# (no commitear)

### 2.2 Variables de Entorno Requeridas

\# .env.local (cliente)

NEXT\_PUBLIC\_FIREBASE\_API\_KEY=

NEXT\_PUBLIC\_FIREBASE\_AUTH\_DOMAIN=

NEXT\_PUBLIC\_FIREBASE\_PROJECT\_ID=

NEXT\_PUBLIC\_FIREBASE\_STORAGE\_BUCKET=

NEXT\_PUBLIC\_FIREBASE\_MESSAGING\_SENDER\_ID=

NEXT\_PUBLIC\_FIREBASE\_APP\_ID=

NEXT\_PUBLIC\_CLOUDINARY\_CLOUD\_NAME=

NEXT\_PUBLIC\_CLOUDINARY\_UPLOAD\_PRESET=

\# Netlify (server-side, NO expuestas al cliente)

FIREBASE\_PROJECT\_ID=

FIREBASE\_CLIENT\_EMAIL=

FIREBASE\_PRIVATE\_KEY=

TELEGRAM\_BOT\_TOKEN=

TELEGRAM\_CHAT\_ID=

CLOUDINARY\_API\_KEY=

CLOUDINARY\_API\_SECRET=

RESEND\_API\_KEY=

ADMIN\_EMAIL=

ALLOWED\_ORIGIN=https\://tu-app.netlify.app

---

## 3\. 📊 Modelo de Datos (Firestore)

### 3.1 Mapa de Colecciones

/users/{uid}

  ├─ (documento del usuario)

  ├─ /notifications/{notifId}         (subcolección: campana)

  └─ /audit/{logId}                   (subcolección: acciones sensibles)

/pets/{petId}

/appointments/{appId}

/treatments/{trtId}

/history/{evtId}

/medications/{medId}

/payment\_requests/{reqId}

/payment\_history/{paymentId}

/login\_attempts/{attemptId}

/bcv\_rates/{date}

/system/config                        (documento único)

### 3.2 Esquemas Detallados

#### `/users/{uid}`

interface User {

  email: string;

  displayName: string;

  role: 'free' | 'premium' | 'admin';

  pinHash: string;              // bcrypt, NUNCA legible por el cliente

  failedAttempts: number;

  lockedUntil: Timestamp | null;

  paymentStatus: 'none' | 'pending' | 'approved' | 'rejected';

  premiumUntil: Timestamp | null;

  phone?: string;

  locale: 'es-VE';

  onboardingCompleted: boolean;

  createdAt: Timestamp;

}

#### `/pets/{petId}`

interface Pet {

  vetId: string;                // uid del veterinario

  name: string;

  species: 'Canino' | 'Felino' | 'Equino' | 'Ave' | 'Exótico' | 'Otro';

  breed?: string;

  sex: 'M' | 'F';

  neutered: boolean;

  birthDate?: Timestamp;

  weightKg?: number;

  color?: string;

  microchip?: string;

  photoUrl?: string;

  owner: {

    name: string;

    phone: string;

    email?: string;

    address?: string;

  };

  allergies: string\[\];

  chronicConditions: string\[\];

  notes?: string;

  status: 'active' | 'inactive' | 'deceased';

  createdAt: Timestamp;

  updatedAt: Timestamp;

}

#### `/appointments/{appId}`

interface Appointment {

  vetId: string;

  petId: string;

  date: Timestamp;

  durationMin: number;

  reason: string;

  status: 'scheduled' | 'completed' | 'cancelled' | 'no\_show';

  notes?: string;

  createdAt: Timestamp;

}

#### `/treatments/{trtId}`

interface Treatment {

  vetId: string;

  petId: string;

  appointmentId?: string | null;

  diagnosis: string;

  weightAtVisit?: number;

  medications: TreatmentMedication\[\];

  procedures: string\[\];

  recommendations?: string;

  servicePrice?: ServicePrice;

  createdAt: Timestamp;

}

interface TreatmentMedication {

  medicationId: string;

  activeIngredient: string;

  commercialName: string;

  presentationId?: string;

  dose: string;

  route: string;

  frequency: string;

  durationDays: number;

  calculatedDose?: string;

  notes?: string;

}

interface ServicePrice {

  amountUSD: number;

  amountVES: number;

  rateUsed: number;

  rateDate: string;              // ISO date de la tasa BCV

  rateSource: string;            // "DolarAPI (BCV)"

  currency: 'USD' | 'EUR';

  isManualRate: boolean;

}

#### `/history/{evtId}`

interface HistoryEvent {

  vetId: string;

  petId: string;

  type: 'treatment' | 'appointment' | 'vaccination' | 'weight' | 'note' | 'file';

  refId: string;                 // ID del documento origen

  summary: string;

  date: Timestamp;

  createdAt: Timestamp;          // Inmutable

}

#### `/medications/{medId}` — Vademécum Completo

interface Medication {

  // Identificación

  id: string;

  activeIngredients: ActiveIngredient\[\];

  atcVetCode?: string;

  therapeuticClass: string;

  pharmacologicalAction: string;

  prescriptionStatus: 'A' | 'B' | 'C' | 'CF' | 'F';

  // Información clínica

  targetSpecies: string\[\];

  indications: string\[\];

  contraindications: string\[\];

  adverseReactions: string\[\];

  interactions: Interaction\[\];

  precautions: string\[\];

  pregnancyLactation: {

    pregnancy: string;

    lactation: string;

  };

  // Dosificación

  dosages: Dosage\[\];

  // Farmacocinética

  pharmacokinetics?: Pharmacokinetics;

  // Tiempos de espera

  withdrawalPeriods?: WithdrawalPeriod\[\];

  // Presentaciones comerciales

  presentations: Presentation\[\];

  // Búsqueda

  commercialNames: string\[\];

  searchKeywords: string\[\];      // Todo lowercase, para array-contains

  speciesDosageTable?: Record\<string, string\>;

  // Control

  isControlled: boolean;

  requiresPrescription: boolean;

  // Metadatos

  isGlobal: boolean;

  createdBy: string;

  version: number;

  lastReviewedAt?: Timestamp;

  references?: string\[\];

  createdAt: Timestamp;

  updatedAt: Timestamp;

}

interface ActiveIngredient {

  name: string;

  concentration: string;

  unit: string;

}

interface Interaction {

  with: string;

  effect: string;

}

interface Dosage {

  species: string;

  indication: string;

  route: string;

  dose: string;

  frequency: string;

  duration: string;

}

interface Pharmacokinetics {

  absorption?: string;

  proteinBinding?: string;

  distribution?: string;

  metabolism?: string;

  halfLife?: string;

  elimination?: string;

}

interface WithdrawalPeriod {

  species: string;

  meat?: string;

  milk?: string;

  eggs?: string;

}

interface Presentation {

  id: string;

  commercialName: string;

  manufacturer: string;

  pharmaceuticalForm: string;

  presentation: string;

  excipients?: string\[\];

  storage?: string;

  registrationNumber?: string;

}

#### `/payment_requests/{reqId}`

interface PaymentRequest {

  userId: string;

  userName: string;

  userEmail: string;

  plan: 'premium\_monthly' | 'premium\_yearly';

  amount: number;

  currency: 'USD' | 'EUR';

  method: 'pago\_movil' | 'binance';

  reference: string;

  captureUrl: string;            // Cloudinary

  status: 'pending' | 'approved' | 'rejected';

  reason?: string;               // Si rechazado

  createdAt: Timestamp;

  processedAt?: Timestamp;

  processedBy?: string;          // uid del admin

}

#### `/payment_history/{paymentId}`

Mismo esquema que `PaymentRequest`, pero solo con pagos aprobados (inmutable).

#### `/login_attempts/{attemptId}`

interface LoginAttempt {

  email: string;

  ip: string;

  userAgent: string;

  success: boolean;

  timestamp: Timestamp;

}

#### `/bcv_rates/{date}`

interface BcvRate {

  date: string;                  // YYYY-MM-DD

  usd: number;

  eur: number;

  usdUpdatedAt: string;          // Del campo fechaActualizacion de DolarAPI

  eurUpdatedAt: string;

  source: 'DolarAPI (BCV)';

  fetchedAt: Timestamp;

}

#### `/system/config` (documento único)

interface SystemConfig {

  premiumPriceUSD: number;

  paymentMethods: ('pago\_movil' | 'binance')\[\];

  pagoMovilData: { banco: string; telefono: string; cedula: string };

  binanceData: { wallet: string; red: string };

  freePlanPatientLimit: number;

  telegramChatId: string;

  maintenanceMode: boolean;

}

### 3.3 Índices Compuestos Requeridos

Crear en `firestore.indexes.json`:

{

  "indexes": \[

    {

      "collectionGroup": "pets",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "vetId", "order": "ASCENDING" },

        { "fieldPath": "status", "order": "ASCENDING" },

        { "fieldPath": "updatedAt", "order": "DESCENDING" }

      \]

    },

    {

      "collectionGroup": "appointments",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "vetId", "order": "ASCENDING" },

        { "fieldPath": "date", "order": "ASCENDING" }

      \]

    },

    {

      "collectionGroup": "treatments",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "vetId", "order": "ASCENDING" },

        { "fieldPath": "createdAt", "order": "DESCENDING" }

      \]

    },

    {

      "collectionGroup": "history",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "petId", "order": "ASCENDING" },

        { "fieldPath": "date", "order": "DESCENDING" }

      \]

    },

    {

      "collectionGroup": "medications",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "searchKeywords", "arrayConfig": "CONTAINS" },

        { "fieldPath": "targetSpecies", "arrayConfig": "CONTAINS" }

      \]

    },

    {

      "collectionGroup": "payment\_requests",

      "queryScope": "COLLECTION",

      "fields": \[

        { "fieldPath": "status", "order": "ASCENDING" },

        { "fieldPath": "createdAt", "order": "DESCENDING" }

      \]

    }

  \]

}

---

## 4\. 🔐 Autenticación con PIN (Detalle de Implementación)

### 4.1 Flujo de Registro

**Endpoint:** `POST /api/auth/register` **Body:**

{ "email": "vet@ejemplo.com", "displayName": "Dra. Ana", "pin": "483920" }

**Implementación (`netlify/functions/auth-register.ts`):**

import type { Handler } from '@netlify/functions';

import admin from 'firebase-admin';

import bcrypt from 'bcryptjs';

import crypto from 'crypto';

import { z } from 'zod';

import { initAdmin } from './\_shared/admin';

import { corsHeaders } from './\_shared/cors';

initAdmin();

const WEAK\_PINS \= \['123456','654321','000000','111111','112233','121212','123123','012345','987654'\];

const RegisterSchema \= z.object({

  email: z.string().email(),

  displayName: z.string().min(2).max(60),

  pin: z.string().regex(/^\\d{6}\$/),

});

const isSequential \= (p: string) \=\> '0123456789'.includes(p) || '9876543210'.includes(p);

export const handler: Handler \= async (event) \=\> {

  const headers \= corsHeaders(event);

  if (event.httpMethod \=== 'OPTIONS') return { statusCode: 204, headers };

  if (event.httpMethod \!== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {

    const parsed \= RegisterSchema.safeParse(JSON.parse(event.body || '{}'));

    if (\!parsed.success) {

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos', details: parsed.error.flatten() }) };

    }

    const { email, displayName, pin } \= parsed.data;

    if (WEAK\_PINS.includes(pin) || isSequential(pin)) {

      return { statusCode: 400, headers, body: JSON.stringify({ error: 'El PIN es demasiado débil. Elige otro.' }) };

    }

    try {

      await admin.auth().getUserByEmail(email);

      return { statusCode: 409, headers, body: JSON.stringify({ error: 'El email ya está registrado' }) };

    } catch { /\* no existe, ok \*/ }

    const randomPassword \= crypto.randomBytes(32).toString('hex');

    const userRecord \= await admin.auth().createUser({

      email,

      password: randomPassword,

      displayName,

      emailVerified: false,

    });

    const pinHash \= await bcrypt.hash(pin, 10);

    await admin.firestore().collection('users').doc(userRecord.uid).set({

      email,

      displayName,

      role: 'free',

      pinHash,

      failedAttempts: 0,

      lockedUntil: null,

      paymentStatus: 'none',

      premiumUntil: null,

      locale: 'es-VE',

      onboardingCompleted: false,

      createdAt: admin.firestore.FieldValue.serverTimestamp(),

    });

    return { statusCode: 201, headers, body: JSON.stringify({ success: true, uid: userRecord.uid }) };

  } catch (err) {

    console.error('register error', err);

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };

  }

};

### 4.2 Flujo de Login

**Endpoint:** `POST /api/auth/login-pin`

**Implementación (`netlify/functions/auth-login-pin.ts`):**

import type { Handler } from '@netlify/functions';

import admin from 'firebase-admin';

import bcrypt from 'bcryptjs';

import { z } from 'zod';

import { initAdmin } from './\_shared/admin';

import { corsHeaders } from './\_shared/cors';

initAdmin();

const MAX\_ATTEMPTS \= 5;

const LOCK\_MINUTES \= 15;

const LoginSchema \= z.object({

  email: z.string().email(),

  pin: z.string().regex(/^\\d{6}\$/),

});

export const handler: Handler \= async (event) \=\> {

  const headers \= corsHeaders(event);

  if (event.httpMethod \=== 'OPTIONS') return { statusCode: 204, headers };

  if (event.httpMethod \!== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {

    const parsed \= LoginSchema.safeParse(JSON.parse(event.body || '{}'));

    if (\!parsed.success) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };

    const { email, pin } \= parsed.data;

    let userRecord;

    try { userRecord \= await admin.auth().getUserByEmail(email); }

    catch { return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) }; }

    const db \= admin.firestore();

    const userRef \= db.collection('users').doc(userRecord.uid);

    const userSnap \= await userRef.get();

    if (\!userSnap.exists) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };

    const userData \= userSnap.data()\!;

    const now \= Date.now();

    if (userData.lockedUntil && userData.lockedUntil.toMillis() \> now) {

      const mins \= Math.ceil((userData.lockedUntil.toMillis() \- now) / 60000);

      return { statusCode: 429, headers, body: JSON.stringify({ error: \`Cuenta bloqueada. Intenta en \${mins} min.\` }) };

    }

    const pinOk \= await bcrypt.compare(pin, userData.pinHash);

    // Log intento (fire & forget)

    db.collection('login\_attempts').add({

      email,

      ip: event.headers\['x-nf-client-connection-ip'\] || event.headers\['x-forwarded-for'\] || 'unknown',

      userAgent: event.headers\['user-agent'\] || 'unknown',

      success: pinOk,

      timestamp: admin.firestore.FieldValue.serverTimestamp(),

    }).catch(() \=\> {});

    if (\!pinOk) {

      const attempts \= (userData.failedAttempts || 0\) \+ 1;

      const update: any \= { failedAttempts: attempts };

      if (attempts \>= MAX\_ATTEMPTS) {

        update.lockedUntil \= admin.firestore.Timestamp.fromMillis(now \+ LOCK\_MINUTES \* 60 \* 1000);

        update.failedAttempts \= 0;

      }

      await userRef.update(update);

      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };

    }

    // Verificación perezosa de expiración premium

    let role \= userData.role;

    if (role \=== 'premium' && userData.premiumUntil && userData.premiumUntil.toMillis() \< now) {

      role \= 'free';

      await userRef.update({ role: 'free', paymentStatus: 'none' });

      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'free' });

    }

    await userRef.update({ failedAttempts: 0, lockedUntil: null });

    const customToken \= await admin.auth().createCustomToken(userRecord.uid, { role });

    return { statusCode: 200, headers, body: JSON.stringify({ customToken }) };

  } catch (err) {

    console.error('login error', err);

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };

  }

};

### 4.3 Helper Compartido `_shared/admin.ts`

import admin from 'firebase-admin';

export function initAdmin() {

  if (admin.apps.length) return admin;

  const privateKey \= (process.env.FIREBASE\_PRIVATE\_KEY || '').replace(/\\\\n/g, '\\n');

  admin.initializeApp({

    credential: admin.credential.cert({

      projectId: process.env.FIREBASE\_PROJECT\_ID\!,

      clientEmail: process.env.FIREBASE\_CLIENT\_EMAIL\!,

      privateKey,

    }),

  });

  return admin;

}

export function verifyAdmin(event: any): boolean {

  // Verifica el ID token del header Authorization y comprueba role \=== 'admin'

  // Implementación en el helper auth-guard.ts

  return true;

}

### 4.4 Helper `_shared/cors.ts`

export function corsHeaders(event: any) {

  const origin \= event.headers?.origin || '';

  const allowed \= (process.env.ALLOWED\_ORIGIN || '').split(',');

  const allowOrigin \= allowed.includes(origin) ? origin : allowed\[0\] || '\*';

  return {

    'Access-Control-Allow-Origin': allowOrigin,

    'Access-Control-Allow-Headers': 'Content-Type, Authorization',

    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',

    'Content-Type': 'application/json',

  };

}

### 4.5 Frontend: Login con Teclado Numérico

// app/(auth)/login/page.tsx (fragmento)

'use client';

import { useState } from 'react';

import { signInWithCustomToken } from 'firebase/auth';

import { auth } from '@/lib/firebase/client';

import { useRouter } from 'next/navigation';

import { Button, TextInput } from 'flowbite-react';

export default function LoginPage() {

  const router \= useRouter();

  const \[step, setStep\] \= useState\<'email' | 'pin'\>('email');

  const \[email, setEmail\] \= useState('');

  const \[pin, setPin\] \= useState('');

  const \[error, setError\] \= useState('');

  const \[loading, setLoading\] \= useState(false);

  async function handleLogin() {

    setLoading(true); setError('');

    try {

      const res \= await fetch('/api/auth/login-pin', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email, pin }),

      });

      const data \= await res.json();

      if (\!res.ok) { setError(data.error || 'Error'); setPin(''); return; }

      

      await signInWithCustomToken(auth, data.customToken);

      router.push('/dashboard');

    } catch {

      setError('Error de conexión');

    } finally {

      setLoading(false);

    }

  }

  return (

    \<div className="min-h-screen flex items-center justify-center p-4 bg-gray-50"\>

      \<div className="w-full max-w-sm"\>

        \<h1 className="text-2xl font-bold text-vet-primary mb-6 text-center"\>VetSaaS\</h1\>

        

        {step \=== 'email' ? (

          \<\>

            \<TextInput

              type="email" value={email} onChange={(e) \=\> setEmail(e.target.value)}

              placeholder="tu@email.com" sizing="lg" className="mb-4"

            /\>

            \<Button size="lg" className="w-full" onClick={() \=\> email && setStep('pin')}\>

              Continuar

            \</Button\>

          \</\>

        ) : (

          \<\>

            \<p className="text-center text-sm text-gray-600 mb-4"\>{email}\</p\>

            \<div className="flex justify-center gap-2 mb-6"\>

              {\[0,1,2,3,4,5\].map(i \=\> (

                \<div key={i} className={\`w-10 h-12 border-b-2 flex items-center justify-center text-2xl

                  \${pin.length \> i ? 'border-vet-primary' : 'border-gray-300'}\`}\>

                  {pin.length \> i ? '●' : ''}

                \</div\>

              ))}

            \</div\>

            

            \<div className="grid grid-cols-3 gap-3"\>

              {\[1,2,3,4,5,6,7,8,9\].map(n \=\> (

                \<Button key={n} size="lg" color="light"

                  onClick={() \=\> setPin(p \=\> (p.length \< 6 ? p \+ n : p))}\>

                  {n}

                \</Button\>

              ))}

              \<Button size="lg" color="light" onClick={() \=\> setPin('')}\>C\</Button\>

              \<Button size="lg" color="light"

                onClick={() \=\> setPin(p \=\> (p.length \< 6 ? p \+ '0' : p))}\>0\</Button\>

              \<Button size="lg" color="light"

                onClick={() \=\> setPin(p \=\> p.slice(0, \-1))}\>⌫\</Button\>

            \</div\>

            {error && \<p className="text-red-500 text-sm mt-4 text-center"\>{error}\</p\>}

            

            \<Button size="lg" className="w-full mt-6" disabled={pin.length \!== 6 || loading}

              onClick={handleLogin}\>

              {loading ? 'Verificando...' : 'Iniciar sesión'}

            \</Button\>

          \</\>

        )}

      \</div\>

    \</div\>

  );

}

---

## 5\. 💳 Flujo de Pagos

### 5.1 Diagrama de Secuencia

Usuario              Netlify Function         Firestore         Telegram         Admin

  │                        │                      │                │              │

  ├─ sube captura ────────►│                      │                │              │

  │  a Cloudinary          │                      │                │              │

  ├─ POST /payments/request►│                      │                │              │

  │                        ├─ crea payment\_req ──►│                │              │

  │                        ├─ update user status ─►│                │              │

  │                        ├─ envía notif ────────┼───────────────►│              │

  │                        │                      │                │              │

  │◄─ 202 Accepted ────────┤                      │                │              │

  │                        │                      │                │              │

  │                        │                      │                │  revisa ◄────┤

  │                        │                      │                │              │

  │                        │◄── POST /payments/approve (auth admin) ┘              │

  │                        ├─ setCustomUserClaims►│                │              │

  │                        ├─ update user role ──►│                │              │

  │                        ├─ guarda en history ─►│                │              │

  │                        ├─ notifica usuario ──┼───────────────►│              │

  │◄─ premium activo ──────┤                      │                │              │

### 5.2 Endpoint `POST /api/payments/request`

// netlify/functions/payments-request.ts

import type { Handler } from '@netlify/functions';

import admin from 'firebase-admin';

import { z } from 'zod';

import { initAdmin } from './\_shared/admin';

import { corsHeaders } from './\_shared/cors';

initAdmin();

const Schema \= z.object({

  userId: z.string(),

  userName: z.string(),

  userEmail: z.string().email(),

  plan: z.enum(\['premium\_monthly', 'premium\_yearly'\]),

  amount: z.number().positive(),

  currency: z.enum(\['USD', 'EUR'\]),

  method: z.enum(\['pago\_movil', 'binance'\]),

  reference: z.string().min(3),

  captureUrl: z.string().url(),

});

export const handler: Handler \= async (event) \=\> {

  const headers \= corsHeaders(event);

  if (event.httpMethod \=== 'OPTIONS') return { statusCode: 204, headers };

  if (event.httpMethod \!== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {

    const parsed \= Schema.safeParse(JSON.parse(event.body || '{}'));

    if (\!parsed.success) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Datos inválidos' }) };

    const db \= admin.firestore();

    const reqRef \= await db.collection('payment\_requests').add({

      ...parsed.data,

      status: 'pending',

      createdAt: admin.firestore.FieldValue.serverTimestamp(),

    });

    await db.collection('users').doc(parsed.data.userId).update({ paymentStatus: 'pending' });

    // Notificación Telegram (no bloquea la respuesta)

    notifyTelegram({ reqId: reqRef.id, ...parsed.data }).catch(console.error);

    return { statusCode: 202, headers, body: JSON.stringify({ success: true, requestId: reqRef.id }) };

  } catch (err) {

    console.error('payments-request error', err);

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };

  }

};

async function notifyTelegram(payload: any) {

  const token \= process.env.TELEGRAM\_BOT\_TOKEN;

  const chatId \= process.env.TELEGRAM\_CHAT\_ID;

  if (\!token || \!chatId) return;

  const adminUrl \= \`\${process.env.ALLOWED\_ORIGIN}/admin/payments?reqId=\${payload.reqId}\`;

  const caption \=

    \`💰 \*Nueva Solicitud de Pago\*\\n\\n\` \+

    \`👤 \${payload.userName}\\n\` \+

    \`📧 \${payload.userEmail}\\n\` \+

    \`📦 \${payload.plan}\\n\` \+

    \`💵 \$\${payload.amount} \${payload.currency}\\n\` \+

    \`🏦 \${payload.method}\\n\` \+

    \`🔢 Ref: \${payload.reference}\\n\\n\` \+

    \`🔗 \[Revisar en el panel\](\${adminUrl})\`;

  await fetch(\`https\://api.telegram.org/bot\${token}/sendPhoto\`, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      chat\_id: chatId,

      photo: payload.captureUrl,

      caption,

      parse\_mode: 'Markdown',

    }),

  });

}

### 5.3 Endpoint `POST /api/payments/approve` (solo admin)

// netlify/functions/payments-approve.ts

import type { Handler } from '@netlify/functions';

import admin from 'firebase-admin';

import { initAdmin } from './\_shared/admin';

import { corsHeaders } from './\_shared/cors';

initAdmin();

const PREMIUM\_DAYS \= 30;

export const handler: Handler \= async (event) \=\> {

  const headers \= corsHeaders(event);

  if (event.httpMethod \=== 'OPTIONS') return { statusCode: 204, headers };

  if (event.httpMethod \!== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {

    // 1\. Verificar que el caller es admin

    const authHeader \= event.headers.authorization || event.headers.Authorization;

    if (\!authHeader?.startsWith('Bearer ')) {

      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };

    }

    const idToken \= authHeader.substring(7);

    const decoded \= await admin.auth().verifyIdToken(idToken);

    if (decoded.role \!== 'admin') {

      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acceso denegado' }) };

    }

    const { requestId } \= JSON.parse(event.body || '{}');

    if (\!requestId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta requestId' }) };

    const db \= admin.firestore();

    const reqRef \= db.collection('payment\_requests').doc(requestId);

    const reqSnap \= await reqRef.get();

    if (\!reqSnap.exists) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Solicitud no encontrada' }) };

    const req \= reqSnap.data()\!;

    if (req.status \!== 'pending') return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya procesada' }) };

    const now \= Date.now();

    const premiumUntil \= admin.firestore.Timestamp.fromMillis(now \+ PREMIUM\_DAYS \* 24 \* 60 \* 60 \* 1000);

    // 2\. Actualizar Firestore

    await reqRef.update({

      status: 'approved',

      processedAt: admin.firestore.FieldValue.serverTimestamp(),

      processedBy: decoded.uid,

    });

    await db.collection('users').doc(req.userId).update({

      role: 'premium',

      paymentStatus: 'approved',

      premiumUntil,

    });

    // 3\. Custom Claim

    await admin.auth().setCustomUserClaims(req.userId, { role: 'premium' });

    // 4\. Historial

    await db.collection('payment\_history').add({

      ...req,

      status: 'approved',

      processedAt: admin.firestore.FieldValue.serverTimestamp(),

      processedBy: decoded.uid,

    });

    // 5\. Notificar al usuario (opcional)

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {

    console.error('payments-approve error', err);

    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };

  }

};

*Nota: `payments-reject.ts` es análogo, pero sin cambiar role ni custom claims, y guardando el motivo de rechazo.*

---

## 6\. 💱 Tasas BCV con DolarAPI

**Endpoint de la API:** `GET https://ve.dolarapi.com/v1/cotizaciones` **Respuesta:**

\[

  { "moneda": "USD", "fuente": "oficial", "nombre": "Dólar", "promedio": 875.6505, "fechaActualizacion": "2026-10-09T00:00:00-04:00" },

  { "moneda": "EUR", "fuente": "oficial", "nombre": "Euro", "promedio": 980.6147, "fechaActualizacion": "2026-10-09T00:00:00-04:00" }

\]

**Endpoint interno:** `GET /api/bcv/rates`

// netlify/functions/bcv-rates.ts

import type { Handler } from '@netlify/functions';

import admin from 'firebase-admin';

import { initAdmin } from './\_shared/admin';

initAdmin();

const DOLARAPI\_URL \= 'https\://ve.dolarapi.com/v1/cotizaciones';

export const handler: Handler \= async () \=\> {

  const db \= admin.firestore();

  const today \= new Date().toISOString().split('T')\[0\];

  const cacheRef \= db.collection('bcv\_rates').doc(today);

  const cached \= await cacheRef.get();

  if (cached.exists) {

    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },

      body: JSON.stringify(cached.data()),

    };

  }

  try {

    const res \= await fetch(DOLARAPI\_URL, { headers: { Accept: 'application/json' } });

    if (\!res.ok) throw new Error(\`DolarAPI \${res.status}\`);

    const data \= await res.json() as any\[\];

    const usd \= data.find(c \=\> c.moneda \=== 'USD' && c.fuente \=== 'oficial');

    const eur \= data.find(c \=\> c.moneda \=== 'EUR' && c.fuente \=== 'oficial');

    if (\!usd || \!eur) throw new Error('Sin cotizaciones oficiales');

    const rates \= {

      date: today,

      usd: usd.promedio,

      eur: eur.promedio,

      usdUpdatedAt: usd.fechaActualizacion,

      eurUpdatedAt: eur.fechaActualizacion,

      source: 'DolarAPI (BCV)',

      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),

    };

    await cacheRef.set(rates);

    return {

      statusCode: 200,

      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },

      body: JSON.stringify(rates),

    };

  } catch (err) {

    console.error('bcv-rates error', err);

    const last \= await db.collection('bcv\_rates').orderBy('date', 'desc').limit(1).get();

    if (\!last.empty) {

      return { statusCode: 200, headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ ...last.docs\[0\].data(), stale: true }) };

    }

    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ error: 'No se pudo obtener la tasa BCV' }) };

  }

};

**Estrategia de caché (3 capas):**

| Capa | Duración | Motivo |
| :---- | :---- | :---- |
| Firestore `/bcv_rates/{date}` | 1 día | El BCV publica una vez al día |
| CDN Netlify (`Cache-Control`) | 1 hora | Reduce ejecuciones de Function |
| Cliente (`localStorage`) | 1 hora | Evita peticiones repetidas |

**Hook de React:**

// lib/hooks/useBcvRates.ts

import useSWR from 'swr';

const fetcher \= (url: string) \=\> fetch(url).then(r \=\> r.json());

export function useBcvRates() {

  const { data, error, isLoading, mutate } \= useSWR('/api/bcv/rates', fetcher, {

    revalidateOnFocus: false,

    refreshInterval: 60 \* 60 \* 1000, // 1h

  });

  return { rates: data, isLoading, error, refresh: mutate };

}

**Cálculo del precio:**

function calcVES(amountUSD: number, rate: number): number {

  return Math.round(amountUSD \* rate \* 100\) / 100;

}

---

## 7\. 🔒 Reglas de Seguridad de Firestore

`firestore.rules`:

rules\_version \= '2';

service cloud.firestore {

  match /databases/{database}/documents {

    function isAuth() { return request.auth \!= null; }

    function isAdmin() { return isAuth() && request.auth.token.role \== 'admin'; }

    function isPremium() { return isAuth() &&

      (request.auth.token.role \== 'premium' || request.auth.token.role \== 'admin'); }

    function owns(uid) { return isAuth() && request.auth.uid \== uid; }

    match /users/{uid} {

      allow read: if owns(uid) || isAdmin();

      allow create: if false;

      allow update: if (owns(uid) &&

        \!request.resource.data.diff(resource.data).affectedKeys()

          .hasAny(\['pinHash','role','paymentStatus','premiumUntil','failedAttempts','lockedUntil'\]))

        || isAdmin();

      allow delete: if isAdmin();

      match /notifications/{nid} {

        allow read, update: if owns(uid);

        allow create: if false;

      }

      match /audit/{lid} {

        allow read: if isAdmin();

        allow write: if false;

      }

    }

    match /pets/{petId} {

      allow read, update, delete: if owns(resource.data.vetId) || isAdmin();

      allow create: if isAuth() && request.resource.data.vetId \== request.auth.uid;

    }

    match /appointments/{id} {

      allow read, update, delete: if owns(resource.data.vetId) || isAdmin();

      allow create: if isAuth() && request.resource.data.vetId \== request.auth.uid;

    }

    match /treatments/{id} {

      allow read, update, delete: if owns(resource.data.vetId) || isAdmin();

      allow create: if isAuth() && request.resource.data.vetId \== request.auth.uid;

    }

    match /history/{id} {

      allow read: if owns(resource.data.vetId) || isAdmin();

      allow write: if false;

    }

    match /medications/{medId} {

      allow read: if isAuth();

      allow write: if isAdmin() ||

        (isPremium() && request.resource.data.isGlobal \== false &&

          request.resource.data.createdBy \== request.auth.uid);

    }

    match /payment\_requests/{id} {

      allow read: if isAdmin() || (isAuth() && resource.data.userId \== request.auth.uid);

      allow create: if isAuth() && request.resource.data.userId \== request.auth.uid

        && request.resource.data.status \== 'pending';

      allow update, delete: if isAdmin();

    }

    match /payment\_history/{id} {

      allow read: if isAdmin() || (isAuth() && resource.data.userId \== request.auth.uid);

      allow write: if false;

    }

    match /login\_attempts/{id} {

      allow read, write: if false;

    }

    match /bcv\_rates/{date} {

      allow read: if isAuth();

      allow write: if false;

    }

    match /system/{doc} {

      allow read: if isAuth();

      allow write: if isAdmin();

    }

  }

}

---

## 8\. 🎨 UI/UX con Flowbite

### 8.1 Instalación

npm install flowbite flowbite-react

`tailwind.config.ts`:

import type { Config } from 'tailwindcss';

import flowbite from 'flowbite-react/tailwind';

export default {

  content: \[

    './app/\*\*/\*.{js,ts,jsx,tsx,mdx}',

    './components/\*\*/\*.{js,ts,jsx,tsx,mdx}',

    flowbite.content(),

  \],

  plugins: \[flowbite.plugin()\],

  theme: {

    extend: {

      colors: {

        vet: {

          primary: '\#1E3A5F',

          'primary-light': '\#3B82F6',

          accent: '\#10B981',

          'accent-warm': '\#F59E0B',

          danger: '\#EF4444',

        },

        surface: {

          DEFAULT: '\#FFFFFF',

          muted: '\#F3F4F6',

          subtle: '\#F9FAFB',

        },

      },

      fontFamily: { sans: \['Inter', 'system-ui', 'sans-serif'\] },

    },

  },

} satisfies Config;

### 8.2 Paleta de Colores

| Rol | Hex | Uso |
| :---- | :---- | :---- |
| Primary | `#1E3A5F` | Header, botones primarios, sidebar |
| Primary-light | `#3B82F6` | Enlaces, focus, selección |
| Accent | `#10B981` | Éxito, estados positivos, premium |
| Accent-warm | `#F59E0B` | Alertas, pendientes |
| Danger | `#EF4444` | Errores, eliminar |
| Surface muted | `#F3F4F6` | Tarjetas, secciones |

### 8.3 Iconografía

Usar Heroicons (integrados en Flowbite) \+ iconos veterinarios de IconScout / Noun Project para:

* **Paciente:** huella de pata (PawIcon)  
* **Especies:** perro, gato, ave, caballo  
* **Medicamento:** píldora, jeringa  
* **Consulta:** estetoscopio  
* **Cita:** calendario, reloj  
* **Premium:** corona, estrella

### 8.4 Componentes Flowbite por Pantalla

| Pantalla | Componentes |
| :---- | :---- |
| Login (email) | TextInput, Button |
| Login (PIN) | Botones grid 3x3, indicadores |
| Dashboard | Card, Stats, ProgressBar, Badge |
| Lista de pacientes | Table, Pagination, Badge, Avatar |
| Ficha de paciente | Card, Tabs, Timeline |
| Formulario de tratamiento | TextInput, Select, Textarea, Datepicker |
| Agenda | Datepicker, Table, Badge |
| Historial | Timeline, Card |
| Catálogo medicamentos | Table, TextInput (búsqueda), Modal |
| Panel admin pagos | Table, Modal, Badge, Button |
| Calculadora BCV | TextInput, Card (con tasa), Button |

### 8.5 Principios UX

1. **Mobile-first.** El veterinario usa la app desde el celular.  
2. **≤3 clics** para cualquier acción frecuente.  
3. **Teclado numérico grande** para PIN.  
4. **Búsqueda global** (Cmd/Ctrl+K).  
5. **Tipografía grande** y botones amplios.  
6. **Colores de estado:** verde (ok), ámbar (pendiente), rojo (crítico).  
7. **Modo oscuro** por defecto en móvil.  
8. **Confirmaciones destructivas:** borrar paciente requiere escribir su nombre.  
9. **Feedback optimista** en mutaciones.  
10. **Indicador de tasa BCV** siempre visible en el dashboard.

---

## 9\. 📋 Plan de Implementación por Sprints

| Sprint | Semana | Entregable | Criterios de Aceptación |
| :---- | :---- | :---- | :---- |
| 1 | 1 | Setup Next.js \+ Firebase \+ Netlify \+ Flowbite. Auth base con PIN | Registro y login funcionando end-to-end |
| 2 | 2 | CRUD pacientes \+ ficha | Crear, editar, listar, eliminar pacientes |
| 3 | 3 | CRUD citas \+ vista agenda | Agendar, marcar completada, ver semana |
| 4 | 4 | CRUD tratamientos \+ catálogo global (lectura) | Crear tratamiento con medicamentos |
| 5 | 5 | Vademécum: precargar 100 medicamentos | Búsqueda por prefijo funciona |
| 6 | 6 | Módulo tasas BCV \+ precios en Bs. | Precio calculado con tasa DolarAPI |
| 7 | 7 | Flujo de pago \+ notif. Telegram \+ panel admin | Admin aprueba → usuario premium |
| 8 | 8 | Reglas de seguridad \+ tests de reglas | 100% reglas pasan tests |
| 9 | 9 | Historial cronológico \+ búsqueda global | Cmd+K funciona |
| 10 | 10 | PWA \+ caché IndexedDB \+ offline | App instalable, funciona offline |
| 11 | 11 | Premium: meds personalizados \+ calculadora dosis | Dosis calculada por peso |
| 12 | 12 | Recetas PDF \+ exportación \+ reportes | PDF generado client-side |

---

## 10\. ✅ Checklist de Calidad

**Seguridad**

- [ ] PIN hasheado con bcrypt (rounds ≥ 10\)  
- [ ] Rate limiting por usuario (5 intentos → 15 min)  
- [ ] Custom Claims para roles (free, premium, admin)  
- [ ] Service Account solo en variables de entorno de Netlify  
- [ ] Reglas de Firestore bloquean campos sensibles (pinHash, role, paymentStatus)  
- [ ] CORS restrictivo (solo dominio propio)  
- [ ] Validación con Zod en cliente y servidor  
- [ ] HTTPS (Netlify por defecto)  
- [ ] No loggear PIN ni tokens

**Performance**

- [ ] Caché IndexedDB de vademécum (1 lectura inicial)  
- [ ] Caché Firestore de tasa BCV (1 lectura/día)  
- [ ] onSnapshot solo en dashboard y agenda  
- [ ] Paginación con limit(20)  
- [ ] Debounce 400 ms en búsquedas  
- [ ] Imágenes optimizadas con Cloudinary (f\_auto,q\_auto)  
- [ ] Next.js Image component

**UX**

- [ ] Login con teclado numérico 6 dígitos  
- [ ] Modo oscuro en móvil  
- [ ] Estados vacíos con CTA  
- [ ] Feedback optimista en mutaciones  
- [ ] Accesibilidad (aria-labels, contraste AA)

**Testing**

- [ ] Unit tests de validaciones Zod  
- [ ] Tests de reglas de Firestore (100% cobertura)  
- [ ] E2E: registro → login → paciente → tratamiento  
- [ ] Lighthouse score \> 90 en Performance y Accessibility

---

## 11\. ⚠️ Restricciones y Reglas Críticas

**Firebase Spark (obligatorio respetar)**

* 50,000 lecturas/día  
* 20,000 escrituras/día  
* Sin Cloud Functions → usar Netlify Functions  
* Sin Firebase Storage → usar Cloudinary  
* Sin scheduled functions → usar cron-job.org para expiración premium

**Netlify Free**

* 300 créditos/mes (deploys: 15, bandwidth: 20/GB, functions: 10/GB-hora)  
* Alerta: si se agotan, todos los proyectos se pausan  
* Optimizar: agrupar deploys, cachear en CDN, mantener functions pequeñas

**Reglas de Negocio**

* Premium: 30 días desde aprobación  
* Verificación perezosa: al hacer login, si `premiumUntil < now` → degradar a free  
* Expiración proactiva: cron externo diario a `/api/cron/expire-premium`  
* Reembolsos: solo manual desde panel admin

---

## 12\. 📌 Decisiones Pendientes (defaults sugeridos)

| Decisión | Default propuesto |
| :---- | :---- |
| Precio Premium | \$12 USD/mes |
| Plan anual | \$120 USD/año (2 meses gratis) |
| Límite free | 30 pacientes |
| Verificación email | Recomendado: requerida en registro |
| Backups | Script semanal a Google Drive vía cron externo |
| Chat interno | No en MVP |
| App nativa | No; PWA es suficiente |

---

## 13\. 🚀 Prompt Sugerido para Iniciar el Desarrollo

**Prompt para Claude Opus / Antigravity:**

> "Vas a construir VetSaaS, un SaaS para veterinarios particulares en Venezuela. Usa el Documento Maestro adjunto como fuente única de verdad. Sigue el plan de sprints en orden secuencial, comenzando por el Sprint 1\.  
>   
> **Reglas no negociables:**  
> 

> 1. Respeta los límites del plan Spark de Firebase (50k lecturas/día, 20k escrituras/día). Usa caché siempre que puedas.  
> 2. Nunca expongas pinHash, role ni paymentStatus al cliente.  
> 3. Toda mutación sensible (auth, pagos, custom claims) se hace en Netlify Functions.  
> 4. UI en español (Venezuela), con Flowbite React y colores veterinarios (azul \#1E3A5F, verde \#10B981, ámbar \#F59E0B).  
> 5. Mobile-first. El veterinario usa la app desde el celular.  
> 6. El bot de Telegram solo notifica. La aprobación/rechazo de pagos se hace exclusivamente en el panel admin web.  
> 7. Los precios se calculan con la tasa del BCV obtenida de DolarAPI ([https\://ve.dolarapi.com/v1/cotizaciones](https://ve.dolarapi.com/v1/cotizaciones)) y siempre se guarda trazabilidad (monto USD, monto Bs., tasa usada, fecha, fuente).  
> 8. TypeScript estricto, validaciones con Zod, testing con Vitest \+ Playwright.

>   
> Al finalizar cada sprint, entrega:  
> 

> - Código funcional y testeado  
> - Comandos para ejecutar localmente  
> - Lista de variables de entorno necesarias  
> - Notas de cualquier decisión técnica tomada"

---

## 14\. 📎 Apéndices

### 14.1 Estructura del `package.json`

{

  "name": "vetsaas",

  "version": "0.1.0",

  "private": true,

  "scripts": {

    "dev": "next dev",

    "build": "next build",

    "start": "next start",

    "lint": "next lint",

    "test": "vitest",

    "test:e2e": "playwright test",

    "firebase:emulators": "firebase emulators:start",

    "deploy": "netlify deploy \--prod"

  },

  "dependencies": {

    "next": "^14.2.0",

    "react": "^18.3.0",

    "react-dom": "^18.3.0",

    "firebase": "^10.12.0",

    "firebase-admin": "^12.0.0",

    "flowbite": "^2.4.0",

    "flowbite-react": "^0.10.0",

    "tailwindcss": "^3.4.0",

    "zustand": "^4.5.0",

    "@tanstack/react-query": "^5.40.0",

    "react-hook-form": "^7.51.0",

    "zod": "^3.23.0",

    "bcryptjs": "^2.4.3",

    "swr": "^2.2.5",

    "@react-pdf/renderer": "^3.4.0",

    "idb-keyval": "^6.2.1",

    "date-fns": "^3.6.0"

  },

  "devDependencies": {

    "@netlify/functions": "^2.7.0",

    "@types/node": "^20.12.0",

    "@types/react": "^18.3.0",

    "@types/bcryptjs": "^2.4.6",

    "typescript": "^5.4.0",

    "vitest": "^1.6.0",

    "@playwright/test": "^1.44.0",

    "@firebase/rules-unit-testing": "^3.0.0",

    "eslint": "^8.57.0",

    "eslint-config-next": "^14.2.0"

  }

}

### 14.2 `netlify.toml`

\[build\]

  command \= "next build"

  publish \= ".next"

  functions \= "netlify/functions"

\[build.environment\]

  NODE\_VERSION \= "20"

\[\[redirects\]\]

  from \= "/api/\*"

  to \= "/.netlify/functions/:splat"

  status \= 200

\[\[headers\]\]

  for \= "/\*"

  \[headers.values\]

    X-Frame-Options \= "DENY"

    X-Content-Type-Options \= "nosniff"

    Referrer-Policy \= "strict-origin-when-cross-origin"

    Permissions-Policy \= "camera=(), microphone=(), geolocation=(self)"

### 14.3 Glosario

| Término | Significado |
| :---- | :---- |
| **BCV** | Banco Central de Venezuela |
| **IGTF** | Impuesto a las Grandes Transacciones Financieras (3% en divisas) |
| **PIN** | Personal Identification Number (6 dígitos) |
| **Vademécum** | Catálogo de medicamentos con información clínica |
| **Custom Claims** | Atributos añadidos al token de Firebase Auth |
| **Spark** | Plan gratuito de Firebase |
| **PWA** | Progressive Web App |

