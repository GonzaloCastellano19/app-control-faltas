import { useMemo } from 'react';
import { ModuleCard } from '../components/ModuleCard';
import { summarizeAll } from '../lib/calc';
import { useStore } from '../state/store';

export function Modules({ onHistory }: { onHistory: (moduleId: string) => void }) {
  const { data } = useStore();
  const summaries = useMemo(() => summarizeAll(data), [data]);
  return (
    <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaries.map((s) => (
        <ModuleCard
          key={s.module.id}
          summary={s}
          limitPercent={data.settings.limitPercent}
          warnAtPercent={data.settings.warnAtPercent}
          onHistory={() => onHistory(s.module.id)}
        />
      ))}
    </div>
  );
}
