'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WorkspaceContextValue {
  projectPath: string;
  setProjectPath: (path: string) => void;
  recentPaths: string[];
  addRecentPath: (path: string) => void;
  syncStatus: string | null;
  setSyncStatus: (msg: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const defaultContext: WorkspaceContextValue = {
  projectPath: '',
  setProjectPath: () => {},
  recentPaths: [],
  addRecentPath: () => {},
  syncStatus: null,
  setSyncStatus: () => {},
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) return defaultContext;
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projectPath, setProjectPath] = useState('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [syncStatus, setSyncStatusRaw] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('omniagent_recent_paths');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentPaths(parsed);
        if (parsed.length > 0) setProjectPath(parsed[0]);
      } catch {}
    }
  }, []);

  const addRecentPath = useCallback((path: string) => {
    setRecentPaths(prev => {
      const next = [path, ...prev.filter(p => p !== path)].slice(0, 5);
      localStorage.setItem('omniagent_recent_paths', JSON.stringify(next));
      return next;
    });
  }, []);

  const setSyncStatus = useCallback((msg: string | null) => {
    setSyncStatusRaw(msg);
    if (msg) {
      setTimeout(() => setSyncStatusRaw(null), 3000);
    }
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      projectPath, setProjectPath,
      recentPaths, addRecentPath,
      syncStatus, setSyncStatus,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
