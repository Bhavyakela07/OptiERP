import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx}>
              <Skeleton height="16px" width={cIdx === 0 ? '70%' : '50%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default Skeleton;
