import { missing } from "@/lib/not-found";
import { RESERVED_PAGES } from "@/lib/reserved-pages";
import { ArticleLayout, heroPhoto } from "@/components/article-layout";
import { categoryPath } from "@/components/journal-list";
import { JsonLd } from "@/components/json-ld";
import { getPage, getPages, getPost, getPosts, getRelatedPosts, getTaxonomies, getTripCards } from "@/lib/content";
import { articleLd, meta } from "@/lib/seo";
import type { Post, TripCard } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

/**
 * WordPress pages that have their own route in this app, or that were
 * plugin plumbing and now redirect (see next.config.ts).
 */
const RESERVED = RESERVED_PAGES;

// New pages published from the admin render on first visit, then stay cached.
export const dynamicParams = true;

export function generateStaticParams() {
  const pages = getPages().filter((p) => !RESERVED.has(p.slug)).map((p) => ({ slug: p.slug }));
  const posts = getPosts().map((p) => ({ slug: p.slug }));
  return [...pages, ...posts];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (post) {
    return meta({ path: `/${slug}/`, title: post.title, description: post.excerpt, seo: post.seo, image: post.cover, type: "article", published: post.published, modified: post.modified });
  }
  const page = getPage(slug);
  if (!page) return {};
  return meta({ path: `/${slug}/`, title: page.title, description: page.excerpt || page.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), seo: page.seo, image: page.cover });
}

/** Trips that a guide is most likely about, by the words in its title. */
function tripsFor(post: Post, trips: TripCard[]) {
  const words = post.title.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !["trek", "trekking", "nepal", "guide", "best", "time", "with", "from", "your", "what"].includes(w));
  return trips
    .map((t) => ({ t, s: words.filter((w) => t.title.toLowerCase().includes(w)).length + (t.price ? 0.5 : 0) }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  const cats = getTaxonomies().categories;
  const names = Object.fromEntries(cats.map((c) => [c.slug, c.name]));

  if (post) {
    const cat = post.categories[0];
    return (
      <>
        <ArticleLayout
          title={post.title}
          eyebrow={cat ? names[cat] : "Travel journal"}
          photo={heroPhoto(post.cover, slug)}
          crumbs={[
            { name: "Journal", path: "/blogs/" },
            ...(cat ? [{ name: names[cat] ?? cat, path: categoryPath(cat) }] : []),
            { name: post.title, path: `/${slug}/` },
          ]}
          html={post.html}
          toc={post.toc}
          path={`/${slug}/`}
          meta={{ author: post.author, date: formatDate(post.modified ?? post.published, { day: "numeric", month: "long", year: "numeric" }) ? `Updated ${formatDate(post.modified ?? post.published, { day: "numeric", month: "long", year: "numeric" })}` : undefined, minutes: post.readingMinutes }}
          trips={tripsFor(post, getTripCards())}
          related={getRelatedPosts(post, 3)}
          categoryNames={names}
        />
        <JsonLd data={articleLd(post)} />
      </>
    );
  }

  const page = getPage(slug);
  if (!page || RESERVED.has(slug)) missing(`/${slug}/`);
  return (
    <ArticleLayout
      title={page.title}
      eyebrow="Base Camp Adventure"
      photo={heroPhoto(page.cover, slug)}
      crumbs={[{ name: page.title, path: `/${slug}/` }]}
      html={page.html}
      toc={page.toc}
      path={`/${slug}/`}
      trips={getTripCards().filter((t) => t.price).slice(0, 2)}
    />
  );
}
