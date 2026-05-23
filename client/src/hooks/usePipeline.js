import { useCallback, useEffect, useMemo, useState } from 'react';
import { listMarinas, fetchMarinaStats, updateMarina } from '../utils/api';

const EMPTY_FILTERS = {
  q: '',
  stage: '',
  state: '',
  region: '',
  operator_type: '',
  min_slips: '',
  min_score: 0,
  sort: 'fit_score',
  dir: 'desc'
};

export function usePipeline() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [data, setData] = useState({ total: 0, results: [] });
  const [stats, setStats] = useState({ stages: [], totals: { total: 0, reviewed: 0, interested: 0 } });
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => ({
    ...filters,
    limit: pageSize,
    offset: page * pageSize
  }), [filters, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMarinas(params)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => console.error('Pipeline load failed:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params, refreshKey]);

  useEffect(() => {
    fetchMarinaStats().then(setStats).catch(e => console.error('Stats failed:', e));
  }, [refreshKey]);

  const updateFilter = useCallback((patch) => {
    setFilters(f => ({ ...f, ...patch }));
    setPage(0);
  }, []);

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const setStage = useCallback(async (id, stage) => {
    setData(d => ({ ...d, results: d.results.map(r => r.id === id ? { ...r, stage, stage_changed_at: new Date().toISOString() } : r) }));
    try {
      const fresh = await updateMarina(id, { stage });
      setData(d => ({ ...d, results: d.results.map(r => r.id === id ? fresh : r) }));
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error('Stage update failed:', e);
      setRefreshKey(k => k + 1);
    }
  }, []);

  return {
    filters, updateFilter, reset,
    page, setPage, pageSize, setPageSize,
    data, stats, loading,
    setStage,
    refresh: () => setRefreshKey(k => k + 1)
  };
}
