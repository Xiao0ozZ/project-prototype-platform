const LAST_PAGE_KEY = 'html-prototype-shell:last-page';
const PRD_POSITION_KEY = 'html-prototype-shell:prd-position';
const PRD_DOCUMENT_KEY_PREFIX = 'html-prototype-shell:prd-document:';
const DEFAULT_BRANDING = {
  name: 'RIMO Rental',
  subtitle: '原型工作台',
  themeColor: '#0879B0',
};
const DEFAULT_MENU = {
  groupByFolder: true,
  labelSource: 'title',
  compactTitle: true,
};

function readLocalValue(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeLocalValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Local storage is optional; navigation still works for the current session.
  }
}

const state = {
  pages: [],
  docs: [],
  bindings: [],
  branding: { ...DEFAULT_BRANDING },
  menu: { ...DEFAULT_MENU },
  folderFilter: '',
  currentPage: null,
  currentBinding: null,
  currentBindings: [],
  prototypeLocation: { search: '', hash: '' },
  isRefreshing: false,
  rawPrototype: false,
  collapsedPages: false,
  prdOpen: false,
  prdMode: 'split',
  prdDocumentMenuOpen: false,
  prdScrollPositions: new Map(),
  outlineVisible: false,
  searchMatches: [],
  searchMatchIndex: 0,
  overlayPosition: { x: 0, y: 0 },
  isDragging: false,
};

const elements = {
  shell: document.querySelector('#shell'),
  brandMark: document.querySelector('#brandMark'),
  brandName: document.querySelector('#brandName'),
  brandSubtitle: document.querySelector('#brandSubtitle'),
  pageTree: document.querySelector('#pageTree'),
  folderFilter: document.querySelector('#folderFilter'),
  pageSearch: document.querySelector('#pageSearch'),
  pageCount: document.querySelector('#pageCount'),
  currentFolder: document.querySelector('#currentFolder'),
  currentTitle: document.querySelector('#currentTitle'),
  currentPath: document.querySelector('#currentPath'),
  frame: document.querySelector('#prototypeFrame'),
  frameWrap: document.querySelector('.frame-wrap'),
  frameLoading: document.querySelector('#frameLoading'),
  emptyStage: document.querySelector('#emptyStage'),
  refreshButton: document.querySelector('#refreshButton'),
  togglePagesButton: document.querySelector('#togglePagesButton'),
  togglePrdButton: document.querySelector('#togglePrdButton'),
  prdToggleLabel: document.querySelector('#prdToggleLabel'),
  closePrdButton: document.querySelector('#closePrdButton'),
  prdPanel: document.querySelector('#prdPanel'),
  prdHeading: document.querySelector('.prd-heading'),
  prdToolbar: document.querySelector('.prd-toolbar'),
  prdSearchbar: document.querySelector('.prd-searchbar'),
  workspace: document.querySelector('.workspace'),
  prdPanelTitle: document.querySelector('#prdPanelTitle'),
  prdDocumentSwitcher: document.querySelector('#prdDocumentSwitcher'),
  prdDocumentTrigger: document.querySelector('#prdDocumentTrigger'),
  prdDocumentPosition: document.querySelector('#prdDocumentPosition'),
  prdDocumentChevron: document.querySelector('#prdDocumentChevron'),
  prdDocumentMenu: document.querySelector('#prdDocumentMenu'),
  prdReader: document.querySelector('#prdReader'),
  prdOutline: document.querySelector('#prdOutline'),
  prdSearchInput: document.querySelector('#prdSearchInput'),
  prdSearchCount: document.querySelector('#prdSearchCount'),
  prdSearchPreviousButton: document.querySelector('#prdSearchPreviousButton'),
  prdSearchNextButton: document.querySelector('#prdSearchNextButton'),
  togglePrdDirectoryButton: document.querySelector('#togglePrdDirectoryButton'),
  openPrdWindowButton: document.querySelector('#openPrdWindowButton'),
  prdModeButtons: [...document.querySelectorAll('[data-prd-mode]')],
  prdState: document.querySelector('#prdState'),
  prdContent: document.querySelector('#prdContent'),
  docTitle: document.querySelector('#docTitle'),
  docPath: document.querySelector('#docPath'),
  docUpdatedAt: document.querySelector('#docUpdatedAt'),
  docBody: document.querySelector('#docBody'),
};

function hexToRgb(value) {
  const match = String(value || '').match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function mixHexColors(source, target, amount) {
  const sourceRgb = hexToRgb(source);
  const targetRgb = hexToRgb(target);
  if (!sourceRgb || !targetRgb) return source;
  const ratio = Math.min(Math.max(amount, 0), 1);
  return `#${sourceRgb
    .map((channel, index) =>
      Math.round(channel + (targetRgb[index] - channel) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function applyBranding(branding = {}) {
  const themeColor = /^#[0-9a-f]{6}$/i.test(branding.themeColor || '')
    ? branding.themeColor.toUpperCase()
    : DEFAULT_BRANDING.themeColor;
  const nextBranding = {
    name: String(branding.name || DEFAULT_BRANDING.name).trim() || DEFAULT_BRANDING.name,
    subtitle: String(branding.subtitle ?? DEFAULT_BRANDING.subtitle).trim(),
    themeColor,
  };
  state.branding = nextBranding;
  const root = document.documentElement;
  root.style.setProperty('--brand', themeColor);
  root.style.setProperty('--brand-deep', mixHexColors(themeColor, '#00384F', 0.3));
  root.style.setProperty('--brand-soft', mixHexColors(themeColor, '#FFFFFF', 0.9));
  root.style.setProperty('--sidebar', themeColor);
  root.style.setProperty('--sidebar-deep', mixHexColors(themeColor, '#00384F', 0.3));
  elements.brandName.textContent = nextBranding.name;
  elements.brandSubtitle.textContent = nextBranding.subtitle;
  elements.brandMark.textContent = nextBranding.name.trim().slice(0, 1).toUpperCase() || 'R';
  document.title = `${nextBranding.name} · 原型工作台`;
}

function publishShellEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(`prototype-shell:${name}`, { detail }));
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    let message = '';
    try {
      message = (await response.json())?.error || '';
    } catch {
      // The status code remains a useful fallback for non-JSON failures.
    }
    throw new Error(message || `读取失败：${response.status}`);
  }
  return response.json();
}

function encodePagePath(pagePath) {
  return pagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function bindingOrder(binding) {
  if (binding.primary) return -1;
  return Number.isFinite(Number(binding.order)) ? Number(binding.order) : Number.MAX_SAFE_INTEGER;
}

function bindingsFor(pagePath) {
  const exact = state.bindings.filter((item) => item.page === pagePath);
  const basenameMatches = state.bindings.filter(
    (item) => item.page?.split('/').at(-1) === pagePath.split('/').at(-1),
  );
  const matchedPages = new Set(basenameMatches.map((item) => item.page));
  const matches = exact.length ? exact : matchedPages.size === 1 ? basenameMatches : [];
  return [...matches].sort(
    (left, right) =>
      bindingOrder(left) - bindingOrder(right) ||
      String(left.title || left.document).localeCompare(String(right.title || right.document), 'zh-CN', {
        numeric: true,
      }),
  );
}

function groupPages(pages) {
  const groups = new Map();
  pages.forEach((page) => {
    if (!groups.has(page.folder)) groups.set(page.folder, []);
    groups.get(page.folder).push(page);
  });
  return [...groups.entries()].sort((left, right) =>
    left[0].localeCompare(right[0], 'zh-CN', { numeric: true }),
  );
}

function pageMenuTitle(page) {
  if (state.menu.labelSource === 'filename') {
    return (
      page.path
        .split('/')
        .at(-1)
        ?.replace(/\.html?$/i, '') || page.title
    );
  }
  return page.menuTitle || page.title;
}

function renderFolderFilter() {
  const folders = [...new Set(state.pages.map((page) => page.folder).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, 'zh-CN', { numeric: true }),
  );
  if (state.folderFilter && !folders.includes(state.folderFilter)) state.folderFilter = '';
  elements.folderFilter.replaceChildren(new Option('全部文件夹', ''));
  folders.forEach((folder) => elements.folderFilter.append(new Option(folder, folder)));
  elements.folderFilter.value = state.folderFilter;
}

function pageIcon() {
  return `
    <span class="tree-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"></path><path d="M14 3v5h5M9 12h6M9 16h4"></path></svg>
    </span>
  `;
}

function renderPages() {
  const keyword = elements.pageSearch.value.trim().toLowerCase();
  const pages = state.pages.filter(
    (page) =>
      (!state.folderFilter || page.folder === state.folderFilter) &&
      `${page.title} ${page.menuTitle || ''} ${page.path} ${page.folder}`.toLowerCase().includes(keyword),
  );
  elements.pageTree.replaceChildren();
  elements.pageCount.textContent =
    pages.length === state.pages.length
      ? `${state.pages.length} 个业务页面`
      : `${pages.length} / ${state.pages.length} 个业务页面`;

  if (!pages.length) {
    const empty = document.createElement('div');
    empty.className = 'tree-empty';
    empty.textContent =
      keyword || state.folderFilter ? '当前筛选条件下没有业务页面' : '当前目录没有 HTML 页面';
    elements.pageTree.append(empty);
    return;
  }

  const groups = state.menu.groupByFolder ? groupPages(pages) : [['', pages]];
  groups.forEach(([folder, group]) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'tree-group';

    if (folder) {
      const heading = document.createElement('div');
      heading.className = 'tree-group-title';
      heading.textContent = folder;
      heading.title = folder;
      wrapper.append(heading);
    }

    group.forEach((page) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tree-item ${state.currentPage?.path === page.path ? 'is-active' : ''}`;
      button.title = `${page.title}\n${page.path}`;
      button.setAttribute('aria-current', state.currentPage?.path === page.path ? 'page' : 'false');
      button.innerHTML = `${pageIcon()}<span class="tree-label"></span>`;
      button.querySelector('.tree-label').textContent = pageMenuTitle(page);
      button.addEventListener('click', () => selectPage(page));
      wrapper.append(button);
    });

    elements.pageTree.append(wrapper);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(source) {
  const lines = String(source || '').split(/\r?\n/);
  const output = [];
  let inCode = false;
  let code = [];
  let inList = false;
  let tableRows = [];

  const closeList = () => {
    if (!inList) return;
    output.push('</ul>');
    inList = false;
  };

  const parseTableRow = (line) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());

  const flushTable = () => {
    if (!tableRows.length) return;
    const header = tableRows[0];
    const hasSeparator = tableRows[1]?.every((cell) => /^:?-{3,}:?$/.test(cell));
    const rows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1);
    output.push('<table><thead><tr>');
    header.forEach((cell) => output.push(`<th>${inlineMarkdown(cell)}</th>`));
    output.push('</tr></thead><tbody>');
    rows.forEach((row) => {
      output.push('<tr>');
      row.forEach((cell) => output.push(`<td>${inlineMarkdown(cell)}</td>`));
      output.push('</tr>');
    });
    output.push('</tbody></table>');
    tableRows = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flushTable();
      if (inCode) {
        output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
      }
      inCode = !inCode;
      closeList();
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      closeList();
      tableRows.push(parseTableRow(trimmed));
      return;
    }

    flushTable();

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      output.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      return;
    }

    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      closeList();
      output.push('<hr>');
      return;
    }

    if (/^>\s?/.test(line)) {
      closeList();
      output.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
      return;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        output.push('<ul>');
        inList = true;
      }
      output.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
      return;
    }

    if (!line.trim()) {
      closeList();
      return;
    }

    closeList();
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  flushTable();
  closeList();
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return output.join('');
}

function documentMetaFor(documentPath) {
  return state.docs.find((document) => document.path === documentPath) || null;
}

function formatDocumentDate(value) {
  if (!value) return '更新时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '更新时间未知';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bindingTitle(binding) {
  if (!binding) return '未关联文档';
  return (
    binding.title ||
    documentMetaFor(binding.document)?.title ||
    String(binding.document || '未命名文档')
      .split('/')
      .at(-1)
      ?.replace(/\.(?:md|markdown)$/i, '')
  );
}

function bindingCategory(binding) {
  return binding.category || (binding.primary ? '页面主 PRD' : '关联 PRD');
}

function rememberedPrdDocument(pagePath) {
  try {
    return sessionStorage.getItem(`${PRD_DOCUMENT_KEY_PREFIX}${pagePath}`) || '';
  } catch {
    return '';
  }
}

function rememberPrdDocument(pagePath, documentPath) {
  try {
    sessionStorage.setItem(`${PRD_DOCUMENT_KEY_PREFIX}${pagePath}`, documentPath);
  } catch {
    // Session storage is optional; the primary document remains the fallback.
  }
}

function setPrdDocumentMenuOpen(open) {
  const shouldOpen = Boolean(open && state.currentBindings.length > 1);
  state.prdDocumentMenuOpen = shouldOpen;
  elements.prdDocumentSwitcher.classList.toggle('is-open', shouldOpen);
  elements.prdDocumentMenu.classList.toggle('hidden', !shouldOpen);
  elements.prdDocumentTrigger.setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen) {
    requestAnimationFrame(() => {
      const selected = elements.prdDocumentMenu.querySelector('.prd-document-option.is-selected');
      (selected || elements.prdDocumentMenu.querySelector('.prd-document-option'))?.focus();
    });
  }
}

function renderPrdDocumentSwitcher() {
  const bindings = state.currentBindings;
  const currentIndex = Math.max(
    0,
    bindings.findIndex((binding) => binding.document === state.currentBinding?.document),
  );
  const multiple = bindings.length > 1;

  elements.docTitle.textContent = bindingTitle(state.currentBinding);
  elements.prdDocumentTrigger.disabled = !multiple;
  elements.prdDocumentTrigger.classList.toggle('is-multiple', multiple);
  elements.prdDocumentTrigger.title = state.currentBinding?.document || '';
  elements.prdDocumentPosition.textContent = multiple ? `${currentIndex + 1}/${bindings.length}` : '';
  elements.prdDocumentPosition.classList.toggle('hidden', !multiple);
  elements.prdDocumentChevron.classList.toggle('hidden', !multiple);
  elements.prdDocumentMenu.replaceChildren();

  if (!multiple) {
    setPrdDocumentMenuOpen(false);
    return;
  }

  const groups = new Map();
  bindings.forEach((binding) => {
    const category = bindingCategory(binding);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(binding);
  });

  groups.forEach((group, category) => {
    const section = document.createElement('section');
    section.className = 'prd-document-group';
    const heading = document.createElement('div');
    heading.className = 'prd-document-group-title';
    heading.textContent = category;
    section.append(heading);

    group.forEach((binding) => {
      const selected = binding.document === state.currentBinding?.document;
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `prd-document-option ${selected ? 'is-selected' : ''}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(selected));
      option.tabIndex = selected ? 0 : -1;
      option.title = binding.document;

      const copy = document.createElement('span');
      copy.className = 'prd-document-option-copy';
      const title = document.createElement('strong');
      title.textContent = bindingTitle(binding);
      const path = document.createElement('span');
      path.textContent = binding.document;
      copy.append(title, path);
      option.append(copy);

      const meta = document.createElement('span');
      meta.className = 'prd-document-option-meta';
      if (binding.primary) {
        const primary = document.createElement('em');
        primary.textContent = '主 PRD';
        meta.append(primary);
      }
      if (selected) {
        const check = document.createElement('span');
        check.className = 'prd-document-check';
        check.textContent = '✓';
        check.setAttribute('aria-hidden', 'true');
        meta.append(check);
      }
      option.append(meta);
      option.addEventListener('click', () => {
        setPrdDocumentMenuOpen(false);
        elements.prdDocumentTrigger.focus({ preventScroll: true });
        void loadPrdBinding(state.currentPage, binding);
      });
      section.append(option);
    });
    elements.prdDocumentMenu.append(section);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearchHighlights() {
  elements.docBody.querySelectorAll('mark.prd-search-hit').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
  });
}

function focusSearchMatch(index) {
  if (!state.searchMatches.length) return;
  state.searchMatchIndex = (index + state.searchMatches.length) % state.searchMatches.length;
  state.searchMatches.forEach((match, matchIndex) => {
    match.classList.toggle('is-current', matchIndex === state.searchMatchIndex);
  });
  state.searchMatches[state.searchMatchIndex].scrollIntoView({ block: 'center' });
  elements.prdSearchCount.textContent = `${state.searchMatchIndex + 1} / ${state.searchMatches.length}`;
}

function updateSearchMatches() {
  clearSearchHighlights();
  state.searchMatches = [];
  state.searchMatchIndex = 0;
  const keyword = elements.prdSearchInput.value.trim();

  if (keyword) {
    const walker = document.createTreeWalker(elements.docBody, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node = walker.nextNode();
    while (node) {
      if (!node.parentElement?.closest('pre, mark')) textNodes.push(node);
      node = walker.nextNode();
    }

    const expression = new RegExp(escapeRegExp(keyword), 'gi');
    textNodes.forEach((textNode) => {
      if (!expression.test(textNode.textContent || '')) {
        expression.lastIndex = 0;
        return;
      }
      expression.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      String(textNode.textContent || '').replace(expression, (match, offset) => {
        fragment.append(document.createTextNode(textNode.textContent.slice(cursor, offset)));
        const highlight = document.createElement('mark');
        highlight.className = 'prd-search-hit';
        highlight.textContent = match;
        fragment.append(highlight);
        state.searchMatches.push(highlight);
        cursor = offset + match.length;
        return match;
      });
      fragment.append(document.createTextNode(textNode.textContent.slice(cursor)));
      textNode.replaceWith(fragment);
    });
  }

  const hasMatches = state.searchMatches.length > 0;
  elements.prdSearchCount.classList.toggle('hidden', !keyword);
  elements.prdSearchPreviousButton.disabled = !hasMatches;
  elements.prdSearchNextButton.disabled = !hasMatches;
  elements.prdSearchCount.textContent = hasMatches ? `1 / ${state.searchMatches.length}` : '0 / 0';
  if (hasMatches) focusSearchMatch(0);
}

function renderPrdOutline() {
  elements.prdOutline.replaceChildren();
  const headings = [...elements.docBody.querySelectorAll('h1, h2, h3')];
  if (headings.length) {
    const title = document.createElement('strong');
    title.textContent = '本文目录';
    elements.prdOutline.append(title);
  }
  headings.forEach((heading, index) => {
    const id = `prd-heading-${index}`;
    heading.id = id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `outline-level-${heading.tagName.slice(1)}`;
    button.dataset.headingId = id;
    button.textContent = heading.textContent;
    button.addEventListener('click', () => {
      setPrdOutlineActive(id);
      heading.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    });
    elements.prdOutline.append(button);
  });
  activePrdHeadingId = '';
  setPrdOutlineVisible(state.outlineVisible);
  updatePrdOutlineActive();
}

function updatePrdOutlineActive() {
  const headings = [...elements.docBody.querySelectorAll('h1, h2, h3')];
  if (!headings.length) {
    activePrdHeadingId = '';
    return;
  }

  const readingLine = elements.prdReader.getBoundingClientRect().top + 92;
  let currentHeading = headings[0];
  headings.forEach((heading) => {
    if (heading.getBoundingClientRect().top <= readingLine) currentHeading = heading;
  });
  setPrdOutlineActive(currentHeading.id);
}

function setPrdOutlineActive(headingId) {
  const changed = activePrdHeadingId !== headingId;
  activePrdHeadingId = headingId;
  elements.prdOutline.querySelectorAll('button[data-heading-id]').forEach((button) => {
    const isActive = button.dataset.headingId === activePrdHeadingId;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'location');
    else button.removeAttribute('aria-current');
  });

  if (!changed || !state.outlineVisible) return;
  const activeButton = [...elements.prdOutline.querySelectorAll('button[data-heading-id]')].find(
    (button) => button.dataset.headingId === activePrdHeadingId,
  );
  if (!activeButton) return;

  const outlineRect = elements.prdOutline.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();
  const edgePadding = 8;
  const isOutside =
    buttonRect.top < outlineRect.top + edgePadding || buttonRect.bottom > outlineRect.bottom - edgePadding;
  if (!isOutside) return;

  const scrollDelta =
    buttonRect.top < outlineRect.top + edgePadding
      ? buttonRect.top - (outlineRect.top + edgePadding)
      : buttonRect.bottom - (outlineRect.bottom - edgePadding);
  elements.prdOutline.scrollTop += scrollDelta;
}

function schedulePrdOutlineActiveUpdate() {
  if (outlineScrollFrame) return;
  outlineScrollFrame = requestAnimationFrame(() => {
    outlineScrollFrame = 0;
    updatePrdOutlineActive();
  });
}

function positionPrdOutline() {
  const chromeHeight =
    elements.prdHeading.offsetHeight +
    elements.prdToolbar.offsetHeight +
    elements.prdSearchbar.offsetHeight +
    10;
  elements.prdOutline.style.top = `${chromeHeight}px`;
}

function setPrdOutlineVisible(visible) {
  const hasHeadings = Boolean(elements.docBody.querySelector('h1, h2, h3'));
  state.outlineVisible = Boolean(visible && hasHeadings);
  positionPrdOutline();
  elements.prdPanel.classList.toggle('directory-open', state.outlineVisible);
  elements.prdOutline.classList.toggle('hidden', !state.outlineVisible);
  elements.togglePrdDirectoryButton.disabled = !hasHeadings;
  elements.togglePrdDirectoryButton.setAttribute('aria-expanded', String(state.outlineVisible));
  elements.togglePrdDirectoryButton.querySelector('span').textContent = state.outlineVisible
    ? '关闭目录'
    : '查看目录';
}

function saveCurrentPrdScroll() {
  if (!state.currentPage?.path || !state.currentBinding?.document) return;
  state.prdScrollPositions.set(
    `${state.currentPage.path}\n${state.currentBinding.document}`,
    elements.prdReader.scrollTop,
  );
}

function restorePrdScroll(pagePath, documentPath) {
  const position = state.prdScrollPositions.get(`${pagePath}\n${documentPath}`) || 0;
  elements.prdReader.scrollLeft = 0;
  elements.prdReader.scrollTop = position;
}

function resetPrdState(message = '当前页面未关联 PRD', { clearBindings = true } = {}) {
  if (clearBindings) {
    state.currentBinding = null;
    state.currentBindings = [];
  }
  activePrdHeadingId = '';
  state.searchMatches = [];
  state.searchMatchIndex = 0;
  renderPrdDocumentSwitcher();
  elements.docPath.textContent = state.currentBinding?.document || '—';
  elements.docUpdatedAt.textContent = '—';
  elements.docBody.replaceChildren();
  elements.prdSearchInput.value = '';
  elements.prdSearchCount.classList.add('hidden');
  elements.prdSearchPreviousButton.disabled = true;
  elements.prdSearchNextButton.disabled = true;
  renderPrdOutline();
  elements.prdState.classList.remove('hidden');
  elements.prdContent.classList.add('hidden');
  elements.prdState.querySelector('strong').textContent = message;
}

let prdRenderVersion = 0;
let prdRequestController = null;

function cancelPrdRequest() {
  prdRequestController?.abort();
  prdRequestController = null;
}

async function loadPrdBinding(page, binding, { persist = true } = {}) {
  if (!page || !binding?.document) return;
  if (state.currentBinding?.document !== binding.document) saveCurrentPrdScroll();
  cancelPrdRequest();
  const requestController = new AbortController();
  prdRequestController = requestController;
  state.currentBinding = binding;
  if (persist) rememberPrdDocument(page.path, binding.document);
  renderPrdDocumentSwitcher();
  const renderVersion = ++prdRenderVersion;
  elements.prdContent.classList.add('is-switching');
  elements.prdReader.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`/api/doc?path=${encodeURIComponent(binding.document)}`, {
      cache: 'no-store',
      signal: requestController.signal,
    });
    if (!response.ok) throw new Error(`PRD 读取失败：${response.status}`);
    const source = await response.text();
    if (
      renderVersion !== prdRenderVersion ||
      state.currentPage?.path !== page.path ||
      state.currentBinding?.document !== binding.document
    )
      return;

    elements.docTitle.textContent = binding.title || source.match(/^#\s+(.+)$/m)?.[1] || binding.document;
    elements.docPath.textContent = binding.document;
    elements.docUpdatedAt.textContent = formatDocumentDate(documentMetaFor(binding.document)?.updatedAt);
    elements.docBody.innerHTML = renderMarkdown(source);
    renderPrdOutline();
    updateSearchMatches();
    elements.prdState.classList.add('hidden');
    elements.prdContent.classList.remove('hidden');
    requestAnimationFrame(() => {
      if (elements.prdSearchInput.value.trim()) {
        elements.prdReader.scrollLeft = 0;
      } else {
        restorePrdScroll(page.path, binding.document);
      }
      schedulePrdOutlineActiveUpdate();
    });
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (renderVersion !== prdRenderVersion || state.currentPage?.path !== page.path) return;
    resetPrdState(error.message, { clearBindings: false });
  } finally {
    if (prdRequestController === requestController) prdRequestController = null;
    if (renderVersion === prdRenderVersion) {
      elements.prdContent.classList.remove('is-switching');
      elements.prdReader.removeAttribute('aria-busy');
    }
  }
}

async function renderPrd(page) {
  const bindings = bindingsFor(page.path);
  state.currentBindings = bindings;
  elements.togglePrdButton.classList.toggle('has-binding', Boolean(bindings.length));
  elements.prdPanelTitle.textContent = page.title;

  if (!bindings.length) {
    resetPrdState();
    return;
  }

  const rememberedDocument = rememberedPrdDocument(page.path);
  const binding =
    bindings.find((item) => item.document === rememberedDocument) ||
    bindings.find((item) => item.primary) ||
    bindings[0];
  await loadPrdBinding(page, binding, { persist: false });
}

function setPrdOpen(open) {
  state.prdOpen = Boolean(open);
  if (!state.prdOpen) setPrdDocumentMenuOpen(false);
  elements.shell.classList.toggle('prd-open', state.prdOpen);
  elements.shell.classList.toggle('prd-overlay-open', state.prdOpen && state.prdMode === 'overlay');
  elements.prdPanel.setAttribute('aria-hidden', String(!state.prdOpen));
  elements.togglePrdButton.setAttribute('aria-expanded', String(state.prdOpen));
  elements.prdToggleLabel.textContent = state.prdOpen ? '关闭 PRD' : '查看 PRD';
  applyOverlayTransform();
  if (state.prdOpen && state.prdMode === 'overlay') requestAnimationFrame(constrainOverlayPosition);
}

function setPrdMode(mode) {
  setPrdDocumentMenuOpen(false);
  state.prdMode = mode === 'overlay' ? 'overlay' : 'split';
  elements.shell.classList.toggle('prd-overlay-open', state.prdMode === 'overlay' && state.prdOpen);
  elements.prdModeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.prdMode === state.prdMode));
  });
  applyOverlayTransform();
  if (state.prdMode === 'overlay') requestAnimationFrame(constrainOverlayPosition);
}

function openPrdWindow() {
  if (!state.currentBinding?.document || !state.currentPage) return;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('page', state.currentPage.path);
  url.searchParams.set('prd', '1');
  url.searchParams.set('doc', state.currentBinding.document);
  window.open(url.href, '_blank', 'noopener,noreferrer');
}

let dragState = null;
let activePrdHeadingId = '';
let outlineScrollFrame = 0;

function isCompactViewport() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function clamp(value, min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(Math.max(value, lower), upper);
}

function getOverlayBounds(metrics) {
  const workspaceRect = elements.workspace.getBoundingClientRect();
  return {
    minX: workspaceRect.left + 10 - metrics.baseLeft,
    maxX: workspaceRect.right - 10 - metrics.width - metrics.baseLeft,
    minY: workspaceRect.top + 10 - metrics.baseTop,
    maxY: workspaceRect.bottom - 10 - metrics.height - metrics.baseTop,
  };
}

function applyOverlayTransform() {
  const draggable = state.prdOpen && state.prdMode === 'overlay' && !isCompactViewport();
  elements.prdHeading.classList.toggle('is-draggable', draggable);
  elements.prdHeading.title = draggable ? '拖动标题栏移动 PRD 浮层' : '';
  if (draggable) {
    const { x, y } = state.overlayPosition;
    elements.prdPanel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  } else {
    elements.prdPanel.style.removeProperty('transform');
  }
}

function constrainOverlayPosition() {
  if (!state.prdOpen || state.prdMode !== 'overlay' || isCompactViewport()) return;
  const panelRect = elements.prdPanel.getBoundingClientRect();
  const metrics = {
    baseLeft: panelRect.left - state.overlayPosition.x,
    baseTop: panelRect.top - state.overlayPosition.y,
    width: panelRect.width,
    height: panelRect.height,
  };
  const bounds = getOverlayBounds(metrics);
  state.overlayPosition = {
    x: clamp(state.overlayPosition.x, bounds.minX, bounds.maxX),
    y: clamp(state.overlayPosition.y, bounds.minY, bounds.maxY),
  };
  applyOverlayTransform();
}

function readSavedOverlayPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRD_POSITION_KEY) || 'null');
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
    state.overlayPosition = { x: saved.x, y: saved.y };
  } catch {
    // Local storage is optional; the floating panel still works for the current session.
  }
}

function saveOverlayPosition() {
  try {
    localStorage.setItem(PRD_POSITION_KEY, JSON.stringify(state.overlayPosition));
  } catch {
    // Local storage is optional; the floating panel still works for the current session.
  }
}

function handlePrdHeaderPointerDown(event) {
  if (!state.prdOpen || state.prdMode !== 'overlay' || isCompactViewport()) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (event.target?.closest?.('button, a, input, select, textarea, [role="button"]')) return;

  const panelRect = elements.prdPanel.getBoundingClientRect();
  dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosition: { ...state.overlayPosition },
    baseLeft: panelRect.left - state.overlayPosition.x,
    baseTop: panelRect.top - state.overlayPosition.y,
    width: panelRect.width,
    height: panelRect.height,
  };
  state.isDragging = true;
  elements.prdPanel.classList.add('is-dragging');
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function handlePrdHeaderPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  const bounds = getOverlayBounds(dragState);
  state.overlayPosition = {
    x: clamp(dragState.startPosition.x + event.clientX - dragState.startX, bounds.minX, bounds.maxX),
    y: clamp(dragState.startPosition.y + event.clientY - dragState.startY, bounds.minY, bounds.maxY),
  };
  applyOverlayTransform();
}

function finishPrdHeaderDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  dragState = null;
  state.isDragging = false;
  elements.prdPanel.classList.remove('is-dragging');
  saveOverlayPosition();
}

function setSidebarCollapsed(collapsed) {
  state.collapsedPages = Boolean(collapsed);
  elements.shell.classList.toggle('sidebar-collapsed', state.collapsedPages);
  elements.togglePagesButton.setAttribute('aria-expanded', String(!state.collapsedPages));
  elements.togglePagesButton.title = state.collapsedPages ? '展开业务菜单' : '收起业务菜单';
  elements.togglePagesButton.setAttribute(
    'aria-label',
    state.collapsedPages ? '展开业务菜单' : '收起业务菜单',
  );
}

function loadPrototypeFrame(
  page,
  {
    raw = false,
    search = state.currentPage?.path === page.path ? state.prototypeLocation.search : '',
    hash = state.currentPage?.path === page.path ? state.prototypeLocation.hash : '',
  } = {},
) {
  state.rawPrototype = Boolean(raw);
  elements.frameWrap.classList.add('is-loading');
  elements.frameLoading.classList.remove('hidden');
  cancelPrototypeViewportSettle();
  const url = new URL(`/prototype/${encodePagePath(page.path)}`, window.location.origin);
  new URLSearchParams(search).forEach((value, key) => url.searchParams.append(key, value));
  if (state.rawPrototype) url.searchParams.set('raw', '1');
  url.hash = hash || '';
  elements.frame.src = `${url.pathname}${url.search}${url.hash}`;
  elements.frame.classList.remove('hidden');
  elements.emptyStage.classList.add('hidden');
  publishShellEvent('prototype-mode', { raw: state.rawPrototype });
}

function readPrototypeFrameLocation() {
  try {
    const frameLocation = elements.frame.contentWindow?.location;
    const pathname = String(frameLocation?.pathname || '');
    const marker = '/prototype/';
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    return {
      path: decodeURIComponent(pathname.slice(markerIndex + marker.length)),
      search: String(frameLocation?.search || ''),
      hash: String(frameLocation?.hash || ''),
    };
  } catch {
    return null;
  }
}

function syncPrototypeFrameLocation() {
  const location = readPrototypeFrameLocation();
  if (!location) return;
  const page = state.pages.find((item) => item.path === location.path);
  if (!page) return;
  if (state.currentPage?.path !== page.path) {
    selectPage(page, { search: location.search, hash: location.hash, loadFrame: false });
  }
  else state.prototypeLocation = { search: location.search, hash: location.hash };
}

function selectPage(page, { persist = true, search = '', hash = '', loadFrame = true } = {}) {
  saveCurrentPrdScroll();
  cancelPrdRequest();
  prdRenderVersion += 1;
  setPrdDocumentMenuOpen(false);
  state.currentPage = page;
  state.prototypeLocation = { search, hash };
  state.currentBinding = null;
  state.currentBindings = [];
  elements.currentFolder.textContent = page.folder || '业务页面';
  elements.currentTitle.textContent = page.title;
  elements.currentPath.textContent = page.path;
  elements.currentPath.title = page.path;
  document.title = `${page.title} · ${state.branding.name} 原型工作台`;
  if (loadFrame) loadPrototypeFrame(page, { search, hash });

  if (persist) writeLocalValue(LAST_PAGE_KEY, page.path);
  renderPages();
  void renderPrd(page);
  publishShellEvent('page-change', { page });
}

function notifyPrototypeResize() {
  const prototypeWindow = elements.frame.contentWindow;
  if (!prototypeWindow) return;
  try {
    prototypeWindow.dispatchEvent(new Event('resize'));
  } catch {
    // A prototype may navigate to another origin; the shell must remain usable.
  }
}

let prototypeSettleTimer = 0;
let prototypeRevealTimer = 0;
let prototypeViewportFrame = 0;

function cancelPrototypeViewportSettle() {
  window.clearTimeout(prototypeSettleTimer);
  window.clearTimeout(prototypeRevealTimer);
  window.cancelAnimationFrame(prototypeViewportFrame);
  prototypeSettleTimer = 0;
  prototypeRevealTimer = 0;
  prototypeViewportFrame = 0;
  elements.frame.style.removeProperty('width');
}

function settlePrototypeLayout() {
  window.clearTimeout(prototypeSettleTimer);
  notifyPrototypeResize();
  requestAnimationFrame(() => notifyPrototypeResize());
  prototypeSettleTimer = window.setTimeout(() => {
    notifyPrototypeResize();
    prototypeSettleTimer = 0;
  }, 360);
}

function settleLoadedPrototypeViewport() {
  cancelPrototypeViewportSettle();
  settlePrototypeLayout();

  // Some legacy prototypes calculate their scrollable layout before the iframe
  // receives its final width. A temporary, meaningful viewport change reproduces
  // the reliable reflow that otherwise only happened after opening the PRD panel.
  // The frame remains behind the loading state while this handshake runs.
  elements.frame.style.width = '72%';
  prototypeViewportFrame = window.requestAnimationFrame(() => {
    prototypeViewportFrame = 0;
    prototypeRevealTimer = window.setTimeout(() => {
      elements.frame.style.removeProperty('width');
      settlePrototypeLayout();
      prototypeRevealTimer = window.setTimeout(() => {
        elements.frameWrap.classList.remove('is-loading');
        elements.frameLoading.classList.add('hidden');
        prototypeRevealTimer = 0;
      }, 120);
    }, 120);
  });
}

function showRefreshError(error) {
  console.error(error);
  elements.pageCount.textContent = '页面读取失败 · 点击重试';
  if (state.currentPage) return;
  elements.emptyStage.querySelector('strong').textContent = error.message || '页面读取失败';
  elements.emptyStage.classList.remove('hidden');
}

async function refresh({ force = false } = {}) {
  if (state.isRefreshing) return;
  state.isRefreshing = true;
  elements.refreshButton.classList.add('is-loading');
  elements.refreshButton.disabled = true;
  try {
    const suffix = force ? '?refresh=1' : '';
    const bootstrap = await getJson(`/api/bootstrap${suffix}`);
    const {
      pages,
      docs,
      bindings,
      pageRules = {},
      health = null,
      branding = DEFAULT_BRANDING,
      menu = DEFAULT_MENU,
    } = bootstrap;
    if (![pages, docs, bindings].every(Array.isArray)) {
      throw new Error('外壳初始化数据格式不正确。');
    }
    state.pages = pages;
    state.docs = docs;
    state.bindings = bindings;
    state.menu = { ...DEFAULT_MENU, ...menu };
    applyBranding(branding);
    renderFolderFilter();
    elements.pageCount.textContent = `${pages.length} 个业务页面`;
    publishShellEvent('bootstrap', {
      pages,
      docs,
      bindings,
      pageRules,
      health,
      branding: state.branding,
      menu: state.menu,
    });

    const query = new URLSearchParams(window.location.search);
    const preferredPath = query.get('page') || state.currentPage?.path || readLocalValue(LAST_PAGE_KEY);
    const shouldOpenPrd = query.get('prd') === '1';
    const preferredDocument = query.get('doc') || '';
    const preferredPage = pages.find((page) => page.path === preferredPath) || pages[0] || null;
    renderPages();

    if (preferredPage) {
      if (preferredDocument) rememberPrdDocument(preferredPage.path, preferredDocument);
      selectPage(preferredPage, { persist: false });
      if (shouldOpenPrd) setPrdOpen(true);
    } else {
      cancelPrdRequest();
      prdRenderVersion += 1;
      state.currentPage = null;
      state.prototypeLocation = { search: '', hash: '' };
      state.currentBinding = null;
      state.currentBindings = [];
      elements.frame.removeAttribute('src');
      elements.frame.classList.add('hidden');
      elements.emptyStage.classList.remove('hidden');
      elements.currentFolder.textContent = '业务页面';
      elements.currentTitle.textContent = '选择页面';
      elements.currentPath.textContent = '尚未选择页面';
      elements.currentPath.title = '尚未选择页面';
      resetPrdState('当前目录没有可读取的 HTML 页面');
      publishShellEvent('page-change', { page: null });
    }
  } finally {
    state.isRefreshing = false;
    elements.refreshButton.classList.remove('is-loading');
    elements.refreshButton.disabled = false;
  }
}

elements.frame.addEventListener('load', () => {
  syncPrototypeFrameLocation();
  if (elements.frameWrap.classList.contains('is-loading')) settleLoadedPrototypeViewport();
  else settlePrototypeLayout();
});

window.addEventListener('message', (event) => {
  if (event.source !== elements.frame.contentWindow || event.origin !== window.location.origin) return;
  const pathname = String(event.data?.path || '');
  const marker = '/prototype/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return;
  let relative = '';
  try {
    relative = decodeURIComponent(pathname.slice(markerIndex + marker.length));
  } catch {
    return;
  }
  const search = typeof event.data?.search === 'string' ? event.data.search : '';
  const hash = typeof event.data?.hash === 'string' ? event.data.hash : '';

  if (event.data?.type === 'html-prototype:layout-ready') {
    if (relative !== state.currentPage?.path) return;
    publishShellEvent('diagnostic', { type: 'layout', page: relative, detail: event.data.detail || {} });
    if (elements.frameWrap.classList.contains('is-loading')) settleLoadedPrototypeViewport();
    return;
  }
  if (event.data?.type === 'html-prototype:runtime-error') {
    if (relative !== state.currentPage?.path) return;
    publishShellEvent('diagnostic', { type: 'error', page: relative, detail: event.data.detail || {} });
    return;
  }
  if (event.data?.type !== 'html-prototype:navigate') return;
  const page = state.pages.find((item) => item.path === relative);
  if (!page) return;
  if (state.currentPage?.path !== page.path) selectPage(page, { search, hash, loadFrame: false });
  else state.prototypeLocation = { search, hash };
});

elements.folderFilter.addEventListener('change', () => {
  state.folderFilter = elements.folderFilter.value;
  renderPages();
});
elements.pageSearch.addEventListener('input', renderPages);
elements.refreshButton.addEventListener('click', () => {
  void refresh({ force: true }).catch(showRefreshError);
});
elements.togglePagesButton.addEventListener('click', () => {
  setSidebarCollapsed(!state.collapsedPages);
});
elements.togglePrdButton.addEventListener('click', () => setPrdOpen(!state.prdOpen));
elements.closePrdButton.addEventListener('click', () => setPrdOpen(false));
elements.openPrdWindowButton.addEventListener('click', openPrdWindow);
elements.prdDocumentTrigger.addEventListener('click', () => {
  setPrdDocumentMenuOpen(!state.prdDocumentMenuOpen);
});
elements.prdDocumentTrigger.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  setPrdDocumentMenuOpen(true);
  requestAnimationFrame(() => {
    const options = [...elements.prdDocumentMenu.querySelectorAll('.prd-document-option')];
    options[event.key === 'ArrowUp' ? options.length - 1 : 0]?.focus();
  });
});
elements.prdDocumentMenu.addEventListener('keydown', (event) => {
  const options = [...elements.prdDocumentMenu.querySelectorAll('.prd-document-option')];
  if (!options.length) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    setPrdDocumentMenuOpen(false);
    elements.prdDocumentTrigger.focus();
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = Math.max(0, options.indexOf(document.activeElement));
  let nextIndex = currentIndex;
  if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = options.length - 1;
  else {
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    nextIndex = (currentIndex + direction + options.length) % options.length;
  }
  options.forEach((option, index) => {
    option.tabIndex = index === nextIndex ? 0 : -1;
  });
  options[nextIndex].focus();
});
elements.prdHeading.addEventListener('pointerdown', handlePrdHeaderPointerDown);
elements.prdHeading.addEventListener('pointermove', handlePrdHeaderPointerMove);
elements.prdHeading.addEventListener('pointerup', finishPrdHeaderDrag);
elements.prdHeading.addEventListener('pointercancel', finishPrdHeaderDrag);
elements.prdPanel.addEventListener('pointerdown', (event) => {
  if (!state.outlineVisible) return;
  if (event.target.closest('#prdOutline, #togglePrdDirectoryButton')) return;
  setPrdOutlineVisible(false);
});
elements.togglePrdDirectoryButton.addEventListener('click', () => {
  setPrdDocumentMenuOpen(false);
  setPrdOutlineVisible(!state.outlineVisible);
});
elements.prdSearchInput.addEventListener('input', updateSearchMatches);
elements.prdReader.addEventListener('scroll', schedulePrdOutlineActiveUpdate, { passive: true });
elements.prdSearchPreviousButton.addEventListener('click', () => {
  focusSearchMatch(state.searchMatchIndex - 1);
});
elements.prdSearchNextButton.addEventListener('click', () => {
  focusSearchMatch(state.searchMatchIndex + 1);
});
elements.prdModeButtons.forEach((button) => {
  button.addEventListener('click', () => setPrdMode(button.dataset.prdMode));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.prdDocumentMenuOpen) {
    setPrdDocumentMenuOpen(false);
    return;
  }
  if (event.key === 'Escape' && state.prdOpen) setPrdOpen(false);
});

window.addEventListener('resize', () => {
  applyOverlayTransform();
  positionPrdOutline();
  requestAnimationFrame(constrainOverlayPosition);
  settlePrototypeLayout();
});

document.addEventListener('pointerdown', (event) => {
  if (state.prdDocumentMenuOpen && !elements.prdDocumentSwitcher.contains(event.target)) {
    setPrdDocumentMenuOpen(false);
  }
  if (state.outlineVisible && !elements.prdPanel.contains(event.target)) {
    setPrdOutlineVisible(false);
  }
});

window.addEventListener('prototype-shell:command', (event) => {
  const command = event.detail || {};
  if (command.type === 'refresh') {
    void refresh({ force: true }).catch(showRefreshError);
    return;
  }
  if (command.type === 'reload-page' && state.currentPage) {
    loadPrototypeFrame(state.currentPage, { raw: Boolean(command.raw) });
    return;
  }
  if (command.type === 'reapply-layout' && !state.rawPrototype) {
    elements.frame.contentWindow?.postMessage(
      { type: 'html-prototype:reapply-layout' },
      window.location.origin,
    );
  }
});

const prototypeResizeObserver = new ResizeObserver(settlePrototypeLayout);
prototypeResizeObserver.observe(elements.frameWrap);

readSavedOverlayPosition();
setPrdMode('split');
void refresh().catch((error) => {
  showRefreshError(error);
});
