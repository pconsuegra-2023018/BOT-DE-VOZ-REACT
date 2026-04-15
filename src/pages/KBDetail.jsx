import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaGlobe, FaFilePdf, FaFileLines,
  FaTrash, FaSpinner, FaCircleXmark,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { getKnowledgeBaseDetails, addSource, deleteSource } from '../services/api';
import { useKB } from '../context/KBContext';
import UploadTabs from '../componentes/UploadTabs';

const MAX_DOCS = 10;

/* ─── Type icon config ─── */
const TYPE_CFG = {
  url:      { Icon: FaGlobe,     label: 'URL',     cls: 'text-sky-400',    bg: 'bg-sky-400/10',    border: 'border-sky-400/20' },
  document: { Icon: FaFilePdf,   label: 'Archivo', cls: 'text-rose-400',   bg: 'bg-rose-400/10',   border: 'border-rose-400/20' },
  file:     { Icon: FaFilePdf,   label: 'Archivo', cls: 'text-rose-400',   bg: 'bg-rose-400/10',   border: 'border-rose-400/20' },
  text:     { Icon: FaFileLines, label: 'Texto',   cls: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
};
const typeCfg = (t) => TYPE_CFG[t] || TYPE_CFG.document;

/* ─── Skeleton card ─── */
function SkeletonDocCard() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-44 bg-white/5 rounded animate-pulse" />
        <div className="h-2.5 w-16 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="w-8 h-8 bg-white/5 rounded-lg animate-pulse flex-shrink-0" />
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
  const count  = sources.length;
  const atMax  = count >= MAX_DOCS;
  const pct    = Math.min((count / MAX_DOCS) * 100, 100);
  const barCls = atMax ? 'bg-red-500' : count >= MAX_DOCS - 2 ? 'bg-amber-400' : 'bg-emerald-500';
  const cntCls = atMax ? 'text-red-400' : count >= MAX_DOCS - 2 ? 'text-amber-400' : 'text-emerald-400';

  const existingUrls  = sources.filter(d => (d.source_type || d.type) === 'url').map(d => d.url || d.source_name || d.name || '');
  const existingNames = sources.map(d => d.title || d.source_name || d.name || d.filename || '');

  /* ─── Upload ─── */
  const handleUpload = async (source) => {
    if (atMax) { toast.error('Esta KB ya tiene 10 documentos (límite máximo)'); return; }
    const r = await addSource(id, source);
    if (r.error) { toast.error('Error al agregar el documento'); throw new Error(); }
    toast.success('Documento agregado');
    loadDetail(true);
    fetchList(true);
  };

  /* ─── Delete (2-tap confirm) ─── */
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

      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="icon-btn flex-shrink-0"
          title="Volver al listado"
        >
          <FaArrowLeft size={13} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-white/25 font-semibold mb-1">
            Knowledge Bases
          </p>
          <h1 className="page-title leading-none truncate">{displayName}</h1>
        </div>
      </div>

      {/* ── Capacity card ── */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white/50">Documentos en uso</span>
          <span className={`text-sm font-bold tabular-nums ${cntCls}`}>
            {loading ? '…' : `${count} / ${MAX_DOCS}`}
          </span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barCls}`}
            style={{ width: loading ? '0%' : `${pct}%` }}
          />
        </div>
        {atMax && !loading && (
          <p className="mt-3 text-[12px] text-red-400 flex items-center gap-1.5">
            <FaCircleXmark size={11} />
            Límite alcanzado — elimina un documento para agregar otro
          </p>
        )}
      </div>

      {/* ── Upload tabs ── */}
      <div className="card p-5 mb-5">
        <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-5">
          Agregar documento
        </p>
        <UploadTabs
          onSubmit={handleUpload}
          disabled={atMax}
          availableSlots={Math.max(0, MAX_DOCS - count)}
          existingUrls={existingUrls}
          existingNames={existingNames}
        />
      </div>

      {/* ── Sources list ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">
            Documentos actuales{!loading && ` (${count})`}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div>
            {[1, 2, 3].map(i => <SkeletonDocCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && sources.length === 0 && (
          <p className="py-10 text-center text-sm text-white/25">
            No hay documentos en esta KB aún
          </p>
        )}

        {/* List */}
        {!loading && sources.length > 0 && (
          <AnimatePresence mode="popLayout" initial={false}>
            {sources.map((doc, i) => {
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
                  className="border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={13} className={cfg.cls} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] text-white/80 truncate" title={name}>{name}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls} opacity-80`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(sid)}
                      disabled={busy}
                      title={conf ? 'Confirmar eliminación' : 'Eliminar'}
                      className={`icon-btn flex-shrink-0 ${conf ? 'icon-btn--confirm' : 'icon-btn--danger'}`}
                    >
                      {busy
                        ? <FaSpinner size={12} className="animate-spin" />
                        : <FaTrash size={12} />
                      }
                    </button>
                  </div>

                  {/* Confirm hint */}
                  <AnimatePresence>
                    {conf && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-5 py-2.5 bg-red-500/5 border-t border-red-500/10">
                          <span className="text-[12px] text-red-400">
                            Haz clic en el icono de nuevo para confirmar
                          </span>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[11px] text-white/30 hover:text-white/60 transition-colors ml-4"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

    </div>
  );
}
