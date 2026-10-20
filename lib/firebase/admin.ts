// Re-export desde el módulo compartido de Netlify Functions.
// Este archivo existe para mantener coherencia en imports.
// Solo se usa en contexto de servidor (Netlify Functions).
export { initAdmin } from '../../netlify/functions/_shared/admin';
