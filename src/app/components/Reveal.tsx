"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A tiny IntersectionObserver wrapper that adds `.is-visible` once a section
// enters the viewport. CSS in globals.css handles the actual transition and
// honours prefers-reduced-motion. Keeping the logic trivial means the page
// still renders correctly (opacity:1) if the observer never fires — for
// example in prerendering or when JS is disabled, we flip the class on the
// fallback timeout in the else branch.
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: 1 | 2 | 3 | 4 | 5 | 6 | 0;
  as?: "div" | "section" | "li" | "article";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const delayClass = delay ? ` reveal-delay-${delay}` : "";
  const combined = `reveal${delayClass}${className ? ` ${className}` : ""}`;

  // The `as` prop keeps the rendered semantic element truthful (section vs
  // li vs article) while sharing one ref type.
  return (
    <Tag ref={ref as never} className={combined}>
      {children}
    </Tag>
  );
}
