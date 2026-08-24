import { clsx } from "clsx";
import { forwardRef, type HTMLAttributes } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={clsx("rounded-2xl border border-border bg-surface p-4 shadow-sm", className)} {...props} />;
});
