import { useState, useCallback, useRef, useEffect } from "react";

interface IpcState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type IpcFn<T> = (...args: any[]) => Promise<T>;

/**
 * Wrap an async IPC call with loading/error state.
 *
 * ```ts
 * const { data, loading, error, execute } = useIpc(listProjects);
 * useEffect(() => { execute(); }, []);
 * ```
 */
export function useIpc<T>(fn: IpcFn<T>) {
  const [state, setState] = useState<IpcState<T>>({ data: null, loading: false, error: null });
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const execute = useCallback(
    async (...args: Parameters<IpcFn<T>>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fn(...args);
        if (mounted.current) setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: any) {
        if (mounted.current) setState({ data: null, loading: false, error: err?.message ?? String(err) });
        return null;
      }
    },
    [fn],
  );

  return { ...state, execute };
}