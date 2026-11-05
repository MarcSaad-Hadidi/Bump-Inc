import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './cyber.css';

export const metadata: Metadata = {
  title: 'Bump Cyber — Espace de consultation',
  description: 'Espace privé de gestion des audits, constats et remédiations.',
  robots: { index: false, follow: false },
};

export default function CyberLayout({ children }: { children: ReactNode }) {
  return <div className="cyber-app">{children}</div>;
}
