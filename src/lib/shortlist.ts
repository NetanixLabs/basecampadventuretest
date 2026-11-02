"use client";

import { useSyncExternalStore } from "react";

/** Saved trips (hearts) and the compare list, kept in this browser only. */
export type ListName = "saved" | "compare";
const KEYS: Record<ListName, string> = { saved: "bca_saved", compare: "bca_compare" };
export const COMPARE_MAX = 3;
const EVENT = "bca-shortlist";
const EMPTY: string[] = [];
const cache: Partial<Record<ListName, { raw: string | null; list: string[] }>> = {};

function read(name: ListName): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEYS[name]); } catch {}
  const c = cache[name];
  if (c && c.raw === raw) return c.list;
  let list: string[] = EMPTY;
  try { const v = JSON.parse(raw ?? "[]"); if (Array.isArray(v)) list = v.filter((x) => typeof x === "string" && /^[a-z0-9-]{1,120}$/.test(x)).slice(0, 50); } catch {}
  cache[name] = { raw, list };
  return list;
}

function write(name: ListName, list: string[]) {
  try { localStorage.setItem(KEYS[name], JSON.stringify(list)); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useList(name: ListName) {
  return useSyncExternalStore(subscribe, () => read(name), () => EMPTY);
}

/** Adds or removes; returns false when the compare list is already full. */
export function toggle(name: ListName, slug: string): boolean {
  const list = read(name);
  if (list.includes(slug)) { write(name, list.filter((s) => s !== slug)); return true; }
  if (name === "compare" && list.length >= COMPARE_MAX) return false;
  write(name, [...list, slug]);
  return true;
}

export const setList = (name: ListName, list: string[]) => write(name, list);
