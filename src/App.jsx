import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaFolder } from 'react-icons/fa6';
import { Toaster } from 'react-hot-toast';
import { KBProvider, useKB } from './context/KBContext';
import KBList   from './pages/KBList';
import KBDetail from './pages/KBDetail';

/* ─── Server health hook ─── */
function useHealth() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/documents/health', { signal: AbortSignal.timeout(4000) });
        setStatus(r.ok ? 'ok' : 'error');
      } catch { setStatus('error'); }
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);
  return status;
}

/* ─── Sidebar ─── */
function Sidebar() {
  const { kbList, loading } = useKB();
  const health = useHealth();
  const navigate = useNavigate();

  const dot = {
    ok:       'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]',
    error:    'bg-red-400',
    checking: 'bg-yellow-400',
  }[health] ?? 'bg-yellow-400';

  const label = { ok: 'En línea', error: 'Sin conexión', checking: 'Verificando…' }[health];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-white/5">
        <h1
          onClick={() => navigate('/')}
          className="text-xl font-bold text-white tracking-tight cursor-pointer select-none"
        >
          Juanita
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs text-white/40">{label}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-white/25 font-semibold">
          Colecciones
        </p>

        {/* Home link */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
          }
        >
          <FaFolder size={13} className="flex-shrink-0 opacity-60" />
          <span>Todas las KBs</span>
        </NavLink>

        {/* Dynamic KB links */}
        {loading && (
          <div className="space-y-1 mt-1">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse mx-1" />
            ))}
          </div>
        )}
        {!loading && kbList.map((kb) => {
          const id   = kb.knowledge_base_id || kb.id || kb._id;
          const name = kb.name || kb.knowledge_base_name || id;
          return (
            <NavLink
              key={id}
              to={`/kb/${id}`}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
            >
              <FaFolder size={13} className="flex-shrink-0 opacity-60" />
              <span className="truncate">{name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

/* ─── Layout shell ─── */
function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"        element={<KBList />} />
          <Route path="/kb/new"   element={<KBList />} />
          <Route path="/kb/:id"   element={<KBDetail />} />
        </Routes>
        <footer className="page-footer">
          Desarrollado por <span>IAmasters</span>
        </footer>
      </main>
    </div>
  );
}

/* ─── Root ─── */
export default function App() {
  return (
    <KBProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e2a',
            color: '#e4e4f0',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
        }}
      />
      <Layout />
    </KBProvider>
  );
}
