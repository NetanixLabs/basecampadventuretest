/** Suggests the live page a missing address most likely meant (used for one-click redirects). */

const WORDS = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^\d+$/.test(w) && !["the", "and", "with", "for", "trip", "trek", "page", "html", "php", "www"].includes(w));

/** Two words match when they're the same or one typing mistake apart ("everst" ~ "everest"). */
function close(a: string, b: string) {
  if (a === b) return 1;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return 0;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const rest = (x: string, y: string) => x.slice(i + 1) === y.slice(i + 1) || x.slice(i + 1) === y.slice(i) || x.slice(i) === y.slice(i + 1);
  return rest(a, b) ? 0.9 : 0;
}

/** The live page whose address is most like the missing one, as a suggestion. */
export function suggester(pages: { path: string; title: string }[]) {
  const index = pages.map((p) => ({ ...p, words: [...new Set(WORDS(`${p.path} ${p.title}`))] }));
  return (missing: string) => {
    const want = [...new Set(WORDS(missing))];
    if (!want.length) return null;
    let best: { path: string; title: string; score: number } | null = null;
    for (const p of index) {
      const hit = want.reduce((n, w) => n + Math.max(0, ...p.words.map((x) => close(w, x))), 0);
      // Every missing word should be found; extra words on the page count against it a little.
      const score = hit / (want.length + Math.max(0, p.words.length - hit) * 0.15);
      if (hit && (!best || score > best.score)) best = { path: p.path, title: p.title, score };
    }
    return best && best.score >= 0.35 ? { path: best.path, title: best.title } : null;
  };
}
