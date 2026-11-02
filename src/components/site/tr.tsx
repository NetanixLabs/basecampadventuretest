"use client";

import { usePathname } from "next/navigation";
import { langOfPath, word } from "@/lib/chrome-words";

/** English text that switches to German, French or Spanish on /de/, /fr/ and /es/ pages. */
export function Tr({ children, vars }: { children: string; vars?: Record<string, string | number> }) {
  return <>{word(langOfPath(usePathname()), children, vars)}</>;
}

export const useChromeLang = () => langOfPath(usePathname());
