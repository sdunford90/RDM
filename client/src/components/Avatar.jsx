import React from 'react';
import { initials } from '../utils/formatters';

const HUE_SALT = 137;
function hueForKey(k) {
  if (!k) return 200;
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (h + HUE_SALT) % 360;
}

export default function Avatar({ user, size = 24, title }) {
  if (!user) return <span className="inline-block bg-muted rounded-full" style={{ width: size, height: size }} />;
  const key = user.email || user.name || user.id;
  const hue = hueForKey(key);
  const bg = `hsl(${hue}, 60%, 92%)`;
  const fg = `hsl(${hue}, 60%, 32%)`;
  if (user.picture) {
    return (
      <img src={user.picture} alt={user.name || user.email}
           title={title || user.name || user.email}
           className="rounded-full object-cover"
           style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}
      title={title || user.name || user.email}
    >
      {initials(user.name, user.email)}
    </span>
  );
}
