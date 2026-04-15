import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaTrash, FaDatabase, FaSpinner,
  FaTriangleExclamation, FaCircleExclamation,
  FaXmark, FaFileArrowUp, FaGlobe, FaPenToSquare,
  FaCloudArrowUp, FaCheck,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { useKB } from '../context/KBContext';
import { deleteKnowledgeBase, createKnowledgeBase } from '../services/api';

const EXTS    = ['.pdf', '.txt', '.md', '.docx'];
const MIME    = 'application/pdf,text/plain,text/markdown,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_MB  = 20 * 1024 * 1024;
const URL_RE  = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;
const fmtSize = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

const NEW_TABS = [
  { id: 'file', label: 'Archivo', Icon: FaFileArrowUp },
  { id: 'url',  label: 'URL',     Icon: FaGlobe },
  { id: 'text', label: 'Texto',   Icon: FaPenToSquare },
];

/* ─── Nueva KB modal ─── */
function NewKBModal({ onClose, onCreated }) {
  const [kbName, setKbName]     = useState('');
  const [tab, setTab]           = useState('file');
  const [file, setFile]         = useState(null);
  const [fileErr, setFileErr]   = useState('');
  const [dragging, setDragging] = useState(false);
  const [urlVal, setUrlVal]     = useState('');
  const [urlErr, setUrlErr]     = useState('');
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [textErr, setTextErr]   = useState('');
  const [busy, setBusy]         = useState(false);
  const fileRef = useRef(null);

  const pickFile = (files) => {
    const f = files?.[0]; if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!EXTS.includes(ext)) { setFileErr(`Formato no soportado (${ext})`); setFile(null); return; }
    if (f.size > MAX_MB)     { setFileErr('El archivo excede 20 MB');        setFile(null); return; }
    setFileErr(''); setFile(f);
  };

  const getSource = () => {
    if (tab === 'file') return file ? { type: 'file', content: file, name: file.name } : null;
    if (tab === 'url')  return urlVal.trim() && URL_RE.test(urlVal.trim()) ? { type: 'url',  content: urlVal.trim(), name: urlVal.trim() } : null;
    if (tab === 'text') return title.trim() && body.trim().length >= 10    ? { type: 'text', content: body.trim(),   name: title.trim()  } : null;
    return null;
  };

  const isValid = kbName.trim().length >= 2 && !!getSource() && !fileErr && !urlErr;

  const handleSubmit = async () => {
    if (!isValid) return;
    const source = getSource();
    setBusy(true);
    const r = await createKnowledgeBase(kbName.trim(), source);
    setBusy(false);
    if (r.error) { toast.error('Error al crear la Knowledge Base'); return; }
    toast.success(`"${kbName.trim()}" creada correctamente`);
    onCreated(r.data?.id || r.data?.knowledge_base_id);
  };

  return (
    <>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="modal-wrap">
        <motion.div
          className="modal-box"
          style={{ maxWidth: 480 }}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white">Nueva Knowledge Base</h2>
            <button onClick={onClose} disabled={busy} className="icon-btn">
              <FaXmark size={13} />
            </button>
          </div>

          {/* KB Name */}
          <div className="mb-6">
            <label className="field-label mb-2 block">Nombre de la KB</label>
            <input
              type="text"
              value={kbName}
              onChange={e => setKbName(e.target.value)}
              placeholder="Ej: Productos 2026"
              disabled={busy}
              className="field-input w-full"
              autoFocus
            />
            {kbName.trim().length > 0 && kbName.trim().length < 2 && (
              <p className="text-[11.5px] text-amber-400 mt-1.5">Mínimo 2 caracteres</p>
            )}
          </div>

          {/* Divider */}
          <div className="mb-5">
            <p className="field-label mb-4">Primer documento <span className="text-white/20 normal-case font-normal">(obligatorio)</span></p>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-5 w-fit">
              {NEW_TABS.map(({ id, label, Icon: TabI }) => {
                const TIcon = TabI;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    disabled={busy}
                    className={`upload-tab-btn ${tab === id ? 'upload-tab-btn--active' : ''}`}
                  >
                    <TIcon size={11} />{label}
                  </button>
                );
              })}
            </div>

            {/* File tab */}
            {tab === 'file' && (
              <div className="space-y-3">
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  className={`dropzone-area ${dragging ? 'dropzone-area--active' : file ? 'dropzone-area--filled' : ''}`}
                >
                  <input ref={fileRef} type="file" accept={MIME} className="hidden" onChange={e => pickFile(e.target.files)} />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                        <FaCheck size={13} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-white/80 truncate max-w-[260px]">{file.name}</p>
                      <p className="text-xs text-white/35">{fmtSize(file.size)}</p>
                      <button type="button" onClick={e => { e.stopPropagation(); setFile(null); setFileErr(''); }}
                        className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 transition-colors">
                        <FaTrash size={9} /> Quitar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FaCloudArrowUp size={28} className={`${dragging ? 'text-indigo-400' : 'text-white/20'} transition-colors`} />
                      <p className="text-sm text-white/50">Arrastra o <span className="text-indigo-400 font-medium cursor-pointer">selecciona archivo</span></p>
                      <p className="text-xs text-white/25">PDF · TXT · MD · DOCX — Máx 20 MB</p>
                    </div>
                  )}
                </div>
                {fileErr && <p className="text-[12px] text-red-400">{fileErr}</p>}
              </div>
            )}

            {/* URL tab */}
            {tab === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={urlVal}
                  onChange={e => { setUrlVal(e.target.value); setUrlErr(''); }}
                  placeholder="https://ejemplo.com/pagina"
                  disabled={busy}
                  className="field-input w-full"
                />
                {urlVal && !URL_RE.test(urlVal.trim()) && (
                  <p className="text-[12px] text-amber-400">Formato inválido — usa https://…</p>
                )}
              </div>
            )}

            {/* Text tab */}
            {tab === 'text' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setTextErr(''); }}
                  placeholder="Título del fragmento"
                  disabled={busy}
                  className="field-input w-full"
                />
                <textarea
                  value={body}
                  onChange={e => { setBody(e.target.value); setTextErr(''); }}
                  placeholder="Escribe el contenido…"
                  disabled={busy}
                  rows={4}
                  className="field-input w-full resize-none leading-relaxed"
                />
                {textErr && <p className="text-[12px] text-red-400">{textErr}</p>}
                <p className="text-[11px] text-white/25">Mínimo 10 caracteres · {body.length} escritos</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={busy} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={handleSubmit} disabled={!isValid || busy} className="btn-primary flex-1">
              {busy ? <><FaSpinner className="animate-spin" size={12} /> Creando…</> : <><FaPlus size={11} /> Crear KB</>}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

const M = motion.div;

/* ─── Delete confirmation modal ─── */
function DeleteModal({ kb, onConfirm, onCancel, busy }) {
  const name = kb?.name || kb?.knowledge_base_name || kb?.knowledge_base_id || kb?.id;
  return (
    <AnimatePresence>
      {kb && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <div className="modal-wrap">
            <M
              className="modal-box"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog" aria-modal="true"
            >
              {/* Icon */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                  <FaTriangleExclamation size={22} className="text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Eliminar Knowledge Base</h2>
                <p className="text-sm text-white/50">
                  ¿Seguro que deseas eliminar{' '}
                  <span className="font-semibold text-white/80">"{name}"</span>?
                </p>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 mb-6 flex gap-3">
                <FaCircleExclamation size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12.5px] text-white/55 leading-relaxed">
                  <span className="text-amber-400 font-semibold">⚠️ Nota:</span>{' '}
                  Eliminar esta colección{' '}
                  <strong className="text-white/75">no la desvincula automáticamente</strong>{' '}
                  del LLM del agente en Retell AI. Actualiza la configuración de tu agente después.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={onCancel} disabled={busy} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button onClick={onConfirm} disabled={busy} className="btn-danger flex-1">
                  {busy
                    ? <><FaSpinner className="animate-spin" size={13} /> Eliminando…</>
                    : <><FaTrash size={12} /> Eliminar KB</>
                  }
                </button>
              </div>
            </M>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-white/5 rounded animate-pulse" />
          <div className="h-3 w-52 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="w-24 h-9 bg-white/5 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

/* ─── KBList page ─── */
export default function KBList() {
  const { kbList, loading, fetchList } = useKB();
  const navigate = useNavigate();

  const [showNew, setShowNew]         = useState(false);
  const [deletingKB, setDeletingKB]   = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  const handleCreated = (newId) => {
    setShowNew(false);
    fetchList(true);
    if (newId) navigate(`/kb/${newId}`);
  };

  const confirmDelete = async () => {
    if (!deletingKB) return;
    const id = deletingKB.knowledge_base_id || deletingKB.id || deletingKB._id;
    setDeletingId(id);
    const r = await deleteKnowledgeBase(id);
    if (r.error) toast.error('Error al eliminar la KB');
    else toast.success('Knowledge Base eliminada');
    setDeletingId(null);
    setDeletingKB(null);
    fetchList(true);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Colecciones de documentos</h1>
          <p className="page-sub">
            {loading ? '…' : `${kbList.length} Knowledge Base${kbList.length !== 1 ? 's' : ''} en tu cuenta`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <FaPlus size={12} /> Nueva KB
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && kbList.length === 0 && (
        <div className="empty-state">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
            <FaDatabase size={26} className="text-white/25" />
          </div>
          <h2 className="text-base font-semibold text-white/70 mb-2">Sin Knowledge Bases</h2>
          <p className="text-sm text-white/35 max-w-xs text-center leading-relaxed mb-6">
            Aún no tienes ninguna colección. Crea la primera para empezar a gestionar documentos.
          </p>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <FaPlus size={12} /> Crear primera KB
          </button>
        </div>
      )}

      {/* KB cards */}
      {!loading && kbList.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {kbList.map((kb, i) => {
              const id   = kb.knowledge_base_id || kb.id || kb._id;
              const name = kb.name || kb.knowledge_base_name || id;
              const busy = deletingId === id;

              return (
                <M
                  key={id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className={`card card-hover ${busy ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-5 p-5 sm:p-6">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center flex-shrink-0">
                      <FaDatabase size={15} className="text-indigo-400" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-white truncate">{name}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/kb/${id}`)}
                        className="btn-secondary text-[13px] px-4 py-2 flex items-center gap-2"
                      >
                        <FaDatabase size={11} /> Administrar
                      </button>
                      <button
                        onClick={() => setDeletingKB(kb)}
                        className="icon-btn icon-btn--danger"
                        title="Eliminar KB"
                      >
                        {busy
                          ? <FaSpinner size={13} className="animate-spin" />
                          : <FaTrash size={13} />
                        }
                      </button>
                    </div>
                  </div>
                </M>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <DeleteModal
        kb={deletingKB}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingKB(null)}
        busy={!!deletingId}
      />

      <AnimatePresence>
        {showNew && <NewKBModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
      </AnimatePresence>
    </div>
  );
}
