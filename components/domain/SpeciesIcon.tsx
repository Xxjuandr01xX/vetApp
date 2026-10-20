import React from 'react';
import { Species } from '@/lib/types/pet';

interface SpeciesIconProps {
  species: Species;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SPECIES_CONFIG: Record<Species, { emoji: string; bg: string; text: string; label: string }> = {
  Canino: { emoji: '🐶', bg: 'bg-blue-100', text: 'text-blue-800', label: 'Canino' },
  Felino: { emoji: '🐱', bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Felino' },
  Equino: { emoji: '🐴', bg: 'bg-amber-100', text: 'text-amber-800', label: 'Equino' },
  Ave: { emoji: '🦜', bg: 'bg-teal-100', text: 'text-teal-800', label: 'Ave' },
  Exótico: { emoji: '🦎', bg: 'bg-purple-100', text: 'text-purple-800', label: 'Exótico' },
  Otro: { emoji: '🐾', bg: 'bg-gray-100', text: 'text-gray-800', label: 'Otro' },
};

export function SpeciesIcon({ species, size = 'md', className = '' }: SpeciesIconProps) {
  const config = SPECIES_CONFIG[species] || SPECIES_CONFIG.Otro;

  const sizeClasses = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
    xl: 'w-20 h-20 text-4xl',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center select-none shadow-sm ${config.bg} ${sizeClasses} ${className}`}
      title={config.label}
    >
      <span>{config.emoji}</span>
    </div>
  );
}

export function SpeciesBadge({ species }: { species: Species }) {
  const config = SPECIES_CONFIG[species] || SPECIES_CONFIG.Otro;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span>{config.emoji}</span>
      <span>{species}</span>
    </span>
  );
}
