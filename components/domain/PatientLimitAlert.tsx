'use client';

import { Progress, Button } from 'flowbite-react';
import Link from 'next/link';
import { PLAN_LIMITS } from '@/lib/constants';

interface PatientLimitAlertProps {
  currentCount: number;
  isPremium: boolean;
}

export function PatientLimitAlert({ currentCount, isPremium }: PatientLimitAlertProps) {
  if (isPremium) return null;

  const max = PLAN_LIMITS.FREE_PATIENT_LIMIT;
  const percentage = Math.min(Math.round((currentCount / max) * 100), 100);
  const isClose = currentCount >= max - 5;
  const isAtLimit = currentCount >= max;

  return (
    <div className={`p-4 rounded-xl border mb-6 ${
      isAtLimit
        ? 'bg-red-50 border-red-200'
        : isClose
        ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              Límite de Pacientes (Plan Gratuito): {currentCount} / {max}
            </span>
            {isAtLimit && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                Límite alcanzado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isAtLimit
              ? 'Has alcanzado el máximo de 30 pacientes permitidos en la versión gratuita.'
              : `Puedes registrar ${max - currentCount} pacientes más antes de necesitar el plan Premium.`}
          </p>
        </div>

        {(isClose || isAtLimit) && (
          <Link href="/pricing">
            <Button size="xs" color="warning" className="whitespace-nowrap font-medium">
              ⭐ Mejorar a Premium
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-3">
        <Progress
          progress={percentage}
          color={isAtLimit ? 'red' : isClose ? 'yellow' : 'blue'}
          size="sm"
        />
      </div>
    </div>
  );
}
