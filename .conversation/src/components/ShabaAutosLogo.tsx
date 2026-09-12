import React from 'react';

interface ShabaAutosLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  showDivider?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ShabaAutosLogo: React.FC<ShabaAutosLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const heightClass =
    size === 'sm'
      ? 'h-10 sm:h-11'
      : size === 'lg'
      ? 'h-16 sm:h-[4.5rem]'
      : 'h-12 sm:h-14';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src="/assets/shabaautos-logo-new.png"
        alt="ShabaAutos - Your Car. Your Choice."
        className={`${heightClass} w-auto object-contain block max-w-[12rem] sm:max-w-[15rem]`}
        loading="eager"
      />
    </div>
  );
};
