import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getKnowledgeBases } from '../services/api';
import toast from 'react-hot-toast';

const KBContext = createContext(null);

export function KBProvider({ children }) {
  const [kbList, setKbList]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const res = await getKnowledgeBases();
    if (!res.error) {
      setKbList(Array.isArray(res.data) ? res.data : []);
    } else {
      toast.error('Error al cargar Knowledge Bases');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  return (
    <KBContext.Provider value={{ kbList, loading, refreshing, fetchList }}>
      {children}
    </KBContext.Provider>
  );
}

export const useKB = () => useContext(KBContext);
