import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaXmark,
  FaSpinner,
  FaCloudArrowUp,
  FaFileArrowUp,
  FaPenToSquare,
  FaGlobe,
  FaCheck,
  FaTrash,
  FaPlus,
  FaCircleExclamation,
} from 'react-icons/fa6';

const M = motion.div;

const EXTS = ['.pdf', '.txt', '.md', '.docx'];
const MIME =
  'application/pdf,text/plain,text/markdown,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 20 * 1024 * 1024;
const MIN_TEXT = 10;
const URL_RE =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

const fmtSize = (b) =>
  b < 1024
    ? b + ' B'
    : b < 1048576
      ? (b / 1024).toFixed(1) + ' KB'
      : (b / 1048576).toFixed(1) + ' MB';

/* ─────────────────────────────────────────────
   UploadModal
   Props:
     open          — boolean
     onClose       — () => void
     onSubmitFile  — (file: File) => Promise<void>
     onSubmitUrl   — (url: string) => Promise<void>
     onSubmitText  — (text: string, title: string) => Promise<void>
     existingUrls  — string[]
     existingNames — string[]
     availableSlots — number   (slots left in the KB)
     defaultTab    — 'file' | 'url' | 'text'
───────────────────────────────────────────── */
export default function UploadModal({
  open,
  onClose,
  onSubmitFile,
  onSubmitUrl,
  onSubmitText,
  existingUrls = [],
  existingNames = [],
  availableSlots = 10,
  defaultTab = 'file',
}) {
  const [tab, setTab] = useState(defaultTab);
  const [submitting, setSubmitting] = useState(false);

  /* File tab */
  const [files, setFiles] = useState([]); // [{file, err}]
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  /* URL tab */
  const [urlInput, setUrlInput] = useState('');
  const [urlErr, setUrlErr] = useState('');
  const [urlQueue, setUrlQueue] = useState([]); // string[]
  const urlRef = useRef(null);

  /* Text tab */
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [textErr, setTextErr] = useState('');

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setFiles([]);
      setDragging(false);
      setUrlInput('');
      setUrlErr('');
      setUrlQueue([]);
      setTitle('');
      setBody('');
      setTextErr('');
      setSubmitting(false);
    }
  }, [open, defaultTab]);

  /* ── File helpers ── */
  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!EXTS.includes(ext)) return `Formato no soportado (${ext})`;
    if (f.size > MAX_SIZE) return 'Excede 20 MB';
    if (existingNames.some((n) => n.toLowerCase() === f.name.toLowerCase()))
      return 'Ya existe un archivo con este nombre';
    return '';
  };

  const addFiles = (fileList) => {
    const newItems = Array.from(fileList).map((f) => ({
      file: f,
      err: validateFile(f),
    }));
    setFiles((prev) => {
      const names = new Set(prev.map((x) => x.file.name));
      return [...prev, ...newItems.filter((x) => !names.has(x.file.name))];
    });
  };

  const removeFile = (name) =>
    setFiles((prev) => prev.filter((x) => x.file.name !== name));

  const validFiles = files.filter((x) => !x.err);
  const canSubmitFiles = validFiles.length > 0 && validFiles.length <= availableSlots;

  const submitFiles = async () => {
    if (!canSubmitFiles) return;
    setSubmitting(true);
    try {
      for (const { file } of validFiles) {
        await onSubmitFile(file);
      }
      onClose();
    } catch {
      /* errors handled by parent via toast */
    } finally {
      setSubmitting(false);
    }
  };

  /* ── URL helpers ── */
  const validateUrl = (v) => {
    const u = v.trim();
    if (!u) return 'Ingresa una URL';
    if (!URL_RE.test(u)) return 'Formato inválido — usa https://...';
    if (existingUrls.some((eu) => eu.toLowerCase() === u.toLowerCase()))
      return 'Esta URL ya está en la KB';
    if (urlQueue.some((qu) => qu.toLowerCase() === u.toLowerCase()))
      return 'Ya está en la lista';
    return '';
  };

  const addUrlToQueue = () => {
    const err = validateUrl(urlInput);
    if (err) { setUrlErr(err); return; }
    setUrlQueue((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
    setUrlErr('');
    setTimeout(() => urlRef.current?.focus(), 50);
  };

  const removeUrlFromQueue = (u) =>
    setUrlQueue((prev) => prev.filter((x) => x !== u));

  const canSubmitUrls = urlQueue.length > 0 && urlQueue.length <= availableSlots;

  const submitUrls = async () => {
    if (!canSubmitUrls) return;
    setSubmitting(true);
    try {
      for (const u of urlQueue) {
        await onSubmitUrl(u);
      }
      onClose();
    } catch {
      /* errors handled by parent via toast */
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Text helpers ── */
  const validateText = () => {
    if (!title.trim()) return 'Ingresa un título';
    if (body.trim().length < MIN_TEXT) return `Mínimo ${MIN_TEXT} caracteres`;
    if (existingNames.some((n) => n.toLowerCase() === title.trim().toLowerCase()))
      return 'Ya existe un documento con este título';
    return '';
  };

  const submitText = async () => {
    const err = validateText();
    if (err) { setTextErr(err); return; }
    setSubmitting(true);
    setTextErr('');
    try {
      await onSubmitText(body.trim(), title.trim());
      onClose();
    } catch {
      /* errors handled by parent via toast */
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Tabs config ── */
  const TABS = [
    { id: 'file', label: 'Archivos', icon: FaFileArrowUp },
    { id: 'url',  label: 'Enlace',   icon: FaGlobe },
    { id: 'text', label: 'Texto',    icon: FaPenToSquare },
  ];

  /* ── Slot warning ── */
  const slotWarn = (need) =>
    need > availableSlots
      ? `Solo tienes ${availableSlots} espacio${availableSlots !== 1 ? 's' : ''} disponible${availableSlots !== 1 ? 's' : ''} en esta KB`
      : '';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <M
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="j-modal-overlay"
            onClick={onClose}
          />

          {/* Dialog */}
          <div
            className="j-modal-wrap"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          >
            <M
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25 }}
              className="j-modal j-modal--lg"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Agregar documentos"
            >
              {/* Mobile handle */}
              <div className="flex justify-center mb-4 sm:hidden" aria-hidden="true">
                <div className="w-10 h-1 rounded-full bg-j-surface-3" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-j-text">Agregar documento</h2>
                  <p className="text-[11px] text-j-text-3 mt-0.5">
                    {availableSlots} espacio{availableSlots !== 1 ? 's' : ''} disponible{availableSlots !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="p-2 rounded-xl text-j-text-3 hover:text-j-text hover:bg-j-surface-2 transition-colors"
                >
                  <FaXmark size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-j-surface-2 rounded-2xl mb-5">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    disabled={submitting}
                    className={`upload-tab ${tab === t.id ? 'upload-tab--active' : ''}`}
                  >
                    <t.icon size={11} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ══════════ TAB: FILES ══════════ */}
              {tab === 'file' && (
                <div className="animate-fade-in">
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                    onClick={() => fileRef.current?.click()}
                    className={`dropzone ${dragging ? 'dropzone--active' : files.length > 0 ? 'dropzone--filled' : ''}`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept={MIME}
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                    />
                    <FaCloudArrowUp
                      className={`${dragging ? 'text-j-accent' : 'text-j-text-3'} transition-colors`}
                      size={30}
                    />
                    <p className="text-sm text-j-text-2 mt-2">
                      Arrastra archivos aquí o{' '}
                      <span className="text-j-accent font-medium cursor-pointer">selecciona</span>
                    </p>
                    <p className="text-[10px] text-j-text-3 mt-1">PDF · TXT · MD · DOCX — Máx 20 MB por archivo</p>
                  </div>

                  {/* File queue */}
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map(({ file, err }) => (
                        <div
                          key={file.name}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                            err
                              ? 'bg-j-red-soft border-j-red/20 text-j-red'
                              : 'bg-j-green-soft border-j-green/20 text-j-text'
                          }`}
                        >
                          {err ? (
                            <FaCircleExclamation size={13} className="flex-shrink-0 text-j-red" />
                          ) : (
                            <FaCheck size={12} className="flex-shrink-0 text-j-green" />
                          )}
                          <span className="flex-1 truncate text-[13px]">
                            {file.name}
                            {err && <span className="block text-[11px] opacity-70">{err}</span>}
                          </span>
                          <span className="text-[10px] text-j-text-3 flex-shrink-0">{fmtSize(file.size)}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                            className="p-1 rounded-lg hover:bg-j-surface-2 text-j-text-3 hover:text-j-red transition-colors"
                          >
                            <FaTrash size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Slot overflow warning */}
                  {validFiles.length > availableSlots && (
                    <p className="mt-2.5 text-xs text-j-red animate-fade-in flex items-center gap-1.5">
                      <FaCircleExclamation size={11} />
                      {slotWarn(validFiles.length)}
                    </p>
                  )}

                  <div className="flex gap-2.5 mt-5">
                    <button type="button" onClick={onClose} disabled={submitting} className="j-btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitFiles}
                      disabled={submitting || !canSubmitFiles}
                      className="j-btn-primary flex-1"
                    >
                      {submitting ? (
                        <><FaSpinner className="animate-spin" size={12} /> Subiendo…</>
                      ) : (
                        `Subir ${validFiles.length > 1 ? `${validFiles.length} archivos` : 'archivo'}`
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════ TAB: URL ══════════ */}
              {tab === 'url' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-medium text-j-text-2 mb-2">
                    URL del sitio web
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={urlRef}
                      type="url"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); setUrlErr(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrlToQueue())}
                      placeholder="https://ejemplo.com/pagina"
                      disabled={submitting}
                      className="j-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={addUrlToQueue}
                      disabled={submitting || !urlInput.trim()}
                      className="flex-shrink-0 w-11 h-11 rounded-xl bg-j-surface-2 border border-j-border hover:border-j-accent/40 text-j-text-3 hover:text-j-accent transition-all flex items-center justify-center disabled:opacity-30"
                      title="Agregar a la lista"
                    >
                      <FaPlus size={13} />
                    </button>
                  </div>
                  {urlErr && (
                    <p className="mt-1.5 text-xs text-j-red animate-fade-in flex items-center gap-1">
                      <FaCircleExclamation size={10} /> {urlErr}
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-j-text-3">
                    Presiona Enter o + para agregar varias URLs antes de enviar
                  </p>

                  {/* URL queue */}
                  {urlQueue.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] text-j-text-3 font-medium uppercase tracking-wider">
                        Cola de envío ({urlQueue.length})
                      </p>
                      {urlQueue.map((u) => (
                        <div key={u} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-j-blue-soft border border-j-blue/15 text-j-text">
                          <FaGlobe size={11} className="text-j-blue flex-shrink-0" />
                          <span className="flex-1 truncate text-[12px]">{u}</span>
                          <button
                            type="button"
                            onClick={() => removeUrlFromQueue(u)}
                            className="p-1 rounded-lg text-j-text-3 hover:text-j-red transition-colors"
                          >
                            <FaXmark size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Slot overflow warning */}
                  {urlQueue.length > availableSlots && (
                    <p className="mt-2 text-xs text-j-red animate-fade-in flex items-center gap-1.5">
                      <FaCircleExclamation size={11} />
                      {slotWarn(urlQueue.length)}
                    </p>
                  )}

                  <div className="flex gap-2.5 mt-5">
                    <button type="button" onClick={onClose} disabled={submitting} className="j-btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitUrls}
                      disabled={submitting || !canSubmitUrls}
                      className="j-btn-primary flex-1"
                    >
                      {submitting ? (
                        <><FaSpinner className="animate-spin" size={12} /> Enviando…</>
                      ) : (
                        `Agregar ${urlQueue.length > 1 ? `${urlQueue.length} URLs` : 'URL'}`
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════ TAB: TEXT ══════════ */}
              {tab === 'text' && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-j-text-2 mb-2">
                      Título del fragmento
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTextErr(''); }}
                      placeholder="Ej: FAQ de precios"
                      disabled={submitting}
                      className="j-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-j-text-2 mb-2">
                      Contenido del texto
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => { setBody(e.target.value); setTextErr(''); }}
                      placeholder="Escribe o pega aquí el texto que deseas que Juanita conozca…"
                      disabled={submitting}
                      rows={6}
                      className="j-input resize-none leading-relaxed"
                    />
                    <div className="flex justify-between items-center mt-1.5">
                      <span className={`text-[10px] ${body.length > 0 && body.trim().length < MIN_TEXT ? 'text-j-amber' : 'text-j-text-3'}`}>
                        Mínimo {MIN_TEXT} caracteres
                      </span>
                      <span className="text-[10px] text-j-text-3">{body.length} caracteres</span>
                    </div>
                  </div>

                  {textErr && (
                    <p className="text-xs text-j-red animate-fade-in flex items-center gap-1.5">
                      <FaCircleExclamation size={11} /> {textErr}
                    </p>
                  )}

                  <div className="flex gap-2.5">
                    <button type="button" onClick={onClose} disabled={submitting} className="j-btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitText}
                      disabled={submitting || body.trim().length < MIN_TEXT || !title.trim()}
                      className="j-btn-primary flex-1"
                    >
                      {submitting ? (
                        <><FaSpinner className="animate-spin" size={12} /> Guardando…</>
                      ) : (
                        'Guardar texto'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </M>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
