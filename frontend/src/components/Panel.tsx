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
      className={`rounded-2xl border border-[#E5E7EB] bg-white p-5 transition duration-200 hover:shadow-md ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{title}</p>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-[#6B7280]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}
