"use client";

import { LazyMotion } from "framer-motion";

const features = () => import("@/components/motion-features").then((m) => m.default);

/**
 * The site's animations use the lightweight `m` components; the animation
 * engine itself downloads in the background, so phones can show and use the
 * page first. Anything animated simply appears in place until it's ready.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={features}>{children}</LazyMotion>;
}
