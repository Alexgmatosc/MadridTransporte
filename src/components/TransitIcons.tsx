import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Custom SVG inspired by the iconic Metro de Madrid rhombus emblem:
 * Red diamond frame (#E30613), white field, and horizontal blue crossbar (#1D3C87).
 */
export const MetroDiamondLogo: React.FC<IconProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 64 48"
      width={size}
      height={size ? Math.round((size * 48) / 64) : undefined}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer red diamond */}
      <path
        d="M32 3L61 24L32 45L3 24L32 3Z"
        fill="#FFFFFF"
        stroke="#E30613"
        strokeWidth="5.5"
        strokeLinejoin="miter"
      />
      {/* Blue horizontal crossbar */}
      <rect x="4" y="18.5" width="56" height="11" rx="1.5" fill="#1D3C87" />
      {/* Subtle crisp "M" / Metro bar mark */}
      <path
        d="M21 27.5V20.5H23.2L26 25.1L28.8 20.5H31V27.5H29.1V23.2L26.7 27H25.3L22.9 23.2V27.5H21Z"
        fill="#FFFFFF"
      />
      <path
        d="M33.2 27.5V20.5H38.2V22H35.1V23.2H37.8V24.6H35.1V26H38.3V27.5H33.2Z"
        fill="#FFFFFF"
      />
      <path
        d="M39.5 22V20.5H44.5V22H42.9V27.5H41V22H39.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

/**
 * Compact square/pill Metro rhombus icon for tight badges and buttons
 */
export const MetroDiamondMark: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => {
  return (
    <svg
      viewBox="0 0 40 30"
      width={size}
      height={size ? Math.round((size * 30) / 40) : undefined}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 2L38 15L20 28L2 15L20 2Z"
        fill="#FFFFFF"
        stroke="#E30613"
        strokeWidth="3.8"
        strokeLinejoin="miter"
      />
      <rect x="2.5" y="11.2" width="35" height="7.6" rx="1" fill="#1D3C87" />
      <path
        d="M14.5 17.5V12.5H16.2L18 15.6L19.8 12.5H21.5V17.5H20V14.5L18.5 17H17.5L16 14.5V17.5H14.5Z"
        fill="#FFFFFF"
      />
      <rect x="22.8" y="12.5" width="3" height="5" rx="0.4" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
};

/**
 * Custom crafted EMT Madrid urban bus SVG (front silhouette in municipal blue #0072CE)
 */
export const EmtBusLogo: React.FC<IconProps> = ({ className = 'w-7 h-7', size }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Side mirrors */}
      <path
        d="M6.5 16.5C5.4 16.5 4.5 17.4 4.5 18.5V22.5C4.5 23.6 5.4 24.5 6.5 24.5H8V16.5H6.5Z"
        fill="#00559B"
      />
      <path
        d="M41.5 16.5C42.6 16.5 43.5 17.4 43.5 18.5V22.5C43.5 23.6 42.6 24.5 41.5 24.5H40V16.5H41.5Z"
        fill="#00559B"
      />
      {/* Wheels */}
      <rect x="10.5" y="37" width="6.5" height="6.5" rx="2" fill="#18181B" />
      <rect x="31" y="37" width="6.5" height="6.5" rx="2" fill="#18181B" />
      {/* Bus Main Body */}
      <rect x="8" y="6" width="32" height="33" rx="6.5" fill="#0072CE" />
      {/* Roof AC / top trim */}
      <rect x="14" y="4.2" width="20" height="2.4" rx="1.2" fill="#00559B" />
      {/* Digital Destination Header Strip */}
      <rect x="12.5" y="9" width="23" height="4" rx="1.2" fill="#0A192F" />
      <rect x="14.5" y="10.4" width="11" height="1.2" rx="0.6" fill="#FBBF24" />
      <rect x="27.5" y="10.4" width="6" height="1.2" rx="0.6" fill="#38BDF8" />
      {/* Panoramic Windshield */}
      <rect x="11" y="14.8" width="26" height="12.5" rx="2.5" fill="#E0F2FE" />
      {/* Subtle windshield glare */}
      <path
        d="M14 27.3L20.5 14.8H25L18.5 27.3H14Z"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      {/* White Madrid EMT lower accent stripe */}
      <rect x="8" y="29.5" width="32" height="2" fill="#FFFFFF" fillOpacity="0.9" />
      {/* Headlights */}
      <circle cx="13.5" cy="34.5" r="2.1" fill="#FEF08A" />
      <circle cx="34.5" cy="34.5" r="2.1" fill="#FEF08A" />
      {/* Center Grille */}
      <rect x="19" y="33.4" width="10" height="2.2" rx="1.1" fill="#004C8C" />
    </svg>
  );
};

/**
 * Official-inspired Renfe Cercanías Madrid emblem:
 * Crisp red circle (#E4002B) with a clean inverted white stylized "C".
 */
export const CercaniasLogo: React.FC<IconProps> = ({ className = 'w-7 h-7', size }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="#E4002B" />
      <path
        d="M15.4 14.9A12.2 12.2 0 1 1 15.4 33.1"
        stroke="#FFFFFF"
        strokeWidth="6.2"
        strokeLinecap="butt"
      />
    </svg>
  );
};

/**
 * Compact Cercanías icon for mode selector pills and tight badges
 */
export const CercaniasMark: React.FC<IconProps> = ({ className = 'w-4 h-4', size }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="#E4002B"
        stroke="#FFFFFF"
        strokeOpacity="0.88"
        strokeWidth="1.5"
      />
      <path
        d="M10.4 10.1A8 8 0 1 1 10.4 21.9"
        stroke="#FFFFFF"
        strokeWidth="4.2"
        strokeLinecap="butt"
      />
    </svg>
  );
};

/**
 * Combined compact brand mark for app header
 */
export const MadridTransitBrandMark: React.FC<{ className?: string }> = ({
  className = 'flex items-center gap-1',
}) => {
  return (
    <div className={className} aria-hidden="true">
      <MetroDiamondLogo className="w-7 h-5.5 sm:w-8 sm:h-6 drop-shadow-xs" />
      <EmtBusLogo className="w-5.5 h-5.5 sm:w-6 sm:h-6 drop-shadow-xs" />
      <CercaniasLogo className="w-5.5 h-5.5 sm:w-6 sm:h-6 drop-shadow-xs" />
    </div>
  );
};
