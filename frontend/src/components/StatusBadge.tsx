import React from 'react';

export type StatusType = 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  status?: StatusType | string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'info',
  label,
  icon,
  className = '',
}) => {
  // Normalize string status into canonical StatusType
  let normalizedStatus: StatusType = 'info';
  const lower = status.toLowerCase();

  if (['success', 'active', 'confirmed', 'in stock', 'delivered', 'in'].includes(lower)) {
    normalizedStatus = 'success';
  } else if (['warning', 'lead', 'draft', 'pending', 'low stock', 'out'].includes(lower)) {
    normalizedStatus = 'warning';
  } else if (['danger', 'inactive', 'cancelled', 'out of stock', 'overdue', 'low', 'suspended'].includes(lower)) {
    normalizedStatus = 'danger';
  } else if (['info', 'distributor', 'wholesale', 'retail', 'in-transit', 'processing'].includes(lower)) {
    normalizedStatus = 'info';
  }

  return (
    <span className={`status-badge status-badge-${normalizedStatus} ${className}`}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
