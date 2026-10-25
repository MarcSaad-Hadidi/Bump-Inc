import {useEffect, useSyncExternalStore} from 'react';

// Both demonstrations can intersect a tall viewport. Give the first one the
// floor until its finite scenario completes, instead of running two clocks.
const waiting = new Map();
const listeners = new Set();
let current = null;
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => current;
function update() {
  const next = ['operations', 'data'].find(id => waiting.get(id)) ?? null;
  if(next === current) return;
  current = next;
  for(const listener of listeners) listener();
}

export function useDemoTurn(id, ready) {
  const owner = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    waiting.set(id, ready); update();
    return () => { waiting.delete(id); update(); };
  }, [id, ready]);
  return {turn:owner === id,canRestart:owner===null||owner===id};
}
