import { describe, expect, it } from 'vitest';

import { installFrameSmoothScroll } from './smooth-scroll';

describe('global smooth scroll', () => {
  it('installs one reduced-motion-aware style in an iframe document', () => {
    const frameDocument = document.implementation.createHTMLDocument('prototype');
    installFrameSmoothScroll(frameDocument);
    installFrameSmoothScroll(frameDocument);

    const styles = frameDocument.querySelectorAll('#platform-smooth-scroll');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toContain('scroll-behavior: var(--platform-scroll-behavior)');
    expect(styles[0].textContent).toContain('prefers-reduced-motion: reduce');
  });
});
