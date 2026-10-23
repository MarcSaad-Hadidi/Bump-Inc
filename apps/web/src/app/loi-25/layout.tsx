import type { ReactNode } from 'react';
import './loi25.css';

export const metadata = { title: 'Bump Inc. — Audit passif Loi 25' };
export default function Loi25Layout({ children }: { children: ReactNode }) {
  return (
    <div className="loi25" lang="fr-CA">
      {children}
    </div>
  );
}
