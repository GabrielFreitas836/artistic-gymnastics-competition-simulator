import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GlassSectionProps {
  children: ReactNode;
  className?: string;
}

export function GlassSection({ children, className }: GlassSectionProps) {
  return (
    <section className={cn("glass-panel rounded-3xl border border-white/10 p-6", className)}>
      {children}
    </section>
  );
}
