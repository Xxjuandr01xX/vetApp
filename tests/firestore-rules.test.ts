import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  FirestoreSecurityRulesEvaluator,
  SecurityRequest,
} from '../lib/security/firestore-rules-evaluator';

describe('Firestore Security Rules Suite (Sprint 8)', () => {
  const evaluator = new FirestoreSecurityRulesEvaluator();

  const anonReq: SecurityRequest = { auth: null };

  const vetUserReq: SecurityRequest = {
    auth: {
      uid: 'vet-user-123',
      token: { role: 'free' },
    },
  };

  const otherVetReq: SecurityRequest = {
    auth: {
      uid: 'vet-intruder-456',
      token: { role: 'free' },
    },
  };

  const premiumVetReq: SecurityRequest = {
    auth: {
      uid: 'vet-premium-789',
      token: { role: 'premium' },
    },
  };

  const adminReq: SecurityRequest = {
    auth: {
      uid: 'super-admin-001',
      token: { role: 'admin' },
    },
  };

  describe('1. Estructura e Integridad de firestore.rules', () => {
    it('el archivo firestore.rules existe y utiliza la versión 2', () => {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      expect(fs.existsSync(rulesPath)).toBe(true);

      const content = fs.readFileSync(rulesPath, 'utf-8');
      expect(content).toContain("rules_version = '2';");
      expect(content).toContain('service cloud.firestore');
    });

    it('contiene reglas para todas las 11 colecciones requeridas en la especificación', () => {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const content = fs.readFileSync(rulesPath, 'utf-8');

      const expectedCollections = [
        'match /users/{uid}',
        'match /notifications/{nid}',
        'match /audit/{lid}',
        'match /pets/{petId}',
        'match /appointments/{id}',
        'match /treatments/{id}',
        'match /history/{id}',
        'match /medications/{medId}',
        'match /payment_requests/{id}',
        'match /payment_history/{id}',
        'match /login_attempts/{id}',
        'match /bcv_rates/{date}',
        'match /system/{doc}',
      ];

      for (const col of expectedCollections) {
        expect(content).toContain(col);
      }
    });

    it('todas las llaves { } están balanceadas sintácticamente', () => {
      const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
      const content = fs.readFileSync(rulesPath, 'utf-8');

      let openCount = 0;
      let closeCount = 0;
      for (const char of content) {
        if (char === '{') openCount++;
        if (char === '}') closeCount++;
      }

      expect(openCount).toBe(closeCount);
      expect(openCount).toBeGreaterThan(5);
    });
  });

  describe('2. Colección /users/{uid}', () => {
    it('permite que un veterinario lea su propio perfil', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'get',
        request: vetUserReq,
      });
      expect(allowed).toBe(true);
    });

    it('deniega que un veterinario lea el perfil de otro usuario', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'get',
        request: otherVetReq,
      });
      expect(allowed).toBe(false);
    });

    it('permite al admin leer cualquier perfil de usuario', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'get',
        request: adminReq,
      });
      expect(allowed).toBe(true);
    });

    it('bloquea la creación directa de usuarios desde el cliente (solo Admin SDK)', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'create',
        request: {
          ...vetUserReq,
          resource: { data: { email: 'test@vetsaas.com' } },
        },
      });
      expect(allowed).toBe(false);
    });

    it('permite al dueño actualizar campos no sensibles (ej. displayName, phone)', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'update',
        request: {
          ...vetUserReq,
          resource: {
            data: {
              email: 'vet@vetsaas.com',
              displayName: 'Dr. Alejandro Pérez',
              phone: '04141234567',
            },
          },
        },
        resource: {
          data: {
            email: 'vet@vetsaas.com',
            displayName: 'Alejandro',
            phone: '04140000000',
          },
        },
      });
      expect(allowed).toBe(true);
    });

    it('bloquea al dueño si intenta modificar campos sensibles protegidos (pinHash, role, etc.)', () => {
      const sensitiveFields = [
        'pinHash',
        'role',
        'paymentStatus',
        'premiumUntil',
        'failedAttempts',
        'lockedUntil',
      ];

      for (const field of sensitiveFields) {
        const allowed = evaluator.evaluate({
          path: '/users/vet-user-123',
          operation: 'update',
          request: {
            ...vetUserReq,
            resource: {
              data: {
                displayName: 'Nuevo',
                [field]: 'hack-value',
              },
            },
          },
          resource: {
            data: {
              displayName: 'Viejo',
              [field]: 'original-value',
            },
          },
        });
        expect(allowed).toBe(false);
      }
    });

    it('permite al admin actualizar cualquier campo de usuario (incluyendo roles y pagos)', () => {
      const allowed = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'update',
        request: {
          ...adminReq,
          resource: {
            data: {
              role: 'premium',
              paymentStatus: 'approved',
            },
          },
        },
        resource: {
          data: {
            role: 'free',
            paymentStatus: 'pending',
          },
        },
      });
      expect(allowed).toBe(true);
    });

    it('bloquea la eliminación de usuarios por el propio usuario, pero permite al admin', () => {
      const userDelete = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'delete',
        request: vetUserReq,
      });
      expect(userDelete).toBe(false);

      const adminDelete = evaluator.evaluate({
        path: '/users/vet-user-123',
        operation: 'delete',
        request: adminReq,
      });
      expect(adminDelete).toBe(true);
    });

    it('subcolección audit: solo admin puede leer y nadie puede escribir desde el cliente', () => {
      expect(
        evaluator.evaluate({
          path: '/users/vet-user-123/audit/log-1',
          operation: 'get',
          request: adminReq,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/users/vet-user-123/audit/log-1',
          operation: 'get',
          request: vetUserReq,
        })
      ).toBe(false);

      expect(
        evaluator.evaluate({
          path: '/users/vet-user-123/audit/log-1',
          operation: 'create',
          request: adminReq,
        })
      ).toBe(false);
    });
  });

  describe('3. Colección /pets/{petId}', () => {
    const petResource = {
      data: {
        id: 'pet-1',
        vetId: 'vet-user-123',
        name: 'Firulais',
      },
    };

    it('permite crear mascota si vetId coincide con request.auth.uid', () => {
      const allowed = evaluator.evaluate({
        path: '/pets/pet-1',
        operation: 'create',
        request: {
          ...vetUserReq,
          resource: { data: { vetId: 'vet-user-123', name: 'Firulais' } },
        },
      });
      expect(allowed).toBe(true);
    });

    it('deniega crear mascota si vetId no coincide con el usuario autenticado', () => {
      const allowed = evaluator.evaluate({
        path: '/pets/pet-1',
        operation: 'create',
        request: {
          ...otherVetReq,
          resource: { data: { vetId: 'vet-user-123', name: 'Firulais' } },
        },
      });
      expect(allowed).toBe(false);
    });

    it('permite al dueño y admin leer la mascota, pero deniega a otro veterinario o anónimo', () => {
      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'get',
          request: vetUserReq,
          resource: petResource,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'get',
          request: adminReq,
          resource: petResource,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'get',
          request: otherVetReq,
          resource: petResource,
        })
      ).toBe(false);

      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'get',
          request: anonReq,
          resource: petResource,
        })
      ).toBe(false);
    });

    it('permite al dueño actualizar la mascota manteniendo su vetId', () => {
      const allowed = evaluator.evaluate({
        path: '/pets/pet-1',
        operation: 'update',
        request: {
          ...vetUserReq,
          resource: { data: { vetId: 'vet-user-123', name: 'Firulais Actualizado' } },
        },
        resource: petResource,
      });
      expect(allowed).toBe(true);
    });

    it('deniega la actualización si se intenta reasignar vetId a otro veterinario', () => {
      const allowed = evaluator.evaluate({
        path: '/pets/pet-1',
        operation: 'update',
        request: {
          ...vetUserReq,
          resource: { data: { vetId: 'vet-intruder-456', name: 'Firulais Robado' } },
        },
        resource: petResource,
      });
      expect(allowed).toBe(false);
    });

    it('permite al dueño eliminar su mascota y deniega a intrusos', () => {
      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'delete',
          request: vetUserReq,
          resource: petResource,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/pets/pet-1',
          operation: 'delete',
          request: otherVetReq,
          resource: petResource,
        })
      ).toBe(false);
    });
  });

  describe('4. Colecciones Clínicas: /appointments/{id} y /treatments/{id}', () => {
    const appointmentResource = {
      data: { id: 'app-1', vetId: 'vet-user-123', reason: 'Vacuna' },
    };
    const treatmentResource = {
      data: { id: 'trt-1', vetId: 'vet-user-123', diagnosis: 'Gastroenteritis' },
    };

    it('appointments: solo el dueño o admin puede leer, crear y actualizar', () => {
      // Create propio
      expect(
        evaluator.evaluate({
          path: '/appointments/app-1',
          operation: 'create',
          request: {
            ...vetUserReq,
            resource: { data: { vetId: 'vet-user-123', reason: 'Consulta' } },
          },
        })
      ).toBe(true);

      // Create ajeno
      expect(
        evaluator.evaluate({
          path: '/appointments/app-1',
          operation: 'create',
          request: {
            ...otherVetReq,
            resource: { data: { vetId: 'vet-user-123', reason: 'Consulta' } },
          },
        })
      ).toBe(false);

      // Read ajeno
      expect(
        evaluator.evaluate({
          path: '/appointments/app-1',
          operation: 'get',
          request: otherVetReq,
          resource: appointmentResource,
        })
      ).toBe(false);
    });

    it('treatments: protegido estrictamente por vetId', () => {
      expect(
        evaluator.evaluate({
          path: '/treatments/trt-1',
          operation: 'get',
          request: vetUserReq,
          resource: treatmentResource,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/treatments/trt-1',
          operation: 'get',
          request: otherVetReq,
          resource: treatmentResource,
        })
      ).toBe(false);
    });
  });

  describe('5. Colección Inmutable: /history/{id}', () => {
    const historyResource = {
      data: { id: 'hist-1', vetId: 'vet-user-123', summary: 'Vacuna aplicada' },
    };

    it('permite registrar eventos al veterinario autenticado', () => {
      expect(
        evaluator.evaluate({
          path: '/history/hist-1',
          operation: 'create',
          request: {
            ...vetUserReq,
            resource: { data: { vetId: 'vet-user-123', summary: 'Cita' } },
          },
        })
      ).toBe(true);
    });

    it('deniega categóricamente cualquier intento de modificar o borrar historial (Inmutabilidad clínica)', () => {
      expect(
        evaluator.evaluate({
          path: '/history/hist-1',
          operation: 'update',
          request: vetUserReq,
          resource: historyResource,
        })
      ).toBe(false);

      expect(
        evaluator.evaluate({
          path: '/history/hist-1',
          operation: 'delete',
          request: vetUserReq,
          resource: historyResource,
        })
      ).toBe(false);

      expect(
        evaluator.evaluate({
          path: '/history/hist-1',
          operation: 'update',
          request: adminReq,
          resource: historyResource,
        })
      ).toBe(false);
    });
  });

  describe('6. Colección /medications/{medId} (Vademécum)', () => {
    const globalMedResource = {
      data: { id: 'med-global', isGlobal: true, commercialName: 'Amoxicilina' },
    };

    const privateMedResource = {
      data: {
        id: 'med-priv',
        isGlobal: false,
        createdBy: 'vet-premium-789',
        commercialName: 'Mi Fármaco Compuesto',
      },
    };

    it('permite lectura a cualquier veterinario autenticado (free o premium)', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-global',
          operation: 'get',
          request: vetUserReq,
          resource: globalMedResource,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/medications/med-global',
          operation: 'get',
          request: premiumVetReq,
          resource: globalMedResource,
        })
      ).toBe(true);
    });

    it('deniega lectura a usuarios anónimos no autenticados', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-global',
          operation: 'get',
          request: anonReq,
          resource: globalMedResource,
        })
      ).toBe(false);
    });

    it('solo el admin puede crear o modificar medicamentos globales', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-global',
          operation: 'create',
          request: {
            ...adminReq,
            resource: { data: { isGlobal: true, commercialName: 'Nuevo Global' } },
          },
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/medications/med-global',
          operation: 'create',
          request: {
            ...premiumVetReq,
            resource: { data: { isGlobal: true, commercialName: 'Intento Global' } },
          },
        })
      ).toBe(false);
    });

    it('un usuario premium puede crear sus propios medicamentos privados', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-priv',
          operation: 'create',
          request: {
            ...premiumVetReq,
            resource: {
              data: {
                isGlobal: false,
                createdBy: 'vet-premium-789',
                commercialName: 'Mi Fórmula',
              },
            },
          },
        })
      ).toBe(true);
    });

    it('un usuario free NO puede crear medicamentos propios', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-priv',
          operation: 'create',
          request: {
            ...vetUserReq,
            resource: {
              data: {
                isGlobal: false,
                createdBy: 'vet-user-123',
                commercialName: 'Mi Fórmula Free',
              },
            },
          },
        })
      ).toBe(false);
    });

    it('un usuario premium no puede modificar medicamentos creados por otro veterinario', () => {
      expect(
        evaluator.evaluate({
          path: '/medications/med-priv',
          operation: 'update',
          request: {
            ...otherVetReq, // otro usuario
            resource: {
              data: {
                isGlobal: false,
                createdBy: 'vet-intruder-456',
                commercialName: 'Hack',
              },
            },
          },
          resource: privateMedResource,
        })
      ).toBe(false);
    });
  });

  describe('7. Pagos y Suscripciones: /payment_requests y /payment_history', () => {
    it('un usuario puede crear una solicitud de pago propia en estado pending', () => {
      expect(
        evaluator.evaluate({
          path: '/payment_requests/req-1',
          operation: 'create',
          request: {
            ...vetUserReq,
            resource: { data: { userId: 'vet-user-123', status: 'pending' } },
          },
        })
      ).toBe(true);
    });

    it('deniega si el usuario intenta crear una solicitud auto-aprobada (status: approved)', () => {
      expect(
        evaluator.evaluate({
          path: '/payment_requests/req-1',
          operation: 'create',
          request: {
            ...vetUserReq,
            resource: { data: { userId: 'vet-user-123', status: 'approved' } },
          },
        })
      ).toBe(false);
    });

    it('solo el admin puede aprobar/actualizar o eliminar solicitudes de pago', () => {
      expect(
        evaluator.evaluate({
          path: '/payment_requests/req-1',
          operation: 'update',
          request: adminReq,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/payment_requests/req-1',
          operation: 'update',
          request: vetUserReq,
        })
      ).toBe(false);
    });

    it('payment_history: de solo lectura para el usuario y admin, escritura bloqueada desde cliente', () => {
      expect(
        evaluator.evaluate({
          path: '/payment_history/hist-1',
          operation: 'get',
          request: vetUserReq,
          resource: { data: { userId: 'vet-user-123' } },
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/payment_history/hist-1',
          operation: 'create',
          request: vetUserReq,
        })
      ).toBe(false);
    });
  });

  describe('8. Colecciones Protegidas del Sistema: /login_attempts, /bcv_rates y /system', () => {
    it('login_attempts: bloqueado totalmente para lectura y escritura desde cliente', () => {
      expect(
        evaluator.evaluate({
          path: '/login_attempts/att-1',
          operation: 'get',
          request: adminReq,
        })
      ).toBe(false);

      expect(
        evaluator.evaluate({
          path: '/login_attempts/att-1',
          operation: 'create',
          request: vetUserReq,
        })
      ).toBe(false);
    });

    it('bcv_rates: lectura permitida para usuarios autenticados, escritura bloqueada', () => {
      expect(
        evaluator.evaluate({
          path: '/bcv_rates/2026-10-15',
          operation: 'get',
          request: vetUserReq,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/bcv_rates/2026-10-15',
          operation: 'create',
          request: vetUserReq,
        })
      ).toBe(false);
    });

    it('system: lectura para autenticados, escritura exclusiva del admin', () => {
      expect(
        evaluator.evaluate({
          path: '/system/config',
          operation: 'get',
          request: vetUserReq,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/system/config',
          operation: 'update',
          request: adminReq,
        })
      ).toBe(true);

      expect(
        evaluator.evaluate({
          path: '/system/config',
          operation: 'update',
          request: vetUserReq,
        })
      ).toBe(false);
    });
  });
});
