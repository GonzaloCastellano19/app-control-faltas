import { CalendarDays, Gauge, LayoutGrid, Moon, Plus, Settings2, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AbsenceDialogProvider, useAbsenceDialog } from './components/AbsenceDialog';
import { Button } from './components/ui';
import { fmtLongToday } from './lib/format';
import { useStore } from './state/store';
import { Dashboard } from './views/Dashboard';
import { History } from './views/History';
import { Modules } from './views/Modules';
import { Settings } from './views/Settings';

const VIEWS = [
  { id: 'panel', label: 'Panel', Icon: Gauge },
  { id: 'asignaturas', label: 'Asignaturas', Icon: LayoutGrid },
  { id: 'historial', label: 'Historial', Icon: CalendarDays },
  { id: 'ajustes', label: 'Ajustes', Icon: Settings2 },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function readView(): ViewId {
  const hash = location.hash.slice(1);
  return VIEWS.some((v) => v.id === hash) ? (hash as ViewId) : 'panel';
}

function ThemeToggle() {
  const { theme, setTheme } = useStore();
  const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <Button variant="ghost" className="!px-2.5" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <span key={String(isDark)} className="spin-in inline-flex">
        {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
      </span>
    </Button>
  );
}

function Shell() {
  const { storageIssue, saveFailed, toast, dismissToast } = useStore();
  const { openAdd } = useAbsenceDialog();
  const [view, setView] = useState<ViewId>(readView);
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    const onHash = () => setView(readView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((next: ViewId) => {
    location.hash = next;
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const viewIndex = VIEWS.findIndex((v) => v.id === view);
  const title = VIEWS[viewIndex].label;

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="aurora" aria-hidden />
      <aside className="panel m-3 hidden flex-col p-4 lg:sticky lg:top-3 lg:flex lg:h-[calc(100dvh-1.5rem)]">
        <div className="px-2 py-2">
          <p className="font-display text-lg font-semibold tracking-tight">Asistencia DAM</p>
          <p className="text-sm text-muted">2.º de DAM</p>
        </div>
        <nav aria-label="Principal" className="relative mt-5 flex flex-col gap-1">
          <span className="nav-marker well absolute inset-x-0 top-0 h-10 rounded-xl" style={{ transform: `translateY(${viewIndex * 44}px)` }} aria-hidden />
          {VIEWS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? 'page' : undefined} className={`relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${view === id ? 'text-brand-text' : 'text-muted hover:text-ink'}`}>
              <Icon size={17} aria-hidden />{label}
            </button>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-5 text-muted">Victoria Institute of Technology, Sanlúcar de Barrameda</p>
      </aside>

      <div className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <main className="mx-auto w-full max-w-6xl pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-6 pl-[max(1rem,env(safe-area-inset-left))] sm:px-6 lg:px-8 lg:pt-8">
          <header className="mb-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted first-letter:uppercase">{fmtLongToday()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <Button variant="primary" onClick={() => openAdd()}><Plus size={16} aria-hidden />Añadir falta</Button>
            </div>
          </header>

          {storageIssue === 'unavailable' && <Notice>Este navegador no permite guardar datos. Los cambios se perderán al cerrar la página.</Notice>}
          {storageIssue === 'damaged' && <Notice>Los datos guardados no se han podido leer y se muestran los iniciales. Restaura una copia desde Ajustes si la tienes.</Notice>}
          {saveFailed && storageIssue !== 'unavailable' && <Notice>El último cambio no se ha podido guardar. Revisa el espacio del navegador y descarga una copia desde Ajustes.</Notice>}

          <div key={view} className="view">
          {view === 'panel' && <Dashboard onConfigure={() => go('ajustes')} onModules={() => go('asignaturas')} onHistory={(id) => { setModuleFilter(id); go('historial'); }} />}
          {view === 'asignaturas' && <Modules onHistory={(id) => { setModuleFilter(id); go('historial'); }} />}
          {view === 'historial' && <History moduleFilter={moduleFilter} setModuleFilter={setModuleFilter} />}
          {view === 'ajustes' && <Settings />}
          </div>

          <footer className="mt-8 max-w-3xl text-xs leading-5 text-muted">
            <p className="mb-1 font-medium text-ink">Autor: Gonzalo Castellano Ruiz</p>
            <p>Esta aplicación es una herramienta personal de seguimiento. Sus cálculos son orientativos y dependen de los datos que introduzcas. No determina la pérdida de la evaluación continua: esa decisión corresponde al centro según su normativa.</p>
          </footer>
        </main>
      </div>

      <nav aria-label="Principal" className="panel fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 grid grid-cols-4 !rounded-2xl lg:hidden">
        <span className="nav-marker well absolute top-1.5 bottom-1.5 left-0 w-1/4 rounded-xl" style={{ transform: `translateX(${viewIndex * 100}%)` }} aria-hidden />
        {VIEWS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? 'page' : undefined} className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${view === id ? 'text-brand-text' : 'text-muted'}`}>
            <Icon size={19} aria-hidden />{label}
          </button>
        ))}
      </nav>

      {toast && (
        <div key={toast.id} role="status" className="toast fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-bg shadow-lg lg:bottom-6">
          <span className="min-w-0">{toast.message}</span>
          {toast.undo && (
            <button type="button" className="shrink-0 font-semibold underline underline-offset-2" onClick={() => { toast.undo?.(); dismissToast(); }}>Deshacer</button>
          )}
        </div>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad-text">{children}</p>;
}

export default function App() {
  return (
    <AbsenceDialogProvider>
      <Shell />
    </AbsenceDialogProvider>
  );
}
