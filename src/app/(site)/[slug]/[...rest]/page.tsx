import { missing } from "@/lib/not-found";

/**
 * Any deeper address that no page answers, e.g. /2019/05/old-post/ from an
 * old link on another website. A redirect made in the admin (Redirects, or
 * Backlinks & broken links) forwards it; otherwise it's "not found". Real
 * pages always win: this only runs when nothing else matches.
 */
export default async function Deeper({ params }: { params: Promise<{ slug: string; rest: string[] }> }) {
  const { slug, rest } = await params;
  const plain = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  missing(`/${[slug, ...rest].map(plain).join("/")}/`);
}
