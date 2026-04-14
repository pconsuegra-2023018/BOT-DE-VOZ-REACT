import axios from 'axios';

const api = axios.create({
  baseURL: '/api/documents',
  timeout: 15000,
});

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

    const res = await api.post('/knowledge-base', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Backend devuelve { success, knowledgeBase: { id, name, status } }
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

    const res = await api.post('/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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