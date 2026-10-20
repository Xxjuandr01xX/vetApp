import { getPets } from '@/lib/services/pets';
import { getAppointments } from '@/lib/services/appointments';
import { getTreatments } from '@/lib/services/treatments';
import { getFullCatalog } from '@/lib/services/medications';

export interface SearchResultItem {
  id: string;
  type: 'action' | 'pet' | 'appointment' | 'treatment' | 'medication';
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  icon?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
  icon: string;
}

export const SYSTEM_ACTIONS: QuickAction[] = [
  {
    id: 'act-new-pet',
    title: 'Registrar Nuevo Paciente',
    subtitle: 'Crear ficha de mascota y datos del tutor',
    href: '/pets/new',
    keywords: ['nuevo', 'paciente', 'mascota', 'perro', 'gato', 'crear', 'registrar'],
    icon: '🐾',
  },
  {
    id: 'act-new-appointment',
    title: 'Agendar Nueva Cita',
    subtitle: 'Programar consulta o revisión médica',
    href: '/appointments/new',
    keywords: ['nueva', 'cita', 'agendar', 'calendario', 'programar', 'consulta'],
    icon: '📅',
  },
  {
    id: 'act-new-treatment',
    title: 'Registrar Nuevo Tratamiento / Récipe',
    subtitle: 'Generar diagnóstico e indicaciones farmacológicas',
    href: '/treatments/new',
    keywords: ['nuevo', 'tratamiento', 'recipe', 'receta', 'medicar', 'diagnostico'],
    icon: '🩺',
  },
  {
    id: 'act-dashboard',
    title: 'Ir al Dashboard',
    subtitle: 'Resumen clínico, agenda de hoy y métricas',
    href: '/dashboard',
    keywords: ['dashboard', 'inicio', 'home', 'resumen', 'metricas'],
    icon: '🏠',
  },
  {
    id: 'act-pets',
    title: 'Ver Lista de Pacientes',
    subtitle: 'Catálogo completo de mascotas registradas',
    href: '/pets',
    keywords: ['pacientes', 'mascotas', 'perros', 'gatos', 'lista'],
    icon: '📋',
  },
  {
    id: 'act-appointments',
    title: 'Ver Agenda de Citas',
    subtitle: 'Consultas programadas del día y semana',
    href: '/appointments',
    keywords: ['citas', 'agenda', 'calendario', 'semana'],
    icon: '🗓️',
  },
  {
    id: 'act-treatments',
    title: 'Ver Historial de Tratamientos',
    subtitle: 'Listado de récipes y procedimientos',
    href: '/treatments',
    keywords: ['tratamientos', 'recipes', 'consultas'],
    icon: '💊',
  },
  {
    id: 'act-settings',
    title: 'Ajustes y Perfil',
    subtitle: 'Configuración de cuenta, seguridad y tasas',
    href: '/settings',
    keywords: ['ajustes', 'configuracion', 'perfil', 'pin', 'bcv'],
    icon: '⚙️',
  },
  {
    id: 'act-medications',
    title: 'Vademécum y Calculadora de Dosis',
    subtitle: 'Catálogo de fármacos, cálculo de dosis por peso y personalizados',
    href: '/medications',
    keywords: ['vademecum', 'medicamentos', 'farmacos', 'calculadora', 'dosis', 'peso', 'personalizados'],
    icon: '⚖️',
  },
  {
    id: 'act-reports',
    title: 'Reportes y Métricas Clínicas',
    subtitle: 'Estadísticas de pacientes, asistencia y exportación CSV',
    href: '/reports',
    keywords: ['reportes', 'metricas', 'estadisticas', 'exportar', 'csv', 'facturacion', 'analisis'],
    icon: '📊',
  },
  {
    id: 'act-pricing',
    title: 'Planes y Suscripción Premium',
    subtitle: 'Información del plan y activación con Pago Móvil',
    href: '/pricing',
    keywords: ['premium', 'pago', 'suscripcion', 'precio', 'planes', 'bolivares'],
    icon: '💎',
  },
];

/**
 * Normaliza texto para búsqueda insensible a acentos y mayúsculas
 */
export function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Filtra acciones rápidas del sistema puramente en memoria
 */
export function filterQuickActions(rawQuery: string): SearchResultItem[] {
  const queryText = normalizeSearchText(rawQuery);
  if (!queryText || queryText.length < 2) {
    return SYSTEM_ACTIONS.slice(0, 4).map((act) => ({
      id: act.id,
      type: 'action',
      title: act.title,
      subtitle: act.subtitle,
      href: act.href,
      icon: act.icon,
      badge: 'Acción rápida',
    }));
  }

  const results: SearchResultItem[] = [];
  for (const act of SYSTEM_ACTIONS) {
    const matchTitle = normalizeSearchText(act.title).includes(queryText);
    const matchSubtitle = normalizeSearchText(act.subtitle).includes(queryText);
    const matchKeyword = act.keywords.some((k) => normalizeSearchText(k).includes(queryText));

    if (matchTitle || matchSubtitle || matchKeyword) {
      results.push({
        id: act.id,
        type: 'action',
        title: act.title,
        subtitle: act.subtitle,
        href: act.href,
        icon: act.icon,
        badge: 'Acción rápida',
      });
    }
  }
  return results;
}

/**
 * Realiza búsqueda global sobre acciones, pacientes, citas, tratamientos y vademécum.
 * Funciona tanto online como offline gracias a la capa de caché IndexedDB de cada servicio.
 */
export async function searchGlobal(
  vetId: string,
  rawQuery: string
): Promise<SearchResultItem[]> {
  const queryText = normalizeSearchText(rawQuery);
  const actionResults = filterQuickActions(rawQuery);

  if (!queryText || queryText.length < 2) {
    return actionResults;
  }

  const results: SearchResultItem[] = [...actionResults];

  try {
    const [pets, appointments, treatments, catalog] = await Promise.all([
      getPets(vetId, { limitCount: 25 }),
      getAppointments(vetId, { limitCount: 20 }),
      getTreatments(vetId, { limitCount: 20 }),
      getFullCatalog(vetId),
    ]);

    // 2. Búsqueda en Pacientes
    pets.forEach((pet) => {
      const petName = normalizeSearchText(pet.name);
      const ownerName = normalizeSearchText(pet.owner?.name || '');
      const ownerPhone = normalizeSearchText(pet.owner?.phone || '');
      const breed = normalizeSearchText(pet.breed || '');
      const species = normalizeSearchText(pet.species || '');

      if (
        petName.includes(queryText) ||
        ownerName.includes(queryText) ||
        ownerPhone.includes(queryText) ||
        breed.includes(queryText) ||
        species.includes(queryText)
      ) {
        results.push({
          id: `pet-${pet.id}`,
          type: 'pet',
          title: `${pet.name} (${pet.species})`,
          subtitle: `Tutor: ${pet.owner?.name || 'No especificado'} • ${pet.breed || 'Sin raza'}`,
          href: `/pets/${pet.id}`,
          icon: pet.species === 'Felino' ? '🐱' : pet.species === 'Canino' ? '🐶' : '🐾',
          badge: 'Paciente',
        });
      }
    });

    // 3. Búsqueda en Citas
    appointments.forEach((app) => {
      const reason = normalizeSearchText(app.reason || '');
      const petName = normalizeSearchText(app.petName || '');
      const notes = normalizeSearchText(app.notes || '');

      if (reason.includes(queryText) || petName.includes(queryText) || notes.includes(queryText)) {
        results.push({
          id: `app-${app.id}`,
          type: 'appointment',
          title: `Cita: ${app.petName || 'Paciente'} — ${app.reason}`,
          subtitle: `Duración: ${app.durationMin} min • Estado: ${app.status}`,
          href: `/appointments`,
          icon: '📅',
          badge: 'Cita',
        });
      }
    });

    // 4. Búsqueda en Tratamientos
    treatments.forEach((trt) => {
      const diagnosis = normalizeSearchText(trt.diagnosis || '');
      const petName = normalizeSearchText(trt.petName || '');
      const hasMed = (trt.medications || []).some((m) =>
        normalizeSearchText(m.commercialName || m.activeIngredient || '').includes(queryText)
      );

      if (diagnosis.includes(queryText) || petName.includes(queryText) || hasMed) {
        results.push({
          id: `trt-${trt.id}`,
          type: 'treatment',
          title: `Tratamiento: ${trt.petName || 'Paciente'} — ${trt.diagnosis}`,
          subtitle: `Fármacos: ${trt.medications?.length || 0} recetados`,
          href: `/pets/${trt.petId}`,
          icon: '🩺',
          badge: 'Tratamiento',
        });
      }
    });

    // 5. Búsqueda en Vademécum (100+ medicamentos locales + remotos cacheados en IndexedDB)
    let medMatches = 0;
    for (const med of catalog) {
      if (medMatches >= 12) break;
      const commNames = (med.commercialNames || []).map(normalizeSearchText);
      const activeIngs = (med.activeIngredients || []).map((a) => normalizeSearchText(a.name));
      const indications = (med.indications || []).map(normalizeSearchText);

      const matchesComm = commNames.some((c) => c.includes(queryText));
      const matchesIng = activeIngs.some((a) => a.includes(queryText));
      const matchesInd = indications.some((i) => i.includes(queryText));

      if (matchesComm || matchesIng || matchesInd) {
        medMatches++;
        const primaryName = med.commercialNames?.[0] || 'Medicamento';
        const primaryIng = med.activeIngredients?.map((a) => a.name).join(', ') || '';
        const pres = med.presentations?.[0]?.form || '';

        results.push({
          id: `med-${med.id}`,
          type: 'medication',
          title: `${primaryName}${primaryIng ? ` (${primaryIng})` : ''}`,
          subtitle: `${pres ? `${pres} • ` : ''}${med.targetSpecies?.join(', ') || 'Varias especies'}`,
          href: `/treatments/new?medId=${med.id}`,
          icon: '💊',
          badge: 'Vademécum',
        });
      }
    }
  } catch (err) {
    console.error('Error durante la búsqueda global:', err);
  }

  return results;
}
