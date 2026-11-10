// Inline SVG icon set used across the landing page and the signed-in
// dashboards. Keeping them inline means no external fetches and a clean
// CSP (img-src 'self' data:). Every icon sizes with font-size (1em) so a
// parent can scale it via Tailwind's text-* classes.

type IconProps = {
  className?: string;
  // Width + height both default to 1em so the icon tracks the parent font
  // size. Pass a Tailwind text-* class on the parent to size it.
  size?: number | string;
  strokeWidth?: number;
};

const common = (p: IconProps) => ({
  width: p.size ?? "1em",
  height: p.size ?? "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  "aria-hidden": true,
});

export function IconShield(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3z" />
      <path d="M9.5 12.5l1.8 1.8L15 10.5" />
    </svg>
  );
}

export function IconLock(p: IconProps) {
  return (
    <svg {...common(p)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <svg {...common(p)}>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3.5 19c.5-3 3-4.5 5.5-4.5s5 1.5 5.5 4.5" />
      <path d="M15 14.5c2 .3 4 1.6 5 3.5" />
    </svg>
  );
}

export function IconHandshake(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M3 13l4-4 3 2 3-3 4 4-3 3-2-2-4 4-3-2-2-2z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function IconEye(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function IconScroll(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M5 4h11a3 3 0 0 1 3 3v12a1 1 0 0 1-1 1H8a3 3 0 0 1-3-3V4z" />
      <path d="M9 8h7M9 12h7M9 16h4" />
    </svg>
  );
}

export function IconStethoscope(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M10 13v3a4 4 0 0 0 8 0v-1" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}

export function IconSparkle(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M20 12H4M10 18l-6-6 6-6" />
    </svg>
  );
}

export function IconEyeOff(p: IconProps) {
  return (
    <svg {...common(p)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8" />
      <path d="M9.5 6.1A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-3.3 3.9" />
      <path d="M6.1 7.4A16.7 16.7 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.9 9.9 0 0 0 3.5-.6" />
    </svg>
  );
}

export function IconHelix(p: IconProps) {
  // Compact DNA-like glyph. Two sine strokes crossed by three rungs.
  return (
    <svg {...common(p)}>
      <path d="M6 3c4 3 8 5 12 9" />
      <path d="M6 21c4-3 8-5 12-9" />
      <path d="M8 8h8M10 12h4M8 16h8" />
    </svg>
  );
}
