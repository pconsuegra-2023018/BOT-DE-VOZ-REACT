import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api/documents',
  timeout: 120000, // 2 min — suficiente para archivos grandes
});

/* Retry helper — espera ms milisegundos */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta fn hasta MAX_RETRIES veces si Retell devuelve 429.
 * Entre cada intento espera RETRY_DELAY ms (se duplica con cada fallo).
 */
const MAX_RETRIES  = 4;
const RETRY_DELAY  = 4000; // 4 s base

/** Detecta si una respuesta exitosa de Axios contiene un 429 encubierto */
function is429Response(res) {
  const d = res?.data;
  if (!d) return false;
  const details = (d.details ?? d.message ?? d.error ?? '').toString().toLowerCase();
  return d.success === false && details.includes('429');
}

/** Detecta si un error de Axios es un 429 real o encubierto */
function is429Error(err) {
  const status  = err.response?.status;
  const details = (err.response?.data?.details ?? err.response?.data?.message ?? '').toString().toLowerCase();
  return status === 429 || details.includes('429');
}

async function withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fn();

      // Axios no lanzó error PERO el backend devolvió success:false con 429
      if (is429Response(res) && attempt < MAX_RETRIES - 1) {
        const wait = RETRY_DELAY * (attempt + 1);
        console.warn(`Retell 429 (body) — reintentando en ${wait / 1000}s (intento ${attempt + 1}/${MAX_RETRIES - 1})`);
        toast.loading(`Retell está ocupado, reintentando en ${wait / 1000}s…`, { id: 'retry-toast', duration: wait });
        await sleep(wait);
        lastErr = new Error(res.data?.details ?? 'Retell 429');
        continue;
      }

      return res;
    } catch (err) {
      if (is429Error(err) && attempt < MAX_RETRIES - 1) {
        const wait = RETRY_DELAY * (attempt + 1);
        console.warn(`Retell 429 (status) — reintentando en ${wait / 1000}s (intento ${attempt + 1}/${MAX_RETRIES - 1})`);
        toast.loading(`Retell está ocupado, reintentando en ${wait / 1000}s…`, { id: 'retry-toast', duration: wait });
        await sleep(wait);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Obtener todas las Knowledge Bases y sus sources.
 * GET /knowledge-bases
 */
export const getKnowledgeBases = async () => {
  try {
    const res = await api.get('/knowledge-bases');
    // Backend devuelve { success, count, knowledgeBases: [...] }
    const raw = res.data?.knowledgeBases ?? res.data?.data ?? res.data ?? [];
    const kbs = Array.isArray(raw) ? raw : [];
    return { data: kbs, error: false };
  } catch (err) {
    console.error('Error fetching knowledge bases:', err);
    return { data: null, error: true, message: err.message };
  }
};

/**
 * Obtener detalles (incluyendo sources) de una KB.
 * GET /knowledge-base/:id
 */
export const getKnowledgeBaseDetails = async (id) => {
  try {
    const res = await api.get(`/knowledge-base/${id}`);
    // Backend devuelve { success, knowledgeBase: { id, name, status, sources: [...] } }
    const kb = res.data?.knowledgeBase ?? res.data;
    return { data: kb, error: false };
  } catch (err) {
    console.error('Error fetching KB details:', err);
    return { data: null, error: true, message: err.message };
  }
};

/**
 * Crear una Knowledge Base vacía.
 * POST /knowledge-base
 */
/**
 * Crear una KB con su primera fuente (el back lo exige).
 * @param {string} name
 * @param {{ type: 'url'|'file'|'text', content: any, name: string }} source
 */
export const createKnowledgeBase = async (name, source) => {
  try {
    const formData = new FormData();
    formData.append('name', name);

    if (source.type === 'url') {
      formData.append('urls', source.content);
    } else if (source.type === 'text') {
      formData.append('texts', JSON.stringify([{ title: source.name, text: source.content }]));
    } else if (source.type === 'file') {
      formData.append('documents', source.content);
    }

    const res = await withRetry(() =>
      api.post('/knowledge-base', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    const kb = res.data?.knowledgeBase ?? res.data?.data ?? res.data;
    return { data: kb, error: false };
  } catch (err) {
    console.error('Error creating KB:', err.response?.data || err.message);
    return { data: null, error: true, message: err.message };
  }
};

/**
 * Eliminar una Knowledge Base.
 * DELETE /knowledge-base/:id
 */
export const deleteKnowledgeBase = async (kbId) => {
  try {
    const res = await api.delete(`/knowledge-base/${kbId}`);
    return { data: res.data, error: false };
  } catch (err) {
    console.error('Error deleting KB:', err);
    return { data: null, error: true, message: err.message };
  }
};

/**
 * Agregar un source a la Knowledge Base.
 * PUT /upload-multiple  —  envía FormData con knowledgeBaseId + payload
 *
 * @param {string} kbId  — ID de la KB
 * @param {{ type: 'url'|'file'|'text', content: string, name: string }} source
 */
export const addSource = async (kbId, source) => {
  try {
    const formData = new FormData();
    formData.append('knowledgeBaseId', kbId);

    if (source.type === 'file') {
      formData.append('documents', source.content);
    } else if (source.type === 'url') {
      formData.append('urls', source.content);
    } else if (source.type === 'text') {
      formData.append('texts', JSON.stringify([{ title: source.name, text: source.content }]));
    }

    const res = await withRetry(() =>
      api.post('/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    return { data: res.data, error: false };
  } catch (err) {
    console.error('Error adding source:', err.response?.data || err.message);
    return { data: null, error: true, message: err.message };
  }
};

/**
 * Eliminar un source individual (si el backend lo soporta).
 * De no existir endpoint, se delega a deleteKnowledgeBase como fallback.
 */
export const deleteSource = async (kbId, sourceId) => {
  try {
    const res = await api.delete(`/knowledge-base/${kbId}/source/${sourceId}`);
    return { data: res.data, error: false };
  } catch (err) {
    console.error('Error deleting source:', err);
    return { data: null, error: true, message: err.message };
  }
};