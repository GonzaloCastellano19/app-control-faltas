import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtHours } from '../lib/format';
import type { ModuleSummary } from '../lib/types';
import { useStore } from '../state/store';
import { ModuleChart } from './Charts';
import { createSkyline, type SkylineApi, type Tower } from './skyline';

export function Skyline3D({ summaries, selectedId, onSelect }: {
  summaries: ModuleSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { theme } = useStore();
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SkylineApi | null>(null);
  const selectRef = useRef(onSelect);
  const [unsupported, setUnsupported] = useState(false);
  selectRef.current = onSelect;

  const towers = useMemo<Tower[]>(
    () =>
      summaries.map((s) => ({
        id: s.module.id,
        label: s.module.shortName,
        hours: s.totalAbsent,
        hoursText: fmtHours(s.totalAbsent),
        state: s.state,
        segments: { justified: s.justified, unjustified: s.unjustified, unclassified: s.unclassified },
      })),
    [summaries],
  );
  const towersRef = useRef(towers);
  towersRef.current = towers;

  useEffect(() => {
    if (!hostRef.current || !labelsRef.current) return;
    let api: SkylineApi;
    try {
      api = createSkyline(hostRef.current, labelsRef.current, (id) => selectRef.current(id));
    } catch {
      setUnsupported(true);
      return;
    }
    apiRef.current = api;
    api.setTowers(towersRef.current);
    api.refreshTheme();

    const media = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => api.refreshTheme();
    media.addEventListener('change', onScheme);
    return () => {
      media.removeEventListener('change', onScheme);
      api.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => { apiRef.current?.setTowers(towers); }, [towers]);
  useEffect(() => { apiRef.current?.setSelected(selectedId); }, [selectedId]);
  useEffect(() => { apiRef.current?.refreshTheme(); }, [theme]);

  if (unsupported) return <ModuleChart summaries={summaries} />;

  return (
    <div
      className="relative h-[20rem] sm:h-[25rem]"
      role="img"
      aria-label={`Maqueta 3D de horas de falta por módulo: ${summaries.map((s) => `${s.module.shortName} ${fmtHours(s.totalAbsent)}`).join(', ')}`}
    >
      <div ref={hostRef} className="absolute inset-0" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
    </div>
  );
}
