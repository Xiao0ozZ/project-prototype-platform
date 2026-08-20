const STYLE_ID = 'platform-smooth-scroll';

const FRAME_SMOOTH_SCROLL_CSS = `
:root { --platform-scroll-behavior: smooth; }
html, body, body * { scroll-behavior: var(--platform-scroll-behavior); }
@media (prefers-reduced-motion: reduce) {
  :root { --platform-scroll-behavior: auto; }
}
`;

export function installFrameSmoothScroll(frameDocument: Document) {
  let style = frameDocument.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = frameDocument.createElement('style');
    style.id = STYLE_ID;
    frameDocument.head?.append(style);
  }
  style.textContent = FRAME_SMOOTH_SCROLL_CSS;
}
