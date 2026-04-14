import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaGlobe,
  FaFileArrowUp,
  FaArrowsRotate,
  FaPenToSquare,
  FaPlus,
} from 'react-icons/fa6';
import DocumentList from './componentes/DocumentList';
import UrlModal from './componentes/UrlModal';
import TextModal from './componentes/TextModal';
import {
  getKnowledgeBases,
  getKnowledgeBaseDetails,
  createKnowledgeBase,
  addSource,
  deleteSource,
} from './services/api';
import toast, { Toaster } from 'react-hot-toast';

const MAX_DOCS = 10;

/* ═══════════════════════════════════════════════════════
   Star Field — particles that float up and down
   Pre-generated outside component (React 19 purity)
   ═══════════════════════════════════════════════════════ */
const STARS_DATA = Array.from({ length: 60 }, (_, i) => {
  const goUp = Math.random() > 0.5;
  return {
    id: i,
    left: `${Math.random() * 100}%`,
    top: goUp
      ? `${80 + Math.random() * 30}%`
      : `${-10 - Math.random() * 20}%`,
    size: 1 + Math.random() * 2.5,
    dur: 10 + Math.random() * 20,
    delay: Math.random() * 15,
    dir: goUp ? 'up' : 'down',
  };
});

function StarField() {
  return (
    <div className="stars-container" aria-hidden="true">
      <div className="ambient-orb ambient-orb--1" />
      <div className="ambient-orb ambient-orb--2" />
      <div className="ambient-orb ambient-orb--3" />
      {STARS_DATA.map((s) => (
        <div
          key={s.id}
          className={`star star--${s.dir}`}
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
            filter:
              s.size > 2 ? `blur(${(s.size - 2) * 0.3}px)` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   App
   ═══════════════════════════════════════════════════════ */
function App() {
  const [documents, setDocuments] = useState([]);
  const [kbId, setKbId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  /* ── Spotlight mouse tracking ── */
  const mainRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = mainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    el.style.setProperty('--spotlight-opacity', '1');
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = mainRef.current;
    if (!el) return;
    el.style.setProperty('--spotlight-opacity', '0');
  }, []);

  /* ────────────── Load ────────────── */

  const fetchDocs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const res = await getKnowledgeBases();
    if (res.error) {
      toast.error('Error al cargar documentos');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const kbs = Array.isArray(res.data) ? res.data : [];
    if (kbs.length > 0) {
      const kb = kbs[0];
      const kbId = kb.knowledge_base_id || kb._id || kb.id;
      setKbId(kbId);
      // Cargar detalle para obtener los sources
      const detail = await getKnowledgeBaseDetails(kbId);
      if (!detail.error) {
        setDocuments(detail.data?.sources || detail.data?.documents || []);
      }
    } else {
      setKbId(null);
      setDocuments([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      const res = await getKnowledgeBases();
      if (cancel) return;
      if (res.error) {
        toast.error('Error al cargar');
        setLoading(false);
        return;
      }
      const kbs = Array.isArray(res.data) ? res.data : [];
      if (kbs.length > 0) {
        const kb = kbs[0];
        const id = kb.knowledge_base_id || kb._id || kb.id;
        setKbId(id);
        // Cargar detalle para obtener los sources
        const detail = await getKnowledgeBaseDetails(id);
        if (!cancel && !detail.error) {
          setDocuments(detail.data?.sources || detail.data?.documents || []);
        }
      } else {
        setKbId(null);
        setDocuments([]);
      }
      if (!cancel) setLoading(false);
    };
    load();
    return () => {
      cancel = true;
    };
  }, []);

  /* ────────────── Actions ────────────── */

  const canAdd = documents.length < MAX_DOCS;

  const guard = (fn) => () => {
    if (!canAdd) {
      toast.error(`Maximo ${MAX_DOCS} documentos`);
      return;
    }
    fn(true);
  };

  const handleAddUrl = async (url) => {
    let targetKbId = kbId;
    if (!targetKbId) {
      // Primera vez: crear KB con esta URL como primera fuente
      const cr = await createKnowledgeBase('Juanita KB', { type: 'url', content: url, name: url });
      if (cr.error) { toast.error('Error al crear Knowledge Base'); throw new Error(); }
      targetKbId = cr.data?.id || cr.data?.knowledge_base_id || cr.data?._id;
      setKbId(targetKbId);
      toast.success('Knowledge Base creada y URL agregada');
      fetchDocs(true);
      return;
    }
    const r = await addSource(targetKbId, { type: 'url', content: url, name: url });
    if (r.error) { toast.error('Error al agregar URL'); throw new Error(); }
    toast.success('URL agregada');
    fetchDocs(true);
  };

  const handleAddFile = async (file) => {
    let targetKbId = kbId;
    if (!targetKbId) {
      const cr = await createKnowledgeBase('Juanita KB', { type: 'file', content: file, name: file.name });
      if (cr.error) { toast.error('Error al crear Knowledge Base'); throw new Error(); }
      targetKbId = cr.data?.id || cr.data?.knowledge_base_id || cr.data?._id;
      setKbId(targetKbId);
      toast.success('Knowledge Base creada y archivo subido');
      fetchDocs(true);
      return;
    }
    const r = await addSource(targetKbId, { type: 'file', content: file, name: file.name });
    if (r.error) { toast.error('Error al subir archivo'); throw new Error(); }
    toast.success('Archivo subido');
    fetchDocs(true);
  };

  const handleAddText = async (text, title) => {
    let targetKbId = kbId;
    if (!targetKbId) {
      const cr = await createKnowledgeBase('Juanita KB', { type: 'text', content: text, name: title });
      if (cr.error) { toast.error('Error al crear Knowledge Base'); throw new Error(); }
      targetKbId = cr.data?.id || cr.data?.knowledge_base_id || cr.data?._id;
      setKbId(targetKbId);
      toast.success('Knowledge Base creada y texto guardado');
      fetchDocs(true);
      return;
    }
    const r = await addSource(targetKbId, { type: 'text', content: text, name: title });
    if (r.error) { toast.error('Error al guardar texto'); throw new Error(); }
    toast.success('Texto agregado');
    fetchDocs(true);
  };

  const handleDelete = async (sourceId) => {
    if (!kbId) return;
    setDeleting(sourceId);
    const r = await deleteSource(kbId, sourceId);
    if (r.error) toast.error('Error al eliminar');
    else toast.success('Eliminado');
    setDeleting(null);
    fetchDocs(true);
  };

  /* ────────────── Derived state ────────────── */

  const existingUrls = documents
    .filter((d) => (d.source_type || d.type) === 'url')
    .map((d) => d.source_name || d.name || d.url || '');
  const existingNames = documents.map(
    (d) => d.source_name || d.name || d.filename || ''
  );

  const count = documents.length;
  const pct = Math.min((count / MAX_DOCS) * 100, 100);
  const isEmpty = !loading && count === 0;
  const hasDocs = !loading && count > 0;

  const progressColor =
    count >= MAX_DOCS
      ? 'bg-j-red'
      : count >= MAX_DOCS - 2
        ? 'bg-j-amber'
        : 'bg-j-accent';
  const countColor =
    count >= MAX_DOCS
      ? 'text-j-red'
      : count >= MAX_DOCS - 2
        ? 'text-j-amber'
        : 'text-j-accent';

  /* ────────────── Render ────────────── */

  return (
    <>
      <StarField />

      <div className="min-h-[100svh] flex flex-col relative z-[1]">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1c1c24',
              color: '#ececf1',
              border: '1px solid #2e2e3a',
              fontSize: '13px',
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
          }}
        />

        {/* ═══════ Main — with spotlight ═══════ */}
        <main
          ref={mainRef}
          className="j-spotlight min-h-screen flex flex-col"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* ─── Loading skeleton ─── */}
          {loading && (
            <div className="j-container py-16 animate-fade-in">
              <div className="h-6 w-48 bg-j-surface rounded-lg mb-4 shimmer-bg" />
              <div className="h-4 w-64 bg-j-surface rounded mb-10 shimmer-bg" />
              <div className="flex gap-4 mb-10">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-28 bg-j-surface rounded-2xl shimmer-bg"
                  />
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="j-card px-4 py-5 shimmer-bg flex items-center gap-4"
                  >
                    <div className="w-11 h-11 rounded-full bg-j-surface-2" />
                    <div className="flex-1">
                      <div className="h-3.5 w-44 bg-j-surface-2 rounded mb-2" />
                      <div className="h-2.5 w-24 bg-j-surface-2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Empty state / Hero ─── */}
          {isEmpty && (
            <div className="flex flex-col j-container py-10 min-h-[calc(100vh-80px)] animate-fade-in relative z-[1]">
              
              {/* Título arriba */}
              <div className="w-full text-center mt-4">
                <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                  <span className="j-gradient-text">Documentos para cargar</span>
                </h1>
                <p className="text-j-text-3 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                  Alimenta la Knowledge Base de Juanita, tu agente de voz, con enlaces,
                  archivos o texto manual.
                </p>
              </div>

              {/* Espacio vacío del 30% de la pantalla */}
              <div style={{ height: '30vh' }} aria-hidden="true" />

              {/* Botones abajo */}
              <div className="mt-auto w-full max-w-[500px] mx-auto pb-4">
                {/* Forzar horizontal SIEMPRE y de forma inflexible mediante flexbox inline */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '12px', width: '100%', margin: '0 auto' }}>
                  <button
                    onClick={guard(setUrlOpen)}
                    className="j-action-card group py-5"
                    style={{ flex: 1 }}
                  >
                    <div className="j-action-card__icon bg-j-blue-soft text-j-blue mb-2 mx-auto">
                      <FaGlobe size={18} />
                    </div>
                    <span className="text-[13px] sm:text-[15px] font-semibold text-j-text block">URL</span>
                    <span className="text-[10px] sm:text-xs text-j-text-3 block mt-0.5">Website</span>
                  </button>
                  <button
                    onClick={guard(setTextOpen)}
                    className="j-action-card group py-5"
                    style={{ flex: 1 }}
                  >
                    <div className="j-action-card__icon bg-j-rose-soft text-j-rose mb-2 mx-auto">
                      <FaFileArrowUp size={18} />
                    </div>
                    <span className="text-[13px] sm:text-[15px] font-semibold text-j-text block">Archivo</span>
                    <span className="text-[10px] sm:text-xs text-j-text-3 block mt-0.5">Documento</span>
                  </button>
                  <button
                    onClick={guard(setTextOpen)}
                    className="j-action-card group py-5"
                    style={{ flex: 1 }}
                  >
                    <div className="j-action-card__icon bg-j-accent-soft text-j-accent mb-2 mx-auto">
                      <FaPenToSquare size={18} />
                    </div>
                    <span className="text-[13px] sm:text-[15px] font-semibold text-j-text block">Texto</span>
                    <span className="text-[10px] sm:text-xs text-j-text-3 block mt-0.5">Manual</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Documents view ─── */}
          {hasDocs && (
            <div className="j-container py-8 sm:py-10 flex-1 animate-fade-in relative z-[1]">
              {/* Title row */}
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold j-gradient-text">
                    Knowledge Base
                  </h1>
                  <p className="text-sm text-j-text-3 mt-1">
                    Gestiona los documentos cargados
                  </p>
                </div>
                <button
                  onClick={() => fetchDocs(true)}
                  disabled={refreshing}
                  className="p-2.5 rounded-xl text-j-text-3 hover:text-j-text hover:bg-j-surface transition-all disabled:opacity-40"
                  title="Actualizar"
                >
                  <FaArrowsRotate
                    size={14}
                    className={refreshing ? 'animate-spin' : ''}
                  />
                </button>
              </div>

              {/* Action chips — horizontal, scrollable on mobile */}
              <div className="flex flex-row gap-2.5 mb-6 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-none">
                <button onClick={guard(setUrlOpen)} className="j-chip">
                  <FaGlobe size={12} className="text-j-blue" /> Agregar URL
                </button>
                <button onClick={guard(setTextOpen)} className="j-chip">
                  <FaFileArrowUp size={12} className="text-j-rose" /> Subir
                  archivo
                </button>
                <button onClick={guard(setTextOpen)} className="j-chip">
                  <FaPenToSquare size={12} className="text-j-accent" /> Texto
                  manual
                </button>
              </div>

              {/* Progress card */}
              <div className="j-card p-4 sm:p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-j-text-2 font-medium">
                    Documentos cargados
                  </span>
                  <span className={`text-sm font-bold ${countColor}`}>
                    {count}/{MAX_DOCS}
                  </span>
                </div>
                <div className="j-progress-track">
                  <div
                    className={`j-progress-fill ${progressColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {count >= MAX_DOCS && (
                  <p className="text-[11px] text-j-red mt-2.5 animate-fade-in">
                    Limite alcanzado -- elimina un documento para agregar otro
                  </p>
                )}
              </div>

              {/* Document list */}
              <DocumentList
                documents={documents}
                onDelete={handleDelete}
                isDeleting={deleting}
              />
            </div>
          )}
        </main>

        {/* ═══════ Footer ═══════ */}
        <footer className="absolute bottom-4 left-0 right-0 w-full text-center text-[10px] text-j-text-3 opacity-40 pointer-events-none z-50">
          Juanita &bull; Knowledge Base Manager &bull;{' '}
          <span className="text-j-accent">Retell AI</span>
        </footer>

        {/* ═══════ Mobile FAB ═══════ */}
        {hasDocs && (
          <div className="fixed bottom-6 right-4 sm:hidden z-40">
            <button
              onClick={guard(setUrlOpen)}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-j-accent to-j-blue text-white shadow-xl shadow-j-accent/20 flex items-center justify-center active:scale-95 transition-transform"
            >
              <FaPlus size={18} />
            </button>
          </div>
        )}

        {/* ═══════ Modals ═══════ */}
        <UrlModal
          open={urlOpen}
          onClose={() => setUrlOpen(false)}
          onSubmit={handleAddUrl}
          existingUrls={existingUrls}
        />
        <TextModal
          open={textOpen}
          onClose={() => setTextOpen(false)}
          onSubmitFile={handleAddFile}
          onSubmitText={handleAddText}
          existingNames={existingNames}
        />
      </div>
    </>
  );
}

export default App;
