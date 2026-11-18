import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`Foto de perfil de ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700`}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar de ${name}`}
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-full bg-[#2A7C13]/15 font-display font-bold text-[#15370D] dark:bg-[#76C457]/20 dark:text-[#76C457]`}
    >
      {getInitials(name)}
    </div>
  );
};
