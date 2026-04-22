import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaGlobe, FaRegFile, FaRegFileLines,
  FaRegTrashCan, FaSpinner, FaMagnifyingGlass,
  FaCloudArrowDown,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { getKnowledgeBaseDetails, addSource, deleteSource } from '../services/api';
import { useKB } from '../context/KBContext';
import UploadTabs from '../componentes/UploadTabs';

const MAX_DOCS = 10;

/* ─── Type icon resolver ─── */
const TYPE_CFG = {
  url:      { Icon: FaGlobe,        label: 'Url' },
  document: { Icon: FaRegFile,      label: 'Archivo' },
  file:     { Icon: FaRegFile,      label: 'Archivo' },
  text:     { Icon: FaRegFileLines, label: 'Texto' },
};
const typeCfg = (t) => TYPE_CFG[t] || TYPE_CFG.document;

/* ─── Progress ring (SVG) ─── */
function ProgressRing({ value, max }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const stroke = pct >= 100 ? '#f87171' : pct >= 80 ? '#fbbf24' : '#67e8f9';
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
      />
      <text
        x="24" y="27"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.85)"
        fontWeight="500"
        letterSpacing="0.5"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

/* ─── Skeleton row ─── */
function SkeletonDocRow() {
  return (
    <div className="doc-row-float">
      <div className="doc-icon shimmer-bg" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-44 bg-white/4 rounded animate-pulse" />
        <div className="h-2 w-16 bg-white/4 rounded animate-pulse" />
      </div>
      <div className="doc-trash" style={{ opacity: 0.3 }} />
    </div>
  );
}

export default function KBDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { fetchList } = useKB();

  const [kbName, setKbName]         = useState('');
  const [sources, setSources]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [confirmId, setConfirmId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch]         = useState('');
  const [syncing, setSyncing]       = useState(false);

  /* ─── Load detail ─── */
  const loadDetail = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await getKnowledgeBaseDetails(id);
    if (!r.error) {
      setKbName(r.data?.name || r.data?.knowledge_base_name || '');
      setSources(r.data?.sources || r.data?.documents || []);
    } else {
      toast.error('Error al cargar la KB');
    }
    setLoading(false);
  }, [id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDetail(); }, [id]);

  /* ─── Derived ─── */
  const count = sources.length;
  const atMax = count >= MAX_DOCS;

  const existingUrls  = sources.filter(d => (d.source_type || d.type) === 'url').map(d => d.url || d.source_name || d.name || '');
  const existingNames = sources.map(d => d.title || d.source_name || d.name || d.filename || '');

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(d => {
      const n = (d.title || d.source_name || d.name || d.filename || d.url || '').toLowerCase();
      return n.includes(q);
    });
  }, [sources, search]);

  /* ─── Upload ─── */
  const handleUpload = async (source) => {
    if (atMax) { toast.error('Esta KB ya tiene 10 documentos'); return; }
    const r = await addSource(id, source);
    if (r.error) { toast.error('Error al agregar el documento'); throw new Error(); }
    toast.success('Documento agregado');
    loadDetail(true);
    fetchList(true);
  };

  /* ─── Sync (refresh from server) ─── */
  const handleSync = async () => {
    setSyncing(true);
    await loadDetail(true);
    await fetchList(true);
    setSyncing(false);
    toast.success('Sincronizado con Retell');
  };

  /* ─── Delete (2-tap) ─── */
  const handleDelete = async (sourceId) => {
    if (confirmId === sourceId) {
      setConfirmId(null);
      setDeletingId(sourceId);
      const r = await deleteSource(id, sourceId);
      if (r.error) toast.error('Error al eliminar');
      else toast.success('Fuente eliminada');
      setDeletingId(null);
      loadDetail(true);
      fetchList(true);
    } else {
      setConfirmId(sourceId);
      setTimeout(() => setConfirmId(p => p === sourceId ? null : p), 3000);
    }
  };

  const displayName = loading ? '…' : (kbName || id);

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="flex items-start gap-5 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="icon-btn flex-shrink-0 mt-2"
            title="Volver"
            style={{ borderRadius: '999px' }}
          >
            <FaArrowLeft size={11} />
          </button>
          <div className="min-w-0">
            <h1 className="page-title-xl truncate">{displayName}</h1>
            <p className="page-sub">Base de Conocimiento &nbsp;/&nbsp; IA Activa</p>
          </div>
        </div>

        {/* Search top-right */}
        <div className="search-wrap">
          <FaMagnifyingGlass size={11} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documentos…"
            className="search-input"
          />
        </div>
      </div>

      {/* ── Capacity ring ── */}
      <div className="mb-10">
        <div className="ring-card">
          <ProgressRing value={loading ? 0 : count} max={MAX_DOCS} />
          <div className="ring-info">
            <span className="ring-info-label">Documentos</span>
            <span className="ring-info-value">{loading ? '…' : `${count} de ${MAX_DOCS}`}</span>
          </div>
        </div>
      </div>

      {/* ── Glass upload panel ── */}
      <div className="glass-panel">
        <UploadTabs
          variant="premium"
          onSubmit={handleUpload}
          disabled={atMax}
          availableSlots={Math.max(0, MAX_DOCS - count)}
          existingUrls={existingUrls}
          existingNames={existingNames}
          extraAction={
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="btn-pill"
            >
              {syncing
                ? <><FaSpinner className="animate-spin" size={11} /> Sincronizando…</>
                : <><FaCloudArrowDown size={12} /> Guardar y Sincronizar</>
              }
            </button>
          }
        />
      </div>

      {/* ── Floating documents section ── */}
      <p className="section-label-float">
        Documentos actuales{!loading && ` (${count})`}
      </p>

      {loading && (
        <div>
          {[1, 2, 3].map(i => <SkeletonDocRow key={i} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-12 text-center text-[12px] tracking-[0.2em] uppercase text-white/25">
          {search ? 'Sin resultados' : 'Sin documentos aún'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.map((doc, i) => {
            const sid  = doc.sourceId || doc.knowledge_base_source_id || doc.source_id || doc._id || doc.id || `s-${i}`;
            const name = doc.title || doc.source_name || doc.name || doc.filename || doc.url || 'Sin nombre';
            const type = doc.source_type || doc.type || 'document';
            const cfg  = typeCfg(type);
            const { Icon } = cfg;
            const busy = deletingId === sid;
            const conf = confirmId === sid;

            return (
              <motion.div
                key={sid}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: busy ? 0.4 : 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, delay: i * 0.03 }}
                className="doc-row-float"
              >
                <div className="doc-icon">
                  <Icon size={14} className="text-white/55" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="doc-name truncate" title={name}>{name}</p>
                  <p className="doc-tag">{cfg.label}</p>
                </div>

                <button
                  onClick={() => handleDelete(sid)}
                  disabled={busy}
                  title={conf ? 'Confirmar eliminación' : 'Eliminar'}
                  className={`doc-trash ${conf ? 'doc-trash--confirm' : ''}`}
                >
                  {busy
                    ? <FaSpinner size={11} className="animate-spin" />
                    : <FaRegTrashCan size={12} />
                  }
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
