import React from 'react';
import { Badge } from 'flowbite-react';
import { AppointmentStatus } from '@/lib/types/appointment';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: 'info' | 'success' | 'failure' | 'warning' }> = {
  scheduled: { label: 'Programada', color: 'info' },
  completed: { label: 'Completada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'failure' },
  no_show: { label: 'No asistió', color: 'warning' },
};

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  return (
    <Badge color={config.color} className="inline-flex items-center gap-1">
      {config.label}
    </Badge>
  );
}
