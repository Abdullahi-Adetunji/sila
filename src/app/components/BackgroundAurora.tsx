// Decorative background used on the public landing page. Three radial
// gradient "blobs" pan at different speeds behind the content, plus a tiny
// SVG noise overlay to kill banding on the deep gradient. Everything is
// pure CSS + a data: URI, so it stays well inside our CSP
// (img-src 'self' data:). The actual animation and reduced-motion guards
// live in globals.css.
export function BackgroundAurora() {
  return (
    <div className="aurora" aria-hidden>
      <span />
      <div className="aurora-grain" />
    </div>
  );
}
