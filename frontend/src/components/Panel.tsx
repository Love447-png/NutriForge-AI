import type { PropsWithChildren, ReactNode } from "react";
import { motion } from "framer-motion";

type PanelProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}>;

export function Panel({ title, subtitle, action, className = "", children }: PanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`rounded-[30px] border border-[#eadfce] bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(246,239,229,0.92))] p-5 shadow-[0_22px_60px_rgba(77,58,31,0.08)] backdrop-blur-xl ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-[#6d675f]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}
