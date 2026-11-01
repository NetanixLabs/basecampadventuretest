"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/admin/ui";

/** A submit button that shows it is working and can't be double-clicked. */
export function Submit({ children, pending: label = "Working…", variant = "primary", className, name, value }: { children: React.ReactNode; pending?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className} name={name} value={value}>
      {pending ? label : children}
    </Button>
  );
}
