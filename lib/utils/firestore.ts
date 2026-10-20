import { Timestamp } from 'firebase/firestore';

/**
 * Limpia recursivamente objetos y arreglos para Firestore,
 * eliminando claves con valor undefined que provocan el error:
 * "Unsupported field value: undefined"
 */
export function cleanFirestoreData<T = any>(val: T): T {
  if (val === undefined) {
    return undefined as unknown as T;
  }

  if (val === null) {
    return null as unknown as T;
  }

  // Si es un arreglo, limpiar recursivamente cada elemento
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }

  // Preservar Date, Timestamp y FieldValues de Firestore (serverTimestamp, deleteField, etc.)
  if (
    typeof val === 'object' &&
    Object.prototype.toString.call(val) === '[object Object]' &&
    !(val instanceof Date) &&
    !(val instanceof Timestamp) &&
    !('toMillis' in (val as any)) &&
    !('_methodName' in (val as any)) &&
    !('_delegate' in (val as any))
  ) {
    const cleaned: Record<string, any> = {};
    for (const [key, propVal] of Object.entries(val as Record<string, any>)) {
      if (propVal !== undefined) {
        cleaned[key] = cleanFirestoreData(propVal);
      }
    }
    return cleaned as T;
  }

  return val;
}
