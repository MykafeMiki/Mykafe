"use client";

import { Languages, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface TranslatedNoteProps {
  note: string;
  className?: string;
  showOriginal?: boolean;
}

export function TranslatedNote({ note, className, showOriginal = true }: TranslatedNoteProps) {
  const { translated, isTranslating, needsTranslation } = useTranslation(note);

  if (isTranslating) {
    return (
      <p className={cn("text-sm text-orange-600 italic flex items-center gap-1", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Traducendo...</span>
      </p>
    );
  }

  // If translation was needed and we have a different result
  if (needsTranslation && translated !== note) {
    return (
      <div className={cn("text-sm", className)}>
        <p className="text-orange-600 font-medium flex items-center gap-1">
          <Languages className="w-3 h-3" />
          &quot;{translated}&quot;
        </p>
        {showOriginal && (
          <p className="text-gray-400 text-xs italic mt-0.5">(originale: &quot;{note}&quot;)</p>
        )}
      </div>
    );
  }

  // No translation needed, show original
  return <p className={cn("text-sm text-orange-600 italic", className)}>&quot;{note}&quot;</p>;
}
