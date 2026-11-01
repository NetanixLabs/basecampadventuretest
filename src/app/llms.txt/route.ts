import { llmsIndex } from "@/lib/llms";

export const dynamic = "force-static";
// Rebuilt whenever the admin publishes, and at least once a day.
export const revalidate = 86400;

export function GET() {
  return new Response(llmsIndex(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
