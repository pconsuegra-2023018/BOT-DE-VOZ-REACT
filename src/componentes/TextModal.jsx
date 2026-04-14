import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFileLines,
  FaXmark,
  FaSpinner,
  FaCloudArrowUp,
  FaFileArrowUp,
  FaPenToSquare,
  FaCheck,
  FaTrash,
} from 'react-icons/fa6';

const M = motion.div;

const EXTS = ['.pdf', '.txt', '.md', '.docx'];
const MIME =
  'application/pdf,text/plain,text/markdown,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIN_TEXT = 10;
const MAX_SIZE = 20 * 1024 * 1024;

export default function TextModal({
  open,
  onClose,
  onSubmitFile,
  onSubmitText,
  existingNames = [],
}) {
  const [tab, setTab] = useState('file');
  const [file, setFile] = useState(null);
  const [fileErr, setFileErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [textErr, setTextErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setFileErr('');
      setText('');
      setTitle('');
      setTextErr('');
      setTab('file');
      setDragging(false);
    }
  }, [open]);

  /* ── File helpers ── */
  const checkFile = (f) => {
    if (!f) return 'Selecciona un archivo';
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!EXTS.includes(ext)) return `Solo ${EXTS.join(', ')}`;
    if (f.size > MAX_SIZE) return 'Excede 20 MB';
    if (
      existingNames.some((n) => n.toLowerCase() === f.name.toLowerCase())
    )
      return 'Ya existe';
    return '';
  };

  const pickFile = (files) => {
    const f = files?.[0];
    if (!f) return;
    const err = checkFile(f);
    if (err) {
      setFileErr(err);
      setFile(null);
    } else {
      setFileErr('');
      setFile(f);
    }
  };

  const submitFile = async () => {
    if (!file) return;
    const err = checkFile(file);
    if (err) {
      setFileErr(err);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitFile(file);
      onClose();
    } catch {
      setFileErr('Error al subir');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Text helpers ── */
  const checkText = () => {
    if (text.trim().length < MIN_TEXT)
      return `Mínimo ${MIN_TEXT} caracteres`;
    if (!title.trim()) return 'Ingresa un título';
    if (
      existingNames.some(
        (n) => n.toLowerCase() === title.trim().toLowerCase()
      )
    )
      return 'Título duplicado';
    return '';
  };

  const submitText = async () => {
    const err = checkText();
    if (err) {
      setTextErr(err);
      return;
    }
    setSubmitting(true);
    setTextErr('');
    try {
      await onSubmitText(text.trim(), title.trim());
      onClose();
    } catch {
      setTextErr('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtSize = (b) =>
    b < 1024
      ? b + ' B'
      : b < 1048576
        ? (b / 1024).toFixed(1) + ' KB'
        : (b / 1048576).toFixed(1) + ' MB';

  const tabs = [
    { id: 'file', label: 'Archivo', icon: FaFileArrowUp },
    { id: 'text', label: 'Texto', icon: FaPenToSquare },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <M
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="j-modal-overlay"
            onClick={onClose}
          />

          {/* Modal container */}
          <div
            className="j-modal-wrap"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          >
            <div
              className="j-modal j-modal--lg"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Handle bar — mobile only */}
              <div className="flex justify-center mb-4 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-j-surface-3" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-j-accent-soft flex items-center justify-center">
                    <FaFileLines className="text-j-accent" size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-j-text">
                      Agregar documento
                    </h2>
                    <p className="text-[11px] text-j-text-3">
                      Archivo o texto plano
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-j-text-3 hover:text-j-text hover:bg-j-surface-2 transition-colors"
                >
                  <FaXmark size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-j-surface-2 rounded-2xl mb-5">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      setFileErr('');
                      setTextErr('');
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      tab === t.id
                        ? 'bg-j-surface-3 text-j-text shadow-sm'
                        : 'text-j-text-3 hover:text-j-text-2'
                    }`}
                  >
                    <t.icon size={12} /> {t.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: File ── */}
              {tab === 'file' && (
                <div className="animate-fade-in">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      pickFile(e.dataTransfer.files);
                    }}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                      dragging
                        ? 'border-j-accent/40 bg-j-accent-soft'
                        : file
                          ? 'border-j-green/30 bg-j-green-soft'
                          : 'border-j-border hover:border-j-border-light'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept={MIME}
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files)}
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <FaCheck className="text-j-green" size={20} />
                        <p className="text-sm font-medium text-j-text truncate max-w-[260px]">
                          {file.name}
                        </p>
                        <p className="text-xs text-j-text-3">
                          {fmtSize(file.size)}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="mt-1 text-[11px] text-j-red hover:underline flex items-center gap-1"
                        >
                          <FaTrash size={8} /> Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FaCloudArrowUp
                          className={`${dragging ? 'text-j-accent' : 'text-j-text-3'} transition-colors`}
                          size={28}
                        />
                        <p className="text-sm text-j-text-2">
                          Arrastra o{' '}
                          <span className="text-j-accent font-medium">
                            selecciona
                          </span>
                        </p>
                        <p className="text-[10px] text-j-text-3">
                          PDF, TXT, MD, DOCX — Máx 20 MB
                        </p>
                      </div>
                    )}
                  </div>

                  {fileErr && (
                    <p className="mt-2 text-xs text-j-red animate-fade-in">
                      {fileErr}
                    </p>
                  )}

                  <div className="flex gap-2.5 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="j-btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitFile}
                      disabled={submitting || !file}
                      className="j-btn-primary flex-1"
                    >
                      {submitting ? (
                        <>
                          <FaSpinner className="animate-spin" size={12} />{' '}
                          Subiendo…
                        </>
                      ) : (
                        'Subir archivo'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: Text ── */}
              {tab === 'text' && (
                <div className="animate-fade-in space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-j-text-2 mb-2">
                      Título del documento
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (textErr) setTextErr('');
                      }}
                      placeholder="Ej: FAQ de ventas"
                      disabled={submitting}
                      className="j-input text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-j-text-2 mb-2">
                      Contenido
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        if (textErr) setTextErr('');
                      }}
                      placeholder="Pega aquí el texto…"
                      disabled={submitting}
                      rows={5}
                      className="j-input resize-none text-base sm:text-sm"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span
                        className={`text-[10px] ${text.length > 0 && text.trim().length < MIN_TEXT ? 'text-j-amber' : 'text-j-text-3'}`}
                      >
                        Mín. {MIN_TEXT} caracteres
                      </span>
                      <span className="text-[10px] text-j-text-3">
                        {text.length}
                      </span>
                    </div>
                  </div>

                  {textErr && (
                    <p className="text-xs text-j-red animate-fade-in">
                      {textErr}
                    </p>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="j-btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={submitText}
                      disabled={
                        submitting ||
                        text.trim().length < MIN_TEXT ||
                        !title.trim()
                      }
                      className="j-btn-primary flex-1"
                    >
                      {submitting ? (
                        <>
                          <FaSpinner className="animate-spin" size={12} />{' '}
                          Guardando…
                        </>
                      ) : (
                        'Guardar texto'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
