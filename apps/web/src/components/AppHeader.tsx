"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  brand: string;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  onBack?: () => void;
  backAriaLabel?: string;
  rightSlot?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  brandHref?: string;
  brandAriaLabel?: string;
}

export function AppHeader({
  brand,
  title,
  description,
  icon,
  onBack,
  backAriaLabel = "Back",
  rightSlot,
  className,
  contentClassName,
  titleClassName,
  descriptionClassName,
  brandHref = "/",
  brandAriaLabel,
}: AppHeaderProps) {
  const router = useRouter();
  const hasTitle = Boolean(title);

  const handleBrandClick = () => {
    router.push(brandHref);
  };

  return (
    <header className={cn("bg-primary-500 text-white p-4", className)}>
      <div
        className={cn(
          "flex items-center justify-between gap-4",
          contentClassName,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-8">
              <button
                type="button"
                onClick={handleBrandClick}
                aria-label={brandAriaLabel ?? brand}
                className="text-5xl font-bold leading-[0.9] cursor-pointer hover:opacity-90 transition"
              >
                {brand}
              </button>

              {onBack ? (
                <button
                  onClick={onBack}
                  type="button"
                  className="p-2 rounded-full text-white/90 hover:bg-white/15 transition"
                  aria-label={backAriaLabel}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-9 h-9 shrink-0" aria-hidden="true" />
              )}

              {(title || description || icon) && (
                <div className="flex min-w-0 items-center gap-2 pt-0.5">
                  {icon ? <div className="shrink-0">{icon}</div> : null}
                  <div className="min-w-0">
                    <h1
                      className={cn(
                        "text-xl font-bold leading-tight min-h-[1.75rem]",
                        titleClassName,
                      )}
                    >
                      {hasTitle ? title : <span className="invisible">.</span>}
                    </h1>
                    {description ? (
                      <p
                        className={cn(
                          "text-primary-100 text-sm mt-0.5 leading-tight",
                          descriptionClassName,
                        )}
                      >
                        {description}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
