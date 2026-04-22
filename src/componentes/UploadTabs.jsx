import { useState, useRef, useEffect } from 'react';
import {
  FaFileArrowUp, FaGlobe, FaPenToSquare,
  FaCloudArrowUp, FaCheck, FaTrash, FaPlus,
  FaXmark, FaSpinner, FaCircleExclamation,
} from 'react-icons/fa6';

const EXTS     = ['.pdf', '.txt', '.md', '.docx'];
const MIME     = 'application/pdf,text/plain,text/markdown,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE = 20 * 1024 * 1024;
const MIN_TEXT = 10;
const URL_RE   = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const fmtSize  = (b) => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

const TABS = [
  { id: 'file', label: 'Subir archivo',  Icon: FaFileArrowUp },
  { id: 'url',  label: 'Agregar URL',    Icon: FaGlobe },
  { id: 'text', label: 'Texto manual',   Icon: FaPenToSquare },
];

/* ════════════════════════════════════════════════
   UploadTabs
   Props:
     onSubmit(source)      — { type, content, name }
     disabled              — boolean (KB at max)
     availableSlots        — number
     existingUrls          — string[]
     existingNames         — string[]
════════════════════════════════════════════════ */
export default function UploadTabs({
  onSubmit,
  disabled = false,
  // eslint-disable-next-line no-unused-vars
  availableSlots = 10,
  existingUrls = [],
  existingNames = [],
  variant = 'default',
  extraAction = null,
}) {
  const isPremium = variant === 'premium';
  const [tab, setTab] = useState('file');

  /* ── File ── */
  const [file, setFile]       = useState(null);
  const [fileErr, setFileErr] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  /* ── URL ── */
  const [urlInput, setUrlInput] = useState('');
  const [urlErr, setUrlErr]     = useState('');
  const [urlQueue, setUrlQueue] = useState([]);
  const urlRef = useRef(null);

  /* ── Text ── */
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [textErr, setTextErr] = useState('');

  /* ── Shared ── */
  const [busy, setBusy] = useState(false);

  /* reset on tab change */
  useEffect(() => {
    setFile(null); setFileErr('');
    setUrlInput(''); setUrlErr(''); setUrlQueue([]);
    setTitle(''); setBody(''); setTextErr('');
    setBusy(false);
  }, [tab]);

  /* ── File helpers ── */
  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!EXTS.includes(ext)) return `Formato no soportado (${ext})`;
    if (f.size > MAX_SIZE) return 'El archivo excede 20 MB';
    if (existingNames.some(n => n.toLowerCase() === f.name.toLowerCase())) return 'Ya existe un archivo con ese nombre';
    return '';
  };
  const pickFile = (files) => {
    const f = files?.[0];
    if (!f) return;
    const err = validateFile(f);
    setFileErr(err);
    setFile(err ? null : f);
  };
  const submitFile = async () => {
    if (!file || fileErr) return;
    setBusy(true);
    try { await onSubmit({ type: 'file', content: file, name: file.name }); setFile(null); }
    catch { /* parent handles toast */ }
    finally { setBusy(false); }
  };

  /* ── URL helpers ── */
  const validateUrl = (v) => {
    if (!v.trim()) return 'Ingresa una URL';
    if (!URL_RE.test(v.trim())) return 'Formato inválido — usa https://…';
    if (existingUrls.some(u => u.toLowerCase() === v.trim().toLowerCase())) return 'Esta URL ya está en la KB';
    if (urlQueue.includes(v.trim())) return 'Ya está en la lista';
    return '';
  };
  const addUrl = () => {
    const err = validateUrl(urlInput);
    if (err) { setUrlErr(err); return; }
    setUrlQueue(p => [...p, urlInput.trim()]);
    setUrlInput(''); setUrlErr('');
    setTimeout(() => urlRef.current?.focus(), 50);
  };
  const submitUrls = async () => {
    if (!urlQueue.length) return;
    setBusy(true);
    try {
      for (const u of urlQueue) await onSubmit({ type: 'url', content: u, name: u });
      setUrlQueue([]);
    } catch { /* parent handles toast */ }
    finally { setBusy(false); }
  };

  /* ── Text helpers ── */
  const validateText = () => {
    if (!title.trim()) return 'Escribe un título';
    if (body.trim().length < MIN_TEXT) return `Mínimo ${MIN_TEXT} caracteres`;
    if (existingNames.some(n => n.toLowerCase() === title.trim().toLowerCase())) return 'Título duplicado';
    return '';
  };
  const submitText = async () => {
    const err = validateText();
    if (err) { setTextErr(err); return; }
    setBusy(true);
    setTextErr('');
    try { await onSubmit({ type: 'text', content: body.trim(), name: title.trim() }); setTitle(''); setBody(''); }
    catch { /* parent handles toast */ }
    finally { setBusy(false); }
  };

  return (
    <div>
      {/* Tab bar */}
      {isPremium ? (
        <div className="upload-tab-strip">
          {TABS.map(({ id, label, Icon: TI }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              disabled={busy}
              className={`upload-tab-pill ${tab === id ? 'upload-tab-pill--active' : ''}`}
            >
              <TI size={18} strokeWidth={1} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
          {TABS.map(({ id, label, Icon: TabIcon }) => {
            const TI = TabIcon;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                disabled={busy}
                className={`upload-tab-btn ${tab === id ? 'upload-tab-btn--active' : ''}`}
              >
                <TI size={12} />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ════ TAB: FILE ════ */}
      {tab === 'file' && (
        <div className="space-y-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            className={isPremium
              ? `drop-zone-min ${dragging ? 'drop-zone-min--active' : file ? 'drop-zone-min--filled' : ''}`
              : `dropzone-area ${dragging ? 'dropzone-area--active' : file ? 'dropzone-area--filled' : ''}`}
          >
            <input ref={fileRef} type="file" accept={MIME} className="hidden" onChange={e => pickFile(e.target.files)} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <FaCheck size={15} className="text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-white/80 truncate max-w-[280px]">{file.name}</p>
                <p className="text-xs text-white/35">{fmtSize(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setFileErr(''); }}
                  className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1 mt-1 transition-colors"
                >
                  <FaTrash size={9} /> Quitar
                </button>
              </div>
            ) : isPremium ? (
              <>
                <FaCloudArrowUp size={36} className={`${dragging ? 'text-cyan-300' : 'text-white/25'} transition-colors`} strokeWidth={1} />
                <p>Seleccione o arrastre archivo</p>
                <p style={{ fontSize: '9.5px', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.25)' }}>PDF · TXT · MD · DOCX — Máx 20 MB</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FaCloudArrowUp size={32} className={`${dragging ? 'text-indigo-400' : 'text-white/20'} transition-colors`} />
                <p className="text-sm text-white/50">
                  Arrastra aquí o <span className="text-indigo-400 font-medium cursor-pointer">selecciona un archivo</span>
                </p>
                <p className="text-xs text-white/25">PDF · TXT · MD · DOCX — Máx 20 MB</p>
              </div>
            )}
          </div>
          {fileErr && <p className="text-[12.5px] text-red-400 flex items-center gap-1.5"><FaCircleExclamation size={11} />{fileErr}</p>}
          {isPremium ? (
            <div className="action-row">
              <button
                onClick={submitFile}
                disabled={busy || !file || !!fileErr || disabled}
                className="btn-pill btn-pill--primary"
              >
                {busy ? <><FaSpinner className="animate-spin" size={11} /> Subiendo…</> : <><FaFileArrowUp size={12} /> Subir archivo</>}
              </button>
              {extraAction}
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={submitFile}
                disabled={busy || !file || !!fileErr || disabled}
                className="btn-primary"
              >
                {busy ? <><FaSpinner className="animate-spin" size={12} /> Subiendo…</> : 'Subir archivo'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════ TAB: URL ════ */}
      {tab === 'url' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="field-label">URL del sitio web</label>
            <div className="flex gap-2">
              <input
                ref={urlRef}
                type="url"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                placeholder="https://ejemplo.com/pagina"
                disabled={busy}
                className="field-input flex-1"
              />
              <button
                type="button"
                onClick={addUrl}
                disabled={busy || !urlInput.trim()}
                className="w-10 h-10 rounded-lg bg-white/6 border border-white/8 text-white/40 hover:text-indigo-400 hover:border-indigo-500/30 disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0"
                title="Agregar a la lista"
              >
                <FaPlus size={13} />
              </button>
            </div>
            {urlErr && <p className="text-[12.5px] text-red-400 flex items-center gap-1.5"><FaCircleExclamation size={11} />{urlErr}</p>}
            <p className="text-[11px] text-white/25">Presiona Enter o + para agregar varias URLs antes de enviar</p>
          </div>

          {urlQueue.length > 0 && (
            <div className="space-y-2">
              <p className="field-label">Cola de envío ({urlQueue.length})</p>
              {urlQueue.map((u) => (
                <div key={u} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-sky-400/6 border border-sky-400/15">
                  <FaGlobe size={12} className="text-sky-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-[13px] text-white/70">{u}</span>
                  <button type="button" onClick={() => setUrlQueue(p => p.filter(x => x !== u))} className="text-white/25 hover:text-red-400 transition-colors">
                    <FaXmark size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={isPremium ? 'action-row' : 'flex justify-end'}>
            <button
              onClick={submitUrls}
              disabled={busy || !urlQueue.length || disabled}
              className={isPremium ? 'btn-pill btn-pill--primary' : 'btn-primary'}
            >
              {busy
                ? <><FaSpinner className="animate-spin" size={12} /> Enviando…</>
                : `Agregar ${urlQueue.length > 1 ? `${urlQueue.length} URLs` : 'URL'}`
              }
            </button>
            {isPremium && extraAction}
          </div>
        </div>
      )}

      {/* ════ TAB: TEXT ════ */}
      {tab === 'text' && (
        <div className="space-y-5">
          <div>
            <label className="field-label">Título del fragmento</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTextErr(''); }}
              placeholder="Ej: FAQ de precios"
              disabled={busy}
              className="field-input w-full mt-1.5"
            />
          </div>
          <div>
            <label className="field-label">Contenido</label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setTextErr(''); }}
              placeholder="Escribe o pega aquí el texto que deseas que Juanita conozca…"
              disabled={busy}
              rows={6}
              className="field-input w-full mt-1.5 resize-none leading-relaxed"
            />
            <div className="flex justify-between mt-1.5">
              <span className={`text-[11px] ${body.length > 0 && body.trim().length < MIN_TEXT ? 'text-amber-400' : 'text-white/25'}`}>
                Mínimo {MIN_TEXT} caracteres
              </span>
              <span className="text-[11px] text-white/25">{body.length}</span>
            </div>
          </div>
          {textErr && <p className="text-[12.5px] text-red-400 flex items-center gap-1.5"><FaCircleExclamation size={11} />{textErr}</p>}
          <div className={isPremium ? 'action-row' : 'flex justify-end'}>
            <button
              onClick={submitText}
              disabled={busy || body.trim().length < MIN_TEXT || !title.trim() || disabled}
              className={isPremium ? 'btn-pill btn-pill--primary' : 'btn-primary'}
            >
              {busy ? <><FaSpinner className="animate-spin" size={12} /> Guardando…</> : 'Guardar texto'}
            </button>
            {isPremium && extraAction}
          </div>
        </div>
      )}
    </div>
  );
}
