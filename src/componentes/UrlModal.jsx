import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGlobe, FaXmark, FaCheck, FaSpinner } from 'react-icons/fa6';

const M = motion.div;

const URL_RE =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export default function UrlModal({
  open,
  onClose,
  onSubmit,
  existingUrls = [],
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      setError('');
      setTimeout(() => ref.current?.focus(), 200);
    }
  }, [open]);

  const validate = (v) => {
    if (!v.trim()) return 'Ingresa una URL';
    if (!URL_RE.test(v.trim()))
      return 'Formato inválido — usa http:// o https://';
    if (
      existingUrls.some((u) => u.toLowerCase() === v.trim().toLowerCase())
    )
      return 'Esta URL ya existe';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(url);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(url.trim());
      setUrl('');
      onClose();
    } catch {
      setError('Error al agregar la URL');
    } finally {
      setSubmitting(false);
    }
  };

  const valid = url.trim() && !error && URL_RE.test(url.trim());

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
              className="j-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* Handle bar — mobile only */}
              <div className="flex justify-center mb-4 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-j-surface-3" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-j-blue-soft flex items-center justify-center">
                    <FaGlobe className="text-j-blue" size={16} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-j-text">
                      Agregar URL
                    </h2>
                    <p className="text-[11px] text-j-text-3">
                      Enlace web para la Knowledge Base
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

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <label className="block text-xs font-medium text-j-text-2 mb-2">
                  URL del sitio web
                </label>
                <input
                  ref={ref}
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="https://ejemplo.com/documento"
                  disabled={submitting}
                  className={`j-input text-base sm:text-sm ${error ? '!border-j-red/40 focus:!border-j-red/60' : ''}`}
                />

                {error && (
                  <p className="mt-2 text-xs text-j-red animate-fade-in">
                    {error}
                  </p>
                )}

                {valid && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-j-surface-2 border border-j-border animate-fade-in">
                    <FaGlobe
                      className="text-j-blue flex-shrink-0"
                      size={12}
                    />
                    <span className="text-xs text-j-text-2 truncate flex-1">
                      {url.trim()}
                    </span>
                    <FaCheck
                      className="text-j-green flex-shrink-0"
                      size={10}
                    />
                  </div>
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
                    type="submit"
                    disabled={submitting || !url.trim()}
                    className="j-btn-primary flex-1"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin" size={12} />{' '}
                        Agregando…
                      </>
                    ) : (
                      'Agregar URL'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
