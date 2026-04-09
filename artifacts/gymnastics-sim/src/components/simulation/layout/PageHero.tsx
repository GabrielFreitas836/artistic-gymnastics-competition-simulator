import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeroProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
}

export function PageHero({
  icon,
  title,
  description,
  align = "left",
  action,
  className,
}: PageHeroProps) {
  const isCentered = align === "center";

  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-6",
        isCentered ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn(isCentered ? "max-w-3xl" : undefined)}>
        {icon && (
          <div
            className={cn(
              "mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient shadow-[0_0_30px_rgba(212,175,55,0.35)]",
              isCentered ? undefined : "text-slate-950",
            )}
          >
            {icon}
          </div>
        )}
        <h2 className="font-display text-4xl font-bold text-white text-glow">
          {title}
        </h2>
        {description && (
          <p className={cn("mt-2 text-slate-400", isCentered ? "mx-auto max-w-3xl" : "max-w-3xl")}>
            {description}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}
