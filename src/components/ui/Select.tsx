import { clsx } from "clsx";
import { forwardRef, type SelectHTMLAttributes } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
