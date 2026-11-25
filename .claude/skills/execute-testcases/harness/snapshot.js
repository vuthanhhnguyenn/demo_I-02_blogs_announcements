// A generic "read everything visible" probe for a shadcn/base-ui list screen
// (page header + count badge, tabs, search box, filter Selects, delete/include
// checkbox, filter-result banner, table rows with per-cell badge classes and
// row opacity, pagination summary + prev/next disabled state, empty state).
//
// Injected via an `evaluate` step. Returns a plain object you diff against a
// test case's Expected Result. Tune the selectors to the screen under test —
// this default matches the Y-04 terms list; most CRM list screens are close.
//
// Use it through helpers.snapshotStep(label) so the returned value is labelled.
() => {
  const txt = (el) => (el ? el.textContent.trim().replace(/\s+/g, ' ') : null);

  const h1 = document.querySelector('h1');
  const headerWrap = h1?.parentElement;
  const badgeEl = headerWrap ? Array.from(headerWrap.children).find((c) => c !== h1) : null;

  const newBtn = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent.includes('新規登録'),
  );

  const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((el) => ({
    text: txt(el),
    selected:
      el.getAttribute('aria-selected') === 'true' || el.getAttribute('data-state') === 'active',
  }));

  const searchInput = document.querySelector('input[placeholder*="検索"]');
  const combos = Array.from(document.querySelectorAll('[role="combobox"]'));

  const checkbox = Array.from(document.querySelectorAll('label')).find((l) =>
    l.textContent.includes('削除済みも含めて表示'),
  );
  const checkboxInput = checkbox
    ? checkbox.querySelector('[role="checkbox"], input[type=checkbox]')
    : null;

  const banner = Array.from(
    document.querySelectorAll('[role="alert"], .flex.items-center.justify-between'),
  ).find((el) => el.textContent.includes('を抽出中'));

  const rows = Array.from(document.querySelectorAll('table tbody tr')).map((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'));
    return {
      cells: tds.map((td) => txt(td)),
      badgeClasses: tds.map((td) => {
        const badge = td.querySelector('[class*="badge"], span.inline-flex, div.inline-flex');
        return badge ? badge.className : null;
      }),
      opacity: getComputedStyle(tr).opacity,
      className: tr.className,
    };
  });

  const headerCells = Array.from(document.querySelectorAll('table thead th')).map((th) => txt(th));
  const paginationSummary = Array.from(document.querySelectorAll('p')).find((p) =>
    p.textContent.includes('を表示'),
  );
  const prevBtn = Array.from(document.querySelectorAll('a,button')).find((b) => txt(b) === '前へ');
  const nextBtn = Array.from(document.querySelectorAll('a,button')).find((b) => txt(b) === '次へ');
  const pageSizeSelect =
    combos.find((c) => /^\d+件/.test(txt(c) || '')) ||
    Array.from(document.querySelectorAll('button, [role="combobox"]')).find((c) =>
      /^\d+件/.test(txt(c) || ''),
    );
  const emptyState = document.querySelector('.text-muted-foreground.text-sm.font-medium');

  return {
    title: txt(h1),
    badge: txt(badgeEl),
    newButton: newBtn
      ? { text: txt(newBtn), disabled: newBtn.disabled, className: newBtn.className }
      : null,
    tabs,
    searchValue: searchInput ? searchInput.value : null,
    brandSelectText: txt(combos[0]),
    brandSelectClass: combos[0] ? combos[0].className : null,
    statusSelectText: txt(combos[1]),
    statusSelectClass: combos[1] ? combos[1].className : null,
    checkboxChecked: checkboxInput
      ? checkboxInput.getAttribute('data-state') === 'checked' || checkboxInput.checked
      : null,
    bannerVisible: !!banner,
    bannerText: banner ? txt(banner) : null,
    headerCells,
    rows,
    rowCount: rows.length,
    paginationVisible: !!paginationSummary,
    paginationText: paginationSummary ? txt(paginationSummary) : null,
    pageSizeText: pageSizeSelect ? txt(pageSizeSelect) : null,
    prevDisabled: prevBtn ? prevBtn.className.includes('pointer-events-none') : null,
    nextDisabled: nextBtn ? nextBtn.className.includes('pointer-events-none') : null,
    emptyStateText: emptyState ? txt(emptyState) : null,
    url: location.href,
  };
};
