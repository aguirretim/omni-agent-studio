'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useWorkspace } from './WorkspaceProvider';

export default function StatusToast() {
  const { syncStatus } = useWorkspace();

  return (
    <AnimatePresence mode="wait">
      {syncStatus && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-300"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
          {syncStatus}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
