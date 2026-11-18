import React from 'react';
import { motion } from 'motion/react';

const PARTICLES = [
  { id: 1, x: -120, y: -90, color: '#76C457', delay: 0 },
  { id: 2, x: -75, y: -130, color: '#2A7C13', delay: 0.05 },
  { id: 3, x: -25, y: -115, color: '#15370D', delay: 0.08 },
  { id: 4, x: 25, y: -125, color: '#76C457', delay: 0.04 },
  { id: 5, x: 75, y: -110, color: '#2A7C13', delay: 0.09 },
  { id: 6, x: 120, y: -85, color: '#76C457', delay: 0.03 },
  { id: 7, x: -95, y: -55, color: '#15370D', delay: 0.1 },
  { id: 8, x: 95, y: -55, color: '#2A7C13', delay: 0.07 },
];

export const ConfettiBurst: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex items-center justify-center overflow-visible"
    >
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.5, rotate: 0 }}
          animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.15, rotate: 240 }}
          transition={{ duration: 1.15, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          style={{ backgroundColor: p.color }}
          className="absolute h-2.5 w-2.5 rounded-sm"
        />
      ))}
    </div>
  );
};
