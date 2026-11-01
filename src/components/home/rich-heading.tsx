import { Fragment } from "react";
import { Accent } from "@/components/section-heading";
import { headingParts } from "@/lib/home-copy";

/** Heading lines for SectionHeading, from the office's text. */
export function headingLines(text: string) {
  return headingParts(text).map((parts, i) => (
    <span key={i}>
      {parts.map((p, j) => (p.accent ? <Accent key={j}>{p.text}</Accent> : <Fragment key={j}>{p.text}</Fragment>))}
    </span>
  ));
}
