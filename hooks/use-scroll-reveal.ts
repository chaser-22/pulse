import { useEffect } from 'react';

const REVEAL_SELECTOR = [
  '.screen-stack > section',
  '.screen-stack > .lower-grid',
  '.screen-stack > .members-toolbar',
  '.screen-stack > .table-card',
  '.screen-stack > .mobile-member-list',
  '.screen-stack > .risk-cards',
].join(',');

export function useScrollReveal(enabled: boolean, scopeKey: string) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.querySelector<HTMLElement>('.main-panel');
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const registered = new WeakSet<Element>();
    let frame = 0;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px',
    });

    const register = () => {
      root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element, index) => {
        if (registered.has(element)) return;
        registered.add(element);
        element.classList.add('scroll-reveal');
        element.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 45}ms`);

        if (reducedMotion) {
          element.classList.add('is-visible');
        } else {
          observer.observe(element);
        }
      });
    };

    register();

    const mutationObserver = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(register);
    });

    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [enabled, scopeKey]);
}
