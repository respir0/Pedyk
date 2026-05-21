import React from 'react';

const DEFAULT_AVATAR = '/default_avatar.png';

const Avatar = ({ name, src = null, size = 45, className = '' }) => {
  const avatarSrc = src || DEFAULT_AVATAR;
  
  return (
    <img
      src={avatarSrc}
      alt={name}
      width={size}
      height={size}
      className={`rounded-circle ${className}`}
      style={{ objectFit: 'cover' }}
    />
  );
};

export default Avatar;