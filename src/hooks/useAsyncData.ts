/* eslint-disable react-x/set-state-in-effect, react-x/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';
import type { DependencyList, Dispatch, SetStateAction } from 'react';
import { extractErrorMessage } from '../utils/errorUtils';

interface CacheEntry {
  timestamp: number;
  value: unknown;
}

const asyncDataCache = new Map<string, CacheEntry>();

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | null>>;
}

interface AsyncDataOptions {
  cacheKey?: string;
  cacheTtlMs?: number;
}

export const useAsyncData = <T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
  fallbackError?: string,
  options?: AsyncDataOptions,
): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = options?.cacheKey;
  const cacheTtlMs = options?.cacheTtlMs ?? 30_000;

  const getCachedValue = useCallback((): T | null => {
    if (!cacheKey) {
      return null;
    }

    const cached = asyncDataCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cacheTtlMs) {
      asyncDataCache.delete(cacheKey);
      return null;
    }

    return cached.value as T;
  }, [cacheKey, cacheTtlMs]);

  const cacheValue = useCallback((value: T) => {
    if (!cacheKey) {
      return;
    }

    asyncDataCache.set(cacheKey, {
      timestamp: Date.now(),
      value,
    });
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await loader(controller.signal);
      setData(result);
      cacheValue(result);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(extractErrorMessage(err, fallbackError));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cacheValue, fallbackError, loader]);

  useEffect(() => {
    const controller = new AbortController();
    const cachedValue = getCachedValue();

    if (cachedValue !== null) {
      setData(cachedValue);
      setLoading(false);
      setError(null);
      return () => controller.abort();
    }

    setLoading(true);
    setError(null);

    loader(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          cacheValue(result);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(extractErrorMessage(err, fallbackError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [...dependencies, cacheValue, getCachedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh, setData };
};
