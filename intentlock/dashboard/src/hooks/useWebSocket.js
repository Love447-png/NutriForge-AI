import { useEffect, useMemo, useRef, useState } from "react";

import { log } from "../lib/logger";

const READY_STATE = {
  0: "CONNECTING",
  1: "CONNECTED",
  2: "DISCONNECTING",
  3: "DISCONNECTED"
};

export function useWebSocket(url) {
  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const queueRef = useRef([]);
  const [status, setStatus] = useState("CONNECTING");
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    let reconnectTimeout;

    const connect = () => {
      if (!active) return;
      const socket = new WebSocket(url);
      socketRef.current = socket;
      setStatus("CONNECTING");

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus("CONNECTED");
        log("info", "websocket connected", { url });
      };

      socket.onmessage = event => {
        const payload = JSON.parse(event.data);
        queueRef.current.push(payload);
        setEvents(current => {
          const next = [...current, ...queueRef.current];
          queueRef.current = [];
          return next.slice(-200);
        });
      };

      socket.onerror = error => {
        log("error", "websocket error", { message: error?.message ?? "unknown" });
      };

      socket.onclose = () => {
        setStatus("DISCONNECTED");
        if (reconnectAttemptRef.current >= 5) return;
        const timeout = Math.min(1000 * 2 ** reconnectAttemptRef.current, 10000);
        reconnectAttemptRef.current += 1;
        reconnectTimeout = window.setTimeout(connect, timeout);
      };
    };

    connect();

    return () => {
      active = false;
      window.clearTimeout(reconnectTimeout);
      socketRef.current?.close();
    };
  }, [url]);

  return useMemo(
    () => ({
      status,
      events,
      clearEvents: () => setEvents([]),
      readyState: READY_STATE[socketRef.current?.readyState ?? 3] ?? "DISCONNECTED"
    }),
    [events, status]
  );
}

