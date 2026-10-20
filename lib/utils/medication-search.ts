import { Medication } from '@/lib/types/medication';

/** Minúsculas y sin acentos: "Ácido" → "acido" */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Tokens de búsqueda de un medicamento (palabras individuales). */
function tokensOf(med: Medication): { names: string[]; ingredients: string[]; other: string[] } {
  const split = (arr: string[]) =>
    arr.flatMap((s) => normalizeText(s).split(/[\s\-+/(),.]+/)).filter(Boolean);
  return {
    names: split(med.commercialNames ?? []),
    ingredients: split((med.activeIngredients ?? []).map((i) => i.name)),
    other: split([...(med.searchKeywords ?? []), med.therapeuticClass ?? '']),
  };
}

/**
 * Búsqueda por prefijo: cada palabra de la consulta debe ser prefijo de alguna palabra
 * del medicamento. Resultados ordenados por relevancia
 * (nombre comercial > principio activo > palabras clave), luego alfabético.
 */
export function searchByPrefix(
  catalog: Medication[],
  query: string,
  species?: string,
  max = 50
): Medication[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);

  const bySpecies = (m: Medication) =>
    !species ||
    species === 'all' ||
    m.targetSpecies.includes(species) ||
    m.targetSpecies.includes('Otro');

  const scored: { med: Medication; score: number }[] = [];

  for (const med of catalog) {
    if (!bySpecies(med)) continue;
    if (terms.length === 0) {
      scored.push({ med, score: 0 });
      continue;
    }
    const t = tokensOf(med);
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      if (t.names.some((w) => w.startsWith(term))) score += 3;
      else if (t.ingredients.some((w) => w.startsWith(term))) score += 2;
      else if (t.other.some((w) => w.startsWith(term))) score += 1;
      else {
        allMatch = false;
        break;
      }
    }
    if (allMatch) scored.push({ med, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.med.commercialNames[0] ?? '').localeCompare(b.med.commercialNames[0] ?? '', 'es')
    )
    .slice(0, max)
    .map((s) => s.med);
}
