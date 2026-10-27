// A transparent workload estimate, not a savings forecast or a client result.
export function weeklyWorkload(volume, minutes) {
  if (!Number.isInteger(volume) || volume < 0 || volume > 100000 ||
      !Number.isFinite(minutes) || minutes < 0.1 || minutes > 480) return null;
  return {minutes: volume * minutes, hours: volume * minutes / 60};
}

export function installWorkloadCalculators(doc = document) {
  const cleanups = [];
  for (const root of doc.querySelectorAll('[data-workload]')) {
    const volume = root.querySelector('[data-workload-volume]');
    const minutes = root.querySelector('[data-workload-minutes]');
    const output = root.querySelector('output');
    const formula = root.querySelector('[data-workload-formula]');
    const en = root.lang.startsWith('en');
    const format = new Intl.NumberFormat(en ? 'en-CA' : 'fr-CA', {maximumFractionDigits: 2});
    const update = () => {
      const result = volume.value.trim() && minutes.value.trim() &&
        weeklyWorkload(Number(volume.value), Number(minutes.value));
      if (!result) {
        output.textContent = en ? 'Check the two values.' : 'Vérifiez les deux valeurs.';
        formula.textContent = en ? 'Use a whole number of tasks and 0.1–480 minutes per task.' : 'Utilisez un nombre entier de tâches et de 0,1 à 480 minutes par tâche.';
        return;
      }
      const short = result.minutes < 60;
      output.textContent = format.format(short ? result.minutes : result.hours) + (short ? (en ? ' min / week' : ' min / semaine') : (en ? ' h / week' : ' h / semaine'));
      formula.textContent = format.format(Number(volume.value)) + ' × ' + format.format(Number(minutes.value)) + (short ? ' = ' + format.format(result.minutes) + ' min' : ' ÷ 60 = ' + format.format(result.hours) + ' h');
    };
    volume.addEventListener('input', update);
    minutes.addEventListener('input', update);
    update();
    cleanups.push(() => {volume.removeEventListener('input', update); minutes.removeEventListener('input', update);});
  }
  return () => cleanups.forEach(cleanup => cleanup());
}
