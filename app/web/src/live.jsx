import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const LiveContext = createContext(0);

/** Escucha cambios del backend por SSE y dispara un "tick" para refrescar datos. */
export function LiveProvider({ children }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer;
    const es = new EventSource("/api/events");
    es.onmessage = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 120);
    };
    return () => { clearTimeout(timer); es.close(); };
  }, []);
  return <LiveContext.Provider value={tick}>{children}</LiveContext.Provider>;
}

export function useFetch(url) {
  const tick = useContext(LiveContext);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    api.get(url)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => { alive = false; };
  }, [url, tick]);
  return state;
}
