// Loads data from a GET route when the page opens. Used by every page that shows API data.
// Returns { data, error, reload }; call reload() after a change to fetch fresh data.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      setData(await api.get(path));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload };
}
