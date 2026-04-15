import { useEffect, useState } from "react";

import { getMyAssessments } from "../lib/api";
import type { AnalysisResponse } from "../types/api";
import { useLocalAuth } from "./useLocalAuth";

const STORAGE_KEY = "nutriforge-history";
const CURRENT_KEY = "nutriforge-current-assessment";

export type HistoryRecord = {
  id: string;
  createdAt: string;
  result: AnalysisResponse;
};

export function useAssessmentHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const { user } = useLocalAuth();

  useEffect(() => {
    const access = localStorage.getItem("nutriforge-access-token");
    if (user && access) {
      void getMyAssessments(access)
        .then((remote) => {
          const mapped: HistoryRecord[] = remote.map((entry) => ({
            id: entry.id,
            createdAt: entry.created_at,
            result: entry.result,
          }));
          setRecords(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        })
        .catch(() => {
          // Fallback to local cache when API is unavailable.
        });
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      setRecords(JSON.parse(raw) as HistoryRecord[]);
    } catch {
      setRecords([]);
    }
  }, [user]);

  const saveRecord = (result: AnalysisResponse) => {
    setRecords((current) => {
      const next = [
        {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
          createdAt: new Date().toISOString(),
          result,
        },
        ...current,
      ].slice(0, 12);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(CURRENT_KEY, JSON.stringify(result));
      return next;
    });
  };

  const setCurrentRecord = (result: AnalysisResponse) => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(result));
  };

  const getCurrentRecord = () => {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      return raw ? (JSON.parse(raw) as AnalysisResponse) : null;
    } catch {
      return null;
    }
  };

  return { records, saveRecord, setCurrentRecord, getCurrentRecord };
}
