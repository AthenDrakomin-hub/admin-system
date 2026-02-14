import { useEffect, useRef, useState } from 'react';

interface PollingOptions {
  interval?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: PollingOptions = {}
) {
  const { interval = 30000, enabled = true, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, enabled]);

  const refetch = () => fetchData();

  return { data, loading, error, refetch };
}
