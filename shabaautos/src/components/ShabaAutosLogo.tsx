import React from 'react';

interface ShabaAutosLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  showDivider?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_STYLES = {
  sm: {
    mark: 'h-9 w-9 sm:h-10 sm:w-10',
    name: 'text-[1.05rem] sm:text-[1.15rem]',
    tagline: 'text-[0.5rem] sm:text-[0.55rem]',
  },
  md: {
    mark: 'h-11 w-11 sm:h-12 sm:w-12',
    name: 'text-xl sm:text-[1.35rem]',
    tagline: 'text-[0.55rem] sm:text-[0.6rem]',
  },
  lg: {
    mark: 'h-14 w-14 sm:h-16 sm:w-16',
    name: 'text-2xl sm:text-[1.7rem]',
    tagline: 'text-[0.6rem] sm:text-[0.65rem]',
  },
} as const;

export const ShabaAutosLogo: React.FC<ShabaAutosLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
}) => {
  const dims = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <div
      className={`shaba-logo inline-flex select-none items-center gap-2.5 ${
        variant === 'dark' ? 'shaba-logo--on-dark' : ''
      } ${className}`}
    >
      <img
        src="/assets/shabaautos-mark.png"
        alt=""
        aria-hidden="true"
        width={64}
        height={64}
        loading="eager"
        className={`shaba-logo-mark ${dims.mark} shrink-0 rounded-full object-contain`}
      />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`shaba-logo-name ${dims.name} font-black tracking-tight`}>
          Shaba<span className="shaba-logo-accent">Autos</span>
        </span>
        <span className={`shaba-logo-tagline mt-1 ${dims.tagline} font-semibold uppercase tracking-[0.15em]`}>
          Drive a better tomorrow
        </span>
      </span>
    </div>
  );
};