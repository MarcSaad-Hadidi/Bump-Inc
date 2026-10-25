'use client';
export function PrintButton() {
  return (
    <button className="no-print" onClick={() => window.print()}>
      Imprimer / Enregistrer en PDF
    </button>
  );
}
