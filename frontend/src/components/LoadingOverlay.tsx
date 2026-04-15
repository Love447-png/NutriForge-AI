import { AnimatePresence, motion } from "framer-motion";

export function LoadingOverlay({ open, message = "Analyzing your child's growth..." }: { open: boolean; message?: string }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/45 px-4 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98, y: 8 }}
            className="w-full max-w-lg rounded-[34px] border border-white/25 bg-white/85 p-8 text-center shadow-[0_30px_120px_rgba(7,35,20,0.28)]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 via-mint to-ocean"
            >
              <div className="h-8 w-8 rounded-full bg-white/90" />
            </motion.div>
            <p className="font-display text-3xl font-bold text-ink">{message}</p>
            <p className="mt-3 text-base leading-7 text-slate-600">
              NutriForge is combining growth screening, local nutrition knowledge, and visual signals into a guided care plan.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
