import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaRegFolderOpen, FaRegCircle, FaCalendarDays } from 'react-icons/fa6';
import { Toaster } from 'react-hot-toast';
import { KBProvider, useKB } from './context/KBContext';
import KBList           from './pages/KBList';
import KBDetail         from './pages/KBDetail';
import OnboardingWizard from './pages/OnboardingWizard';
import Appointments     from './pages/Appointments';
import { getOnboardingStatus } from './services/api';

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
function Sidebar({ collapsed, onToggle, onResetOnboarding }) {
  const { kbList, loading } = useKB();
  const health = useHealth();
  const navigate = useNavigate();

  const dotCls = {
    ok:       'brand-dot brand-dot--ok',
    error:    'brand-dot brand-dot--err',
    checking: 'brand-dot brand-dot--wait',
  }[health] ?? 'brand-dot brand-dot--wait';

  const label = { ok: 'En línea', error: 'Sin conexión', checking: 'Verificando' }[health];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand + toggle */}
      <div className="brand-block">
        {!collapsed && (
          <h1 className="brand-name" onClick={() => navigate('/')}>Claudia</h1>
        )}
        <div className={`brand-status ${collapsed ? 'justify-center' : ''}`} style={collapsed ? { padding: '4px 0 0' } : {}}>
          {!collapsed && <span className={dotCls} />}
          {!collapsed && <span>{label}</span>}
          {collapsed && <span className={`${dotCls} mx-auto`} />}
        </div>
        <button onClick={onToggle} className="sidebar-toggle" title={collapsed ? 'Expandir' : 'Colapsar'}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M4 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M10 3L5 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 overflow-y-auto overflow-x-hidden">
        {!collapsed && <p className="sidebar-section">Colecciones</p>}

        <NavLink
          to="/"
          end
          title={collapsed ? 'Todas las KBs' : undefined}
          className={({ isActive }) => `sidebar-link ${collapsed ? 'sidebar-link--icon' : ''} ${isActive ? 'sidebar-link--active' : ''}`}
        >
          <FaRegFolderOpen size={13} className="flex-shrink-0" />
          {!collapsed && <span>Todas las KBs</span>}
        </NavLink>

        {loading && !collapsed && (
          <div className="space-y-1 mt-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-white/4 animate-pulse mx-2" />
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
              title={collapsed ? name : undefined}
              className={({ isActive }) => `sidebar-link ${collapsed ? 'sidebar-link--icon' : ''} ${isActive ? 'sidebar-link--active' : ''}`}
            >
              <FaRegCircle size={9} className="flex-shrink-0 opacity-60" />
              {!collapsed && <span className="truncate">{name}</span>}
            </NavLink>
          );
        })}

        {!collapsed && <p className="sidebar-section">Agenda</p>}
        {collapsed && <div className="my-3 mx-auto w-px h-4 bg-white/10" />}
        <NavLink
          to="/appointments"
          title={collapsed ? 'Citas' : undefined}
          className={({ isActive }) => `sidebar-link ${collapsed ? 'sidebar-link--icon' : ''} ${isActive ? 'sidebar-link--active' : ''}`}
        >
          <FaCalendarDays size={13} className="flex-shrink-0" />
          {!collapsed && <span>Citas agendadas</span>}
        </NavLink>

        {!collapsed && <p className="sidebar-section">Comportamiento</p>}
        {collapsed && <div className="my-3 mx-auto w-px h-4 bg-white/10" />}
        <NavLink
          to="/"
          end
          title={collapsed ? 'Identidad de IA' : undefined}
          className={({ isActive }) => `sidebar-link ${collapsed ? 'sidebar-link--icon' : ''} ${isActive ? 'sidebar-link--active' : ''}`}
        >
          <FaRegCircle size={9} className="flex-shrink-0 opacity-60" />
          {!collapsed && <span>Identidad de IA</span>}
        </NavLink>
      </nav>

      {/* Reconfigurar */}
      <div className="sidebar-footer">
        <button
          onClick={onResetOnboarding}
          title={collapsed ? 'Reconfigurar agente' : undefined}
          className={`sidebar-link sidebar-link--reset ${collapsed ? 'sidebar-link--icon' : ''}`}
        >
          <FaRegCircle size={9} className="flex-shrink-0 opacity-60" />
          {!collapsed && <span>Reconfigurar agente</span>}
        </button>
      </div>
    </aside>
  );
}

/* ─── Layout shell ─── */
function Layout({ onResetOnboarding }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} onResetOnboarding={onResetOnboarding} />
      <main className="main-content">
        <div className="main-routes">
          <Routes>
            <Route path="/"             element={<KBList />} />
            <Route path="/kb/new"        element={<KBList />} />
            <Route path="/kb/:id"        element={<KBDetail />} />
            <Route path="/appointments"  element={<Appointments />} />
          </Routes>
        </div>
        <footer className="page-footer">
          Desarrollado por <span>IAMasters</span> &nbsp;//&nbsp; 2026 Ed.
        </footer>
      </main>
    </div>
  );
}

/* ─── Root ─── */
export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(null); // null = checking

  useEffect(() => {
    getOnboardingStatus().then(res => {
      setOnboardingDone(res.data?.completed === true);
    });
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingDone(true);
  };

  // Mientras verifica, pantalla en blanco (evita flash)
  if (onboardingDone === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100svh', background: '#101015' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(103,232,249,0.2)', borderTopColor: '#67e8f9', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Si el onboarding no está completado, mostrar wizard
  if (!onboardingDone) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e1e2a', color: '#e4e4f0', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } }} />
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </>
    );
  }

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
      <Layout onResetOnboarding={() => setOnboardingDone(false)} />
    </KBProvider>
  );
}
