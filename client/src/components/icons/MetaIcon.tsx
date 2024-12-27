import React from 'react';

interface MetaIconProps {
  className?: string;
}

export const MetaIcon: React.FC<MetaIconProps> = ({ className = "h-4 w-4" }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36.92 16.77c-1.58-4.88-5.36-8.51-10.42-9.91c-2.96-.82-6.1-.9-9.13-.23c-3.04.67-5.84 2.13-8.06 4.21c-2.22 2.08-3.82 4.71-4.58 7.61c-.76 2.9-.64 5.95.35 8.79c1.58 4.88 5.36 8.51 10.42 9.91c2.96.82 6.1.9 9.13.23c3.04-.67 5.84-2.13 8.06-4.21c2.22-2.08 3.82-4.71 4.58-7.61c.76-2.9.64-5.95-.35-8.79z"
        fill="currentColor"
      />
      <path
        d="M19.37 24.9c-.77.19-1.57.19-2.34 0c-1.75-.43-3.07-1.79-3.46-3.56c-.39-1.77.21-3.61 1.57-4.82c1.36-1.21 3.29-1.59 5.04-1.16c1.75.43 3.07 1.79 3.46 3.56c.39 1.77-.21 3.61-1.57 4.82c-.77.68-1.69 1.08-2.7 1.16z"
        fill="white"
      />
    </svg>
  );
};

export default MetaIcon;
