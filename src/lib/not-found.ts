import "server-only";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { findRedirect } from "@/lib/content";

/** "Not found", unless the admin has moved this address somewhere else. */
export function missing(pathname: string): never {
  const r = findRedirect(pathname);
  if (r) (r.permanent ? permanentRedirect : redirect)(r.to);
  notFound();
}
