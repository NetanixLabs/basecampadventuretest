import { cn } from "@/lib/utils";

/**
 * The Base Camp Adventure logo on a traveller's video: tucked into the
 * bottom-right corner, low opacity, with a faint corner shade so it still
 * reads on snow and sky. It never blocks taps or the video's controls.
 */
export function VideoMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const width = size === "sm" ? "w-[19%] max-w-12" : size === "lg" ? "w-[15%] max-w-20" : "w-[17%] max-w-16";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 z-[1] select-none", className)}>
      <span className="absolute right-0 bottom-0 size-1/2 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.28),transparent_70%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/watermark.svg" alt="" width={140} height={84} draggable={false} className={cn("absolute right-[5%] bottom-[4%] h-auto opacity-55", width)} />
    </span>
  );
}
