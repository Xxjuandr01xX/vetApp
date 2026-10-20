/**
 * Evaluador y Simulador de Reglas de Seguridad de Cloud Firestore (Security Rules Emulator)
 * Basado en la especificación oficial de firestore.rules para VetSaaS.
 */

export interface SecurityAuthToken {
  role?: 'free' | 'premium' | 'admin';
  [key: string]: any;
}

export interface SecurityAuth {
  uid: string;
  token: SecurityAuthToken;
}

export interface SecurityRequest {
  auth: SecurityAuth | null;
  resource?: {
    data: Record<string, any>;
  };
}

export interface SecurityResource {
  data: Record<string, any>;
}

export type SecurityOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

export class FirestoreSecurityRulesEvaluator {
  private isAuth(request: SecurityRequest): boolean {
    return request.auth !== null && typeof request.auth.uid === 'string' && request.auth.uid.length > 0;
  }

  private isAdmin(request: SecurityRequest): boolean {
    return this.isAuth(request) && request.auth?.token?.role === 'admin';
  }

  private isPremium(request: SecurityRequest): boolean {
    if (!this.isAuth(request)) return false;
    const role = request.auth?.token?.role;
    return role === 'premium' || role === 'admin';
  }

  private owns(request: SecurityRequest, uid: string): boolean {
    return this.isAuth(request) && request.auth?.uid === uid;
  }

  private getAffectedKeys(prevData: Record<string, any>, nextData: Record<string, any>): string[] {
    const keys = new Set([...Object.keys(prevData), ...Object.keys(nextData)]);
    const affected: string[] = [];
    for (const k of keys) {
      if (JSON.stringify(prevData[k]) !== JSON.stringify(nextData[k])) {
        affected.push(k);
      }
    }
    return affected;
  }

  /**
   * Evalúa si una operación en una ruta de Firestore está permitida o denegada.
   */
  evaluate(params: {
    path: string;
    operation: SecurityOperation;
    request: SecurityRequest;
    resource?: SecurityResource;
  }): boolean {
    const { path, operation, request, resource } = params;
    const segments = path.replace(/^\//, '').split('/');
    const rootCollection = segments[0];

    // 1. /users/{uid}
    if (rootCollection === 'users') {
      const uid = segments[1];
      const subCollection = segments[2];

      if (subCollection === 'notifications') {
        if (operation === 'get' || operation === 'list' || operation === 'update') {
          return this.owns(request, uid);
        }
        if (operation === 'create' || operation === 'delete') {
          return false;
        }
      }

      if (subCollection === 'audit') {
        if (operation === 'get' || operation === 'list') {
          return this.isAdmin(request);
        }
        return false;
      }

      // Colección users principal
      if (operation === 'get' || operation === 'list') {
        return this.owns(request, uid) || this.isAdmin(request);
      }

      if (operation === 'create') {
        // allow create: if false; (creación exclusivamente server-side via Firebase Admin SDK)
        return false;
      }

      if (operation === 'update') {
        if (this.isAdmin(request)) return true;
        if (!this.owns(request, uid)) return false;

        const prevData = resource?.data || {};
        const nextData = request.resource?.data || {};
        const affected = this.getAffectedKeys(prevData, nextData);
        const forbiddenKeys = ['pinHash', 'role', 'paymentStatus', 'premiumUntil', 'failedAttempts', 'lockedUntil'];

        const touchesForbidden = affected.some((k) => forbiddenKeys.includes(k));
        return !touchesForbidden;
      }

      if (operation === 'delete') {
        return this.isAdmin(request);
      }
    }

    // 2. /pets/{petId}
    if (rootCollection === 'pets') {
      if (operation === 'create') {
        return this.isAuth(request) && request.resource?.data?.vetId === request.auth?.uid;
      }
      if (operation === 'get' || operation === 'list' || operation === 'delete') {
        return this.owns(request, resource?.data?.vetId) || this.isAdmin(request);
      }
      if (operation === 'update') {
        if (this.isAdmin(request)) return true;
        const keepsOwner = request.resource?.data?.vetId === resource?.data?.vetId;
        return this.owns(request, resource?.data?.vetId) && keepsOwner;
      }
    }

    // 3. /appointments/{id}
    if (rootCollection === 'appointments') {
      if (operation === 'create') {
        return this.isAuth(request) && request.resource?.data?.vetId === request.auth?.uid;
      }
      if (operation === 'get' || operation === 'list' || operation === 'delete') {
        return this.owns(request, resource?.data?.vetId) || this.isAdmin(request);
      }
      if (operation === 'update') {
        if (this.isAdmin(request)) return true;
        const keepsOwner = request.resource?.data?.vetId === resource?.data?.vetId;
        return this.owns(request, resource?.data?.vetId) && keepsOwner;
      }
    }

    // 4. /treatments/{id}
    if (rootCollection === 'treatments') {
      if (operation === 'create') {
        return this.isAuth(request) && request.resource?.data?.vetId === request.auth?.uid;
      }
      if (operation === 'get' || operation === 'list' || operation === 'delete') {
        return this.owns(request, resource?.data?.vetId) || this.isAdmin(request);
      }
      if (operation === 'update') {
        if (this.isAdmin(request)) return true;
        const keepsOwner = request.resource?.data?.vetId === resource?.data?.vetId;
        return this.owns(request, resource?.data?.vetId) && keepsOwner;
      }
    }

    // 5. /history/{id} (Inmutable)
    if (rootCollection === 'history') {
      if (operation === 'get' || operation === 'list') {
        return this.owns(request, resource?.data?.vetId) || this.isAdmin(request);
      }
      if (operation === 'create') {
        return this.isAuth(request) && request.resource?.data?.vetId === request.auth?.uid;
      }
      if (operation === 'update' || operation === 'delete') {
        // Inmutable: allow write: if false;
        return false;
      }
    }

    // 6. /medications/{medId}
    if (rootCollection === 'medications') {
      if (operation === 'get' || operation === 'list') {
        return this.isAuth(request);
      }
      if (operation === 'create') {
        if (this.isAdmin(request)) return true;
        return (
          this.isPremium(request) &&
          request.resource?.data?.isGlobal === false &&
          request.resource?.data?.createdBy === request.auth?.uid
        );
      }
      if (operation === 'update') {
        if (this.isAdmin(request)) return true;
        return (
          this.isPremium(request) &&
          resource?.data?.isGlobal === false &&
          resource?.data?.createdBy === request.auth?.uid &&
          request.resource?.data?.isGlobal === false &&
          request.resource?.data?.createdBy === request.auth?.uid
        );
      }
      if (operation === 'delete') {
        if (this.isAdmin(request)) return true;
        return (
          this.isPremium(request) &&
          resource?.data?.isGlobal === false &&
          resource?.data?.createdBy === request.auth?.uid
        );
      }
    }

    // 7. /payment_requests/{id}
    if (rootCollection === 'payment_requests') {
      if (operation === 'get' || operation === 'list') {
        return this.isAdmin(request) || (this.isAuth(request) && resource?.data?.userId === request.auth?.uid);
      }
      if (operation === 'create') {
        return (
          this.isAuth(request) &&
          request.resource?.data?.userId === request.auth?.uid &&
          request.resource?.data?.status === 'pending'
        );
      }
      if (operation === 'update' || operation === 'delete') {
        return this.isAdmin(request);
      }
    }

    // 8. /payment_history/{id}
    if (rootCollection === 'payment_history') {
      if (operation === 'get' || operation === 'list') {
        return this.isAdmin(request) || (this.isAuth(request) && resource?.data?.userId === request.auth?.uid);
      }
      return false; // allow write: if false;
    }

    // 9. /login_attempts/{id}
    if (rootCollection === 'login_attempts') {
      return false; // allow read, write: if false;
    }

    // 10. /bcv_rates/{date}
    if (rootCollection === 'bcv_rates') {
      if (operation === 'get' || operation === 'list') {
        return this.isAuth(request);
      }
      return false; // allow write: if false;
    }

    // 11. /system/{doc}
    if (rootCollection === 'system') {
      if (operation === 'get' || operation === 'list') {
        return this.isAuth(request);
      }
      if (operation === 'create' || operation === 'update' || operation === 'delete') {
        return this.isAdmin(request);
      }
    }

    return false;
  }
}
