// A "does the layout hold?" probe — the phase-2 UI focus: long values at the 1024px
// floor. Injected via an `evaluate` step (use helpers.layoutStep(label)).
//
// It measures geometry rather than eyeballing a screenshot, and reports:
//   viewport            — the width/height actually used (run at 1024x768 for the floor)
//   pageOverflow        — page-level horizontal scroll (a real defect at 1024px)
//   overflowingElements — elements wider than the viewport, with their text
//   offscreenControls   — buttons/links/inputs whose box falls outside the viewport
//   clippedText         — elements whose text is cut off (scrollWidth > clientWidth)
//                         together with whether a title/tooltip exposes the full value
//   overlaps            — pairs of visible controls whose boxes intersect
//
// Every entry carries a short text sample so a finding can be described in the
// report without opening the app's source.
() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const txt = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const all = Array.from(document.querySelectorAll('body *')).filter(visible);

  const overflowingElements = all
    .filter((el) => el.getBoundingClientRect().width > vw + 1)
    .slice(0, 15)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className?.toString().slice(0, 60),
      width: Math.round(el.getBoundingClientRect().width),
      text: txt(el),
    }));

  const controlSel =
    'button, a[href], input, select, textarea, [role="button"], [role="combobox"], [role="tab"]';
  const controls = all.filter((el) => el.matches(controlSel));

  const offscreenControls = controls
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(
      ({ r }) =>
        r.right > vw + 1 || r.left < -1 || r.bottom > document.documentElement.scrollHeight + 1,
    )
    .slice(0, 15)
    .map(({ el, r }) => ({
      tag: el.tagName.toLowerCase(),
      text: txt(el),
      left: Math.round(r.left),
      right: Math.round(r.right),
    }));

  const clippedText = all
    .filter((el) => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && txt(el))
    .slice(0, 20)
    .map((el) => ({
      text: txt(el),
      visibleWidth: el.clientWidth,
      fullWidth: el.scrollWidth,
      hasTooltip: Boolean(el.title || el.getAttribute('aria-label') || el.closest('[title]')),
      ellipsis: getComputedStyle(el).textOverflow === 'ellipsis',
    }));

  const boxes = controls.slice(0, 120).map((el) => ({ el, r: el.getBoundingClientRect() }));
  const overlaps = [];
  for (let i = 0; i < boxes.length && overlaps.length < 10; i++) {
    for (let j = i + 1; j < boxes.length && overlaps.length < 10; j++) {
      const a = boxes[i],
        b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const hit =
        a.r.left < b.r.right &&
        b.r.left < a.r.right &&
        a.r.top < b.r.bottom &&
        b.r.top < a.r.bottom;
      if (hit) overlaps.push({ a: txt(a.el), b: txt(b.el) });
    }
  }

  return {
    viewport: { width: vw, height: vh },
    pageOverflow: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: vw,
      horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    },
    overflowingElements,
    offscreenControls,
    clippedText,
    overlaps,
  };
};
