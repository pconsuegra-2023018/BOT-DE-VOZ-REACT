import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTrash,
  FaGlobe,
  FaFilePdf,
  FaFileLines,
  FaSpinner,
  FaCircleCheck,
  FaCircleExclamation,
} from 'react-icons/fa6';

const M = motion.div;

/* ─── Type configs ─── */

const TYPE_CONFIG = {
  url: {
    icon: FaGlobe,
    label: 'URL',
    color: 'text-j-blue',
    bg: 'bg-j-blue-soft',
    border: 'border-j-blue/20',
  },
  file: {
    icon: FaFilePdf,
    label: 'Archivo',
    color: 'text-j-rose',
    bg: 'bg-j-rose-soft',
    border: 'border-j-rose/20',
  },
  text: {
    icon: FaFileLines,
    label: 'Texto',
    color: 'text-j-accent',
    bg: 'bg-j-accent-soft',
    border: 'border-j-accent/20',
  },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.text;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'ready' || status === 'listo') {
    return (
      <span className="inline-flex items-center gap-1 text-j-green text-[11px]">
        <FaCircleCheck size={10} /> Listo
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-j-red text-[11px]">
        <FaCircleExclamation size={10} /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-j-amber text-[11px]">
      <FaSpinner size={10} className="animate-spin" /> Procesando
    </span>
  );
}

/* ─── Component ─── */

export default function DocumentList({ documents, onDelete, isDeleting }) {
  const [confirmId, setConfirmId] = useState(null);

  const handleDelete = (id) => {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(
        () => setConfirmId((prev) => (prev === id ? null : prev)),
        3000
      );
    }
  };

  if (!documents || documents.length === 0) return null;

  return (
    <div className="space-y-2 sm:space-y-2.5">
      <AnimatePresence mode="popLayout">
        {documents.map((doc, i) => {
          const id =
            doc.knowledge_base_source_id || doc._id || doc.id || `doc-${i}`;
          const name =
            doc.source_name ||
            doc.name ||
            doc.filename ||
            doc.url ||
            'Sin nombre';
          const type = doc.source_type || doc.type || 'file';
          const status = doc.status || doc.state || 'processing';
          const busy = isDeleting === id;
          const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.text;
          const Icon = cfg.icon;

          return (
            <M
              key={id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, scale: 0.96 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className={`j-card j-card-hover group ${busy ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className="flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-4 sm:py-3.5">
                {/* Icon circle */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={cfg.color} size={15} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] sm:text-[14px] text-j-text font-medium truncate"
                    title={name}
                  >
                    {name}
                  </p>
                  <div className="flex items-center gap-2 sm:gap-2.5 mt-1">
                    <TypeBadge type={type} />
                    <StatusBadge status={status} />
                  </div>
                </div>

                {/* Delete — always visible on mobile, hover on desktop */}
                <button
                  onClick={() => handleDelete(id)}
                  disabled={busy}
                  title={
                    confirmId === id ? 'Confirmar eliminación' : 'Eliminar'
                  }
                  className={`j-doc-delete p-2.5 rounded-xl transition-all duration-150 flex-shrink-0 ${
                    confirmId === id
                      ? 'bg-j-red-soft text-j-red ring-1 ring-j-red/30 !opacity-100'
                      : 'text-j-text-3 hover:text-j-red hover:bg-j-red-soft'
                  } disabled:opacity-30`}
                >
                  {busy ? (
                    <FaSpinner size={13} className="animate-spin" />
                  ) : (
                    <FaTrash size={12} />
                  )}
                </button>
              </div>

              {/* Confirm bar (mobile-friendly) */}
              <AnimatePresence>
                {confirmId === id && (
                  <M
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 sm:px-4 sm:pb-3.5">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-j-red-soft border border-j-red/10">
                        <span className="text-[11px] sm:text-xs text-j-red flex-1">
                          ¿Eliminar este documento? Toca de nuevo para
                          confirmar.
                        </span>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[11px] text-j-text-3 hover:text-j-text px-2 py-1 rounded-lg hover:bg-j-surface-2 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </M>
                )}
              </AnimatePresence>
            </M>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
