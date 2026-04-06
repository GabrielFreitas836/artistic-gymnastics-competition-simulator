import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  width?: "medium" | "wide";
  className?: string;
}

const WIDTH_CLASS = {
  medium: "max-w-5xl",
  wide: "max-w-7xl",
} as const;

export function PageShell({
  children,
  width = "wide",
  className,
}: PageShellProps) {
  return (
    <div className={cn("mx-auto pb-24", WIDTH_CLASS[width], className)}>
      {children}
    </div>
  );
}
