import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  CACHE_KEYS,
  serializeForCache,
  deserializeFromCache,
  setCacheItem,
  getCacheItem,
  removeCacheItem,
  clearOfflineCache,
} from '../lib/utils/offline-cache';

describe('PWA, Service Worker & IndexedDB Offline Cache Suite (Sprint 10)', () => {
  beforeEach(async () => {
    await clearOfflineCache();
  });

  describe('1. PWA Manifest & Icons Validation', () => {
    it('public/manifest.json es válido y cumple con los requisitos de instalación PWA', () => {
      const manifestPath = path.resolve(process.cwd(), 'public/manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.short_name).toBe('VetApp');
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBe('/dashboard');
      expect(manifest.theme_color).toBe('#1E3A5F');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      const sizes = manifest.icons.map((i: any) => i.sizes);
      expect(sizes).toContain('192x192');
      expect(sizes).toContain('512x512');
    });

    it('los iconos PNG (192x192 y 512x512) y SVG existen físicamente y tienen cabeceras válidas', () => {
      const icon192Path = path.resolve(process.cwd(), 'public/icons/icon-192.png');
      const icon512Path = path.resolve(process.cwd(), 'public/icons/icon-512.png');
      const iconSvgPath = path.resolve(process.cwd(), 'public/icons/icon.svg');

      expect(fs.existsSync(icon192Path)).toBe(true);
      expect(fs.existsSync(icon512Path)).toBe(true);
      expect(fs.existsSync(iconSvgPath)).toBe(true);

      const buf192 = fs.readFileSync(icon192Path);
      expect(buf192[0]).toBe(137);
      expect(buf192[1]).toBe(80); // 'P'
      expect(buf192[2]).toBe(78); // 'N'
      expect(buf192[3]).toBe(71); // 'G'
      expect(buf192.readUInt32BE(16)).toBe(192);
      expect(buf192.readUInt32BE(20)).toBe(192);

      const buf512 = fs.readFileSync(icon512Path);
      expect(buf512.readUInt32BE(16)).toBe(512);
      expect(buf512.readUInt32BE(20)).toBe(512);
    });

    it('public/sw.js existe e implementa estrategias de caché y fallback /offline', () => {
      const swPath = path.resolve(process.cwd(), 'public/sw.js');
      expect(fs.existsSync(swPath)).toBe(true);

      const swContent = fs.readFileSync(swPath, 'utf-8');
      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain("addEventListener('fetch'");
      expect(swContent).toContain('/offline');
      expect(swContent).toContain('vetsaas-shell-v1');
    });
  });

  describe('2. Serialización de Date y Firestore Timestamp para IndexedDB', () => {
    it('serializa y restaura instancias Date conservando compatibilidad con Timestamp (.toDate y .toMillis)', () => {
      const originalDate = new Date('2026-10-15T14:30:00.000Z');
      const fakeFirestoreTimestamp = {
        seconds: 1792074600,
        nanoseconds: 0,
        toMillis: () => 1792074600000,
      };

      const payload = {
        name: 'Rocky',
        birthDate: originalDate,
        updatedAt: fakeFirestoreTimestamp,
      };

      const serialized = serializeForCache(payload);
      expect(serialized.birthDate.__vetTsMs).toBe(originalDate.getTime());
      expect(serialized.updatedAt.__vetTsMs).toBe(1792074600000);

      const restored = deserializeFromCache<any>(serialized);
      expect(restored.name).toBe('Rocky');
      expect(restored.birthDate instanceof Date).toBe(true);
      expect(restored.birthDate.getTime()).toBe(originalDate.getTime());
      expect(typeof restored.birthDate.toDate).toBe('function');
      expect(typeof restored.birthDate.toMillis).toBe('function');
      expect(restored.updatedAt.toMillis()).toBe(1792074600000);
      expect(restored.updatedAt.toDate().getTime()).toBe(1792074600000);
    });
  });

  describe('3. Operaciones de Caché Offline (getCacheItem, setCacheItem, TTL y Stale)', () => {
    it('almacena y recupera datos frescos con stale = false', async () => {
      const pets = [{ id: 'pet-1', name: 'Luna', species: 'Felino' }];
      await setCacheItem(CACHE_KEYS.petsByVet('vet-123'), pets, 60_000);

      const cached = await getCacheItem<typeof pets>(CACHE_KEYS.petsByVet('vet-123'));
      expect(cached).not.toBeNull();
      expect(cached?.stale).toBe(false);
      expect(cached?.data).toHaveLength(1);
      expect(cached?.data[0].name).toBe('Luna');
    });

    it('marca datos como stale = true cuando vence el TTL, permitiendo lectura en modo offline', async () => {
      const rate = { usd: 42.5, eur: 46.1, date: '2026-10-15', source: 'BCV' };
      // Guardar con TTL negativo para simular expiración inmediata
      await setCacheItem(CACHE_KEYS.bcvRate, rate, -1000);

      // Con allowExpired: false debe retornar null
      const strictResult = await getCacheItem(CACHE_KEYS.bcvRate, { allowExpired: false });
      expect(strictResult).toBeNull();

      // Con allowExpired: true (por defecto para soporte offline) debe retornar los datos con stale: true
      const offlineResult = await getCacheItem<typeof rate>(CACHE_KEYS.bcvRate, {
        allowExpired: true,
      });
      expect(offlineResult).not.toBeNull();
      expect(offlineResult?.stale).toBe(true);
      expect(offlineResult?.data.usd).toBe(42.5);
    });

    it('elimina claves individuales con removeCacheItem', async () => {
      await setCacheItem(CACHE_KEYS.petById('pet-99'), { id: 'pet-99', name: 'Max' });
      await removeCacheItem(CACHE_KEYS.petById('pet-99'));

      const res = await getCacheItem(CACHE_KEYS.petById('pet-99'));
      expect(res).toBeNull();
    });
  });
});
