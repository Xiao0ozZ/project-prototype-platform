const MANAGEMENT_DEFAULT_BRANDING = {
  name: 'RIMO Rental',
  subtitle: '原型工作台',
  themeColor: '#0879B0',
};
const MANAGEMENT_DEFAULT_MENU = {
  groupByFolder: true,
  labelSource: 'title',
  compactTitle: true,
};
const MANAGEMENT_SHORTCUT_KEY = 'm';

const managementState = {
  open: false,
  activeTab: 'health',
  currentPage: null,
  pages: [],
  docs: [],
  bindings: [],
  pageRules: {},
  health: null,
  branding: { ...MANAGEMENT_DEFAULT_BRANDING },
  menu: { ...MANAGEMENT_DEFAULT_MENU },
  bindingDraft: [],
  diagnostics: new Map(),
  runtimeErrors: new Map(),
  rawPrototype: false,
};

const managementElements = {
  backdrop: document.querySelector('#managementBackdrop'),
  panel: document.querySelector('#managementPanel'),
  openButton: document.querySelector('#openManagementButton'),
  closeButton: document.querySelector('#closeManagementButton'),
  pageTitle: document.querySelector('#managementPageTitle'),
  pagePath: document.querySelector('#managementPagePath'),
  tabs: [...document.querySelectorAll('[data-management-tab]')],
  sections: [...document.querySelectorAll('[data-management-section]')],
  healthSummary: document.querySelector('#healthSummary'),
  healthGroups: document.querySelector('#healthGroups'),
  bindingDraftCount: document.querySelector('#bindingDraftCount'),
  bindingList: document.querySelector('#bindingEditorList'),
  bindingEmpty: document.querySelector('#bindingEditorEmpty'),
  addBindingButton: document.querySelector('#addBindingButton'),
  resetBindingsButton: document.querySelector('#resetBindingsButton'),
  saveBindingsButton: document.querySelector('#saveBindingsButton'),
  contentRoot: document.querySelector('#adapterContentRoot'),
  layoutMode: document.querySelector('#adapterLayoutMode'),
  hideSelectors: document.querySelector('#adapterHideSelectors'),
  excludeSelectors: document.querySelector('#adapterExcludeSelectors'),
  resetPageRuleButton: document.querySelector('#resetPageRuleButton'),
  savePageRuleButton: document.querySelector('#savePageRuleButton'),
  reapplyLayoutButton: document.querySelector('#reapplyLayoutButton'),
  toggleRawPageButton: document.querySelector('#toggleRawPageButton'),
  diagnosticStatus: document.querySelector('#diagnosticStatus'),
  diagnosticFacts: document.querySelector('#diagnosticFacts'),
  runtimeErrors: document.querySelector('#runtimeErrors'),
  notice: document.querySelector('#managementNotice'),
  brandingName: document.querySelector('#brandingName'),
  brandingSubtitle: document.querySelector('#brandingSubtitle'),
  brandingColorPicker: document.querySelector('#brandingColorPicker'),
  brandingThemeColor: document.querySelector('#brandingThemeColor'),
  brandingPreview: document.querySelector('#brandingPreview'),
  brandingPreviewMark: document.querySelector('#brandingPreviewMark'),
  brandingPreviewName: document.querySelector('#brandingPreviewName'),
  brandingPreviewSubtitle: document.querySelector('#brandingPreviewSubtitle'),
  brandingPreviewAction: document.querySelector('#brandingPreviewAction'),
  resetBrandingButton: document.querySelector('#resetBrandingButton'),
  saveBrandingButton: document.querySelector('#saveBrandingButton'),
  menuGroupByFolder: document.querySelector('#menuGroupByFolder'),
  menuLabelSource: document.querySelector('#menuLabelSource'),
  menuCompactTitle: document.querySelector('#menuCompactTitle'),
  resetMenuButton: document.querySelector('#resetMenuButton'),
  saveMenuButton: document.querySelector('#saveMenuButton'),
};

let closeTimer = 0;
let noticeTimer = 0;
let focusBeforeManagement = null;

function isManagementShortcut(event) {
  const keyMatches = event.key.toLowerCase() === MANAGEMENT_SHORTCUT_KEY;
  const reliableShortcut = event.ctrlKey && event.altKey && !event.shiftKey;
  const legacyShortcut = event.ctrlKey && event.shiftKey && !event.altKey;
  return keyMatches && (reliableShortcut || legacyShortcut);
}

function publishCommand(type, detail = {}) {
  window.dispatchEvent(
    new CustomEvent('prototype-shell:command', { detail: { type, ...detail } }),
  );
}

function showManagementNotice(message, tone = 'success') {
  window.clearTimeout(noticeTimer);
  managementElements.notice.textContent = message;
  managementElements.notice.dataset.tone = tone;
  managementElements.notice.classList.remove('hidden');
  noticeTimer = window.setTimeout(() => {
    managementElements.notice.classList.add('hidden');
  }, 2800);
}

async function writeConfiguration(url, payload) {
  const response = await fetch(url, {
    method: 'PUT',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Prototype-Shell-Admin': '1',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let message = '';
    try {
      message = (await response.json())?.error || '';
    } catch {
      // The response status is kept as the fallback.
    }
    throw new Error(message || `保存失败：${response.status}`);
  }
  return response.json();
}

function setManagementOpen(open) {
  managementState.open = Boolean(open);
  window.clearTimeout(closeTimer);
  document.body.classList.toggle('management-open', managementState.open);
  managementElements.panel.setAttribute('aria-hidden', String(!managementState.open));
  managementElements.openButton.setAttribute('aria-expanded', String(managementState.open));
  managementElements.openButton.setAttribute(
    'aria-label',
    managementState.open ? '关闭外壳管理' : '打开外壳管理',
  );
  managementElements.openButton.setAttribute(
    'title',
    managementState.open ? '关闭外壳管理' : '打开外壳管理',
  );

  if (managementState.open) {
    focusBeforeManagement = document.activeElement;
    managementElements.panel.classList.remove('hidden');
    managementElements.backdrop.classList.remove('hidden');
    renderManagement();
    requestAnimationFrame(() => {
      managementElements.panel.classList.add('is-open');
      managementElements.backdrop.classList.add('is-open');
      managementElements.closeButton.focus({ preventScroll: true });
    });
    return;
  }

  managementElements.panel.classList.remove('is-open');
  managementElements.backdrop.classList.remove('is-open');
  closeTimer = window.setTimeout(() => {
    managementElements.panel.classList.add('hidden');
    managementElements.backdrop.classList.add('hidden');
    focusBeforeManagement?.focus?.({ preventScroll: true });
  }, 180);
}

function setManagementTab(tab) {
  managementState.activeTab = ['health', 'bindings', 'adapter', 'appearance', 'menu'].includes(tab) ? tab : 'health';
  managementElements.tabs.forEach((button) => {
    const selected = button.dataset.managementTab === managementState.activeTab;
    button.setAttribute('aria-selected', String(selected));
  });
  managementElements.sections.forEach((section) => {
    section.classList.toggle(
      'hidden',
      section.dataset.managementSection !== managementState.activeTab,
    );
  });
}

function pageBindings() {
  if (!managementState.currentPage) return [];
  return managementState.bindings
    .filter((binding) => binding.page === managementState.currentPage.path)
    .sort(
      (left, right) =>
        Number(Boolean(right.primary)) - Number(Boolean(left.primary)) ||
        Number(left.order || 9999) - Number(right.order || 9999),
    );
}

function resetBindingDraft() {
  managementState.bindingDraft = pageBindings().map((binding) => ({ ...binding }));
  renderBindingEditor();
}

function createField(labelText, control, hint = '') {
  const label = document.createElement('label');
  label.className = 'management-field';
  const labelCopy = document.createElement('span');
  labelCopy.textContent = labelText;
  label.append(labelCopy, control);
  if (hint) {
    const hintElement = document.createElement('small');
    hintElement.textContent = hint;
    label.append(hintElement);
  }
  return label;
}

function createDocumentSelect(binding, index) {
  const select = document.createElement('select');
  select.dataset.bindingField = 'document';
  const groups = new Map();
  managementState.docs.forEach((documentMeta) => {
    if (!groups.has(documentMeta.folder)) groups.set(documentMeta.folder, []);
    groups.get(documentMeta.folder).push(documentMeta);
  });
  groups.forEach((documentGroup, folder) => {
    const group = document.createElement('optgroup');
    group.label = folder;
    documentGroup.forEach((documentMeta) => {
      const option = document.createElement('option');
      option.value = documentMeta.path;
      option.textContent = documentMeta.title;
      option.title = documentMeta.path;
      group.append(option);
    });
    select.append(group);
  });
  select.value = binding.document;
  select.addEventListener('change', () => {
    managementState.bindingDraft[index].document = select.value;
    if (!managementState.bindingDraft[index].title) {
      const documentMeta = managementState.docs.find((item) => item.path === select.value);
      managementState.bindingDraft[index].title = documentMeta?.title || '';
      renderBindingEditor();
    }
  });
  return select;
}

function createTextInput(value, field, index, placeholder = '') {
  const input = document.createElement('input');
  input.type = field === 'order' ? 'number' : 'text';
  input.value = value ?? '';
  input.placeholder = placeholder;
  if (field === 'order') input.min = '1';
  input.addEventListener('input', () => {
    managementState.bindingDraft[index][field] =
      field === 'order' ? Number(input.value) || undefined : input.value;
  });
  return input;
}

function renderBindingEditor() {
  const pageAvailable = Boolean(managementState.currentPage);
  const draft = managementState.bindingDraft;
  managementElements.bindingList.replaceChildren();
  managementElements.bindingDraftCount.textContent = `${draft.length} 份 PRD`;
  managementElements.bindingEmpty.classList.toggle('hidden', draft.length > 0 || !pageAvailable);
  managementElements.addBindingButton.disabled = !pageAvailable || !managementState.docs.length;
  managementElements.resetBindingsButton.disabled = !pageAvailable;
  managementElements.saveBindingsButton.disabled = !pageAvailable;

  draft.forEach((binding, index) => {
    const item = document.createElement('article');
    item.className = 'binding-editor-item';

    const heading = document.createElement('div');
    heading.className = 'binding-editor-heading';
    const title = document.createElement('strong');
    title.textContent = binding.title || `关联 ${index + 1}`;
    const actions = document.createElement('div');
    const primaryLabel = document.createElement('label');
    primaryLabel.className = 'primary-toggle';
    const primary = document.createElement('input');
    primary.type = 'checkbox';
    primary.checked = Boolean(binding.primary);
    primary.addEventListener('change', () => {
      managementState.bindingDraft.forEach((itemBinding, bindingIndex) => {
        itemBinding.primary = primary.checked && bindingIndex === index;
      });
      renderBindingEditor();
    });
    primaryLabel.append(primary, document.createTextNode('主 PRD'));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger-text-action';
    remove.textContent = '移除';
    remove.addEventListener('click', () => {
      managementState.bindingDraft.splice(index, 1);
      if (binding.primary && managementState.bindingDraft[0]) {
        managementState.bindingDraft[0].primary = true;
      }
      renderBindingEditor();
    });
    actions.append(primaryLabel, remove);
    heading.append(title, actions);

    const fields = document.createElement('div');
    fields.className = 'binding-editor-fields';
    fields.append(
      createField('PRD 文件', createDocumentSelect(binding, index)),
      createField('显示名称', createTextInput(binding.title, 'title', index, '默认使用文档标题')),
      createField('分组', createTextInput(binding.category, 'category', index, '例如 履约流程')),
      createField('默认章节', createTextInput(binding.anchor, 'anchor', index, '必须与 Markdown 标题一致')),
      createField('顺序', createTextInput(binding.order || index + 1, 'order', index)),
    );
    item.append(heading, fields);
    managementElements.bindingList.append(item);
  });
}

function addBinding() {
  if (!managementState.currentPage) return;
  const usedDocuments = new Set(managementState.bindingDraft.map((binding) => binding.document));
  const documentMeta = managementState.docs.find((item) => !usedDocuments.has(item.path));
  if (!documentMeta) {
    showManagementNotice('没有可继续添加的 PRD 文件。', 'warning');
    return;
  }
  managementState.bindingDraft.push({
    page: managementState.currentPage.path,
    document: documentMeta.path,
    title: documentMeta.title,
    category: managementState.bindingDraft.length ? '关联 PRD' : '页面主 PRD',
    order: managementState.bindingDraft.length + 1,
    primary: managementState.bindingDraft.length === 0,
  });
  renderBindingEditor();
  managementElements.bindingList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function saveBindings() {
  if (!managementState.currentPage) return;
  managementElements.saveBindingsButton.disabled = true;
  try {
    await writeConfiguration('/api/page-bindings', {
      page: managementState.currentPage.path,
      bindings: managementState.bindingDraft,
    });
    showManagementNotice('PRD 关联已保存。');
    publishCommand('refresh');
  } catch (error) {
    showManagementNotice(error.message, 'error');
  } finally {
    managementElements.saveBindingsButton.disabled = false;
  }
}

function ruleForCurrentPage() {
  const pagePath = managementState.currentPage?.path;
  return pagePath ? managementState.pageRules[pagePath] || null : null;
}

function selectorLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderAdapterForm() {
  const pageAvailable = Boolean(managementState.currentPage);
  const rule = ruleForCurrentPage() || {};
  managementElements.contentRoot.value = rule.contentRoot || '';
  managementElements.layoutMode.value = rule.layoutMode || 'auto';
  managementElements.hideSelectors.value = (rule.hideSelectors || []).join('\n');
  managementElements.excludeSelectors.value = (rule.excludeGlobalSelectors || []).join('\n');
  managementElements.resetPageRuleButton.disabled = !pageAvailable || !ruleForCurrentPage();
  managementElements.savePageRuleButton.disabled = !pageAvailable;
  managementElements.reapplyLayoutButton.disabled = !pageAvailable || managementState.rawPrototype;
  managementElements.toggleRawPageButton.disabled = !pageAvailable;
  managementElements.toggleRawPageButton.textContent = managementState.rawPrototype
    ? '返回适配页面'
    : '查看原始页面';
  renderDiagnostics();
}

async function savePageRule(rule) {
  if (!managementState.currentPage) return;
  managementElements.savePageRuleButton.disabled = true;
  try {
    await writeConfiguration('/api/page-rule', {
      page: managementState.currentPage.path,
      rule,
    });
    showManagementNotice(rule ? '页面适配规则已保存。' : '已恢复自动适配。');
    publishCommand('refresh');
  } catch (error) {
    showManagementNotice(error.message, 'error');
  } finally {
    managementElements.savePageRuleButton.disabled = false;
  }
}

function collectPageRule() {
  const contentRoot = managementElements.contentRoot.value.trim();
  const layoutMode = managementElements.layoutMode.value;
  if (layoutMode === 'content' && !contentRoot) {
    throw new Error('指定内容区模式必须填写内容根节点。');
  }
  return {
    contentRoot,
    layoutMode,
    hideSelectors: selectorLines(managementElements.hideSelectors.value),
    excludeGlobalSelectors: selectorLines(managementElements.excludeSelectors.value),
  };
}

function normalizeBrandingDraft(value = {}) {
  const themeColor = /^#[0-9a-f]{6}$/i.test(value.themeColor || '')
    ? value.themeColor.toUpperCase()
    : MANAGEMENT_DEFAULT_BRANDING.themeColor;
  return {
    name: String(value.name ?? MANAGEMENT_DEFAULT_BRANDING.name).trim(),
    subtitle: String(value.subtitle ?? MANAGEMENT_DEFAULT_BRANDING.subtitle).trim(),
    themeColor,
  };
}

function renderBrandingPreview(branding) {
  const draft = normalizeBrandingDraft(branding);
  managementElements.brandingPreview.style.setProperty('--preview-brand', draft.themeColor);
  managementElements.brandingPreviewName.textContent = draft.name || MANAGEMENT_DEFAULT_BRANDING.name;
  managementElements.brandingPreviewSubtitle.textContent = draft.subtitle || ' ';
  managementElements.brandingPreviewMark.textContent = (draft.name || MANAGEMENT_DEFAULT_BRANDING.name).slice(0, 1).toUpperCase();
  managementElements.brandingPreviewAction.style.borderColor = draft.themeColor;
  managementElements.brandingPreviewAction.style.color = draft.themeColor;
}

function renderBrandingForm() {
  const branding = normalizeBrandingDraft(managementState.branding);
  managementElements.brandingName.value = branding.name;
  managementElements.brandingSubtitle.value = branding.subtitle;
  managementElements.brandingColorPicker.value = branding.themeColor;
  managementElements.brandingThemeColor.value = branding.themeColor;
  renderBrandingPreview(branding);
}

function collectBranding() {
  const name = managementElements.brandingName.value.trim();
  const subtitle = managementElements.brandingSubtitle.value.trim();
  const themeColor = managementElements.brandingThemeColor.value.trim().toUpperCase();
  if (!name) throw new Error('项目名称不能为空。');
  if (name.length > 64 || subtitle.length > 64) throw new Error('项目名称和副标题不能超过 64 个字符。');
  if (!/^#[0-9A-F]{6}$/.test(themeColor)) throw new Error('主题色格式不正确，请填写例如 #0879B0。');
  return { name, subtitle, themeColor };
}

async function saveBranding() {
  let branding;
  try {
    branding = collectBranding();
  } catch (error) {
    showManagementNotice(error.message, 'warning');
    return;
  }
  managementElements.saveBrandingButton.disabled = true;
  try {
    await writeConfiguration('/api/branding', { branding });
    managementState.branding = branding;
    renderBrandingForm();
    showManagementNotice('外壳外观已保存。');
    publishCommand('refresh');
  } catch (error) {
    showManagementNotice(error.message, 'error');
  } finally {
    managementElements.saveBrandingButton.disabled = false;
  }
}

function normalizeMenuDraft(value = {}) {
  return {
    groupByFolder: value.groupByFolder !== false,
    labelSource: value.labelSource === 'filename' ? 'filename' : 'title',
    compactTitle: value.compactTitle !== false,
  };
}

function renderMenuForm() {
  const menu = normalizeMenuDraft(managementState.menu);
  managementElements.menuGroupByFolder.checked = menu.groupByFolder;
  managementElements.menuLabelSource.value = menu.labelSource;
  managementElements.menuCompactTitle.checked = menu.compactTitle;
}

function collectMenu() {
  return {
    groupByFolder: managementElements.menuGroupByFolder.checked,
    labelSource: managementElements.menuLabelSource.value,
    compactTitle: managementElements.menuCompactTitle.checked,
  };
}

async function saveMenu() {
  managementElements.saveMenuButton.disabled = true;
  try {
    const menu = collectMenu();
    await writeConfiguration('/api/menu', { menu });
    managementState.menu = menu;
    showManagementNotice('菜单设置已保存。');
    publishCommand('refresh');
  } catch (error) {
    showManagementNotice(error.message, 'error');
  } finally {
    managementElements.saveMenuButton.disabled = false;
  }
}

function createHealthGroup(title, items, formatItem, tone = 'neutral') {
  if (!items?.length) return null;
  const details = document.createElement('details');
  details.className = 'health-group';
  details.dataset.tone = tone;
  if (tone === 'error') details.open = true;
  const summary = document.createElement('summary');
  const label = document.createElement('span');
  label.textContent = title;
  const count = document.createElement('strong');
  count.textContent = String(items.length);
  summary.append(label, count);
  const list = document.createElement('ul');
  items.slice(0, 60).forEach((item) => {
    const row = document.createElement('li');
    row.textContent = formatItem(item);
    list.append(row);
  });
  if (items.length > 60) {
    const remaining = document.createElement('li');
    remaining.textContent = `另有 ${items.length - 60} 项未展开`;
    list.append(remaining);
  }
  details.append(summary, list);
  return details;
}

function renderHealth() {
  const health = managementState.health;
  managementElements.healthSummary.replaceChildren();
  managementElements.healthGroups.replaceChildren();
  if (!health) {
    managementElements.healthSummary.textContent = '等待扫描结果。';
    return;
  }

  const facts = [
    ['业务页面', health.summary.pages],
    ['PRD 文档', health.summary.documents],
    ['关联关系', health.summary.bindings],
    ['结构问题', health.summary.issueCount],
  ];
  facts.forEach(([label, value]) => {
    const item = document.createElement('div');
    const number = document.createElement('strong');
    number.textContent = String(value);
    const copy = document.createElement('span');
    copy.textContent = label;
    item.append(number, copy);
    managementElements.healthSummary.append(item);
  });

  const groups = [
    createHealthGroup('失效页面路径', health.missingPages, (item) => `${item.page} → ${item.document}`, 'error'),
    createHealthGroup('失效 PRD 路径', health.missingDocuments, (item) => `${item.page} → ${item.document}`, 'error'),
    createHealthGroup('不存在的默认章节', health.missingAnchors, (item) => `${item.document} · ${item.anchor}`, 'error'),
    createHealthGroup('重复关联', health.duplicateBindings, (item) => `${item.page} → ${item.document}`, 'error'),
    createHealthGroup('多个主 PRD', health.multiplePrimaryPages, (item) => `${item.page} · ${item.count} 个`, 'error'),
    createHealthGroup('失效适配规则', health.orphanRules, (item) => item, 'error'),
    createHealthGroup('尚未关联 PRD 的页面', health.unboundPages, (item) => `${item.title} · ${item.path}`, 'warning'),
    createHealthGroup('尚未使用的 PRD', health.orphanDocuments, (item) => `${item.title} · ${item.path}`),
  ].filter(Boolean);

  if (!groups.length) {
    const empty = document.createElement('div');
    empty.className = 'management-empty is-success';
    empty.textContent = '当前页面、文档和关联配置未发现异常。';
    managementElements.healthGroups.append(empty);
    return;
  }
  managementElements.healthGroups.append(...groups);
}

function renderDiagnostics() {
  const pagePath = managementState.currentPage?.path;
  const diagnostic = pagePath ? managementState.diagnostics.get(pagePath) : null;
  const errors = pagePath ? managementState.runtimeErrors.get(pagePath) || [] : [];
  managementElements.diagnosticFacts.replaceChildren();
  managementElements.runtimeErrors.replaceChildren();

  if (managementState.rawPrototype) {
    managementElements.diagnosticStatus.textContent = '当前显示原始页面，适配诊断已暂停';
  } else if (diagnostic) {
    managementElements.diagnosticStatus.textContent = diagnostic.contentHost
      ? '已识别内容区'
      : '尚未识别内容根节点';
  } else {
    managementElements.diagnosticStatus.textContent = '等待页面上报';
  }

  if (diagnostic) {
    const matchedSelectors = (diagnostic.hiddenMatches || []).filter((item) => item.count > 0);
    const facts = [
      ['内容节点', diagnostic.contentHost || '未识别'],
      ['指定节点', diagnostic.requestedContentRoot || '自动识别'],
      ['指定节点命中', diagnostic.requestedContentRoot ? (diagnostic.contentRootMatched ? '是' : '否') : '—'],
      ['隐藏区域', `${matchedSelectors.reduce((total, item) => total + item.count, 0)} 个`],
    ];
    facts.forEach(([term, description]) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = description;
      managementElements.diagnosticFacts.append(dt, dd);
    });
  }

  if (errors.length) {
    const heading = document.createElement('strong');
    heading.textContent = `运行异常 ${errors.length}`;
    const list = document.createElement('ul');
    errors.slice(-12).forEach((error) => {
      const item = document.createElement('li');
      item.textContent = error.message || '未知错误';
      list.append(item);
    });
    managementElements.runtimeErrors.append(heading, list);
  }
}

function renderManagement() {
  const page = managementState.currentPage;
  managementElements.pageTitle.textContent = page?.title || '尚未选择页面';
  managementElements.pagePath.textContent = page?.path || '—';
  setManagementTab(managementState.activeTab);
  renderHealth();
  renderBindingEditor();
  renderAdapterForm();
  renderBrandingForm();
  renderMenuForm();
}

managementElements.tabs.forEach((button) => {
  button.addEventListener('click', () => setManagementTab(button.dataset.managementTab));
});
managementElements.openButton.addEventListener('click', () => setManagementOpen(!managementState.open));
managementElements.closeButton.addEventListener('click', () => setManagementOpen(false));
managementElements.backdrop.addEventListener('click', () => setManagementOpen(false));
managementElements.addBindingButton.addEventListener('click', addBinding);
managementElements.resetBindingsButton.addEventListener('click', resetBindingDraft);
managementElements.saveBindingsButton.addEventListener('click', () => void saveBindings());
managementElements.savePageRuleButton.addEventListener('click', () => {
  try {
    void savePageRule(collectPageRule());
  } catch (error) {
    showManagementNotice(error.message, 'warning');
  }
});
managementElements.resetPageRuleButton.addEventListener('click', () => void savePageRule(null));
managementElements.reapplyLayoutButton.addEventListener('click', () => publishCommand('reapply-layout'));
managementElements.toggleRawPageButton.addEventListener('click', () => {
  publishCommand('reload-page', { raw: !managementState.rawPrototype });
});
managementElements.brandingName.addEventListener('input', () => {
  renderBrandingPreview({
    name: managementElements.brandingName.value,
    subtitle: managementElements.brandingSubtitle.value,
    themeColor: managementElements.brandingThemeColor.value,
  });
});
managementElements.brandingSubtitle.addEventListener('input', () => {
  renderBrandingPreview({
    name: managementElements.brandingName.value,
    subtitle: managementElements.brandingSubtitle.value,
    themeColor: managementElements.brandingThemeColor.value,
  });
});
managementElements.brandingColorPicker.addEventListener('input', () => {
  managementElements.brandingThemeColor.value = managementElements.brandingColorPicker.value.toUpperCase();
  renderBrandingPreview({
    name: managementElements.brandingName.value,
    subtitle: managementElements.brandingSubtitle.value,
    themeColor: managementElements.brandingThemeColor.value,
  });
});
managementElements.brandingThemeColor.addEventListener('input', () => {
  const value = managementElements.brandingThemeColor.value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(value)) managementElements.brandingColorPicker.value = value;
  renderBrandingPreview({
    name: managementElements.brandingName.value,
    subtitle: managementElements.brandingSubtitle.value,
    themeColor: value,
  });
});
managementElements.resetBrandingButton.addEventListener('click', () => {
  managementState.branding = { ...MANAGEMENT_DEFAULT_BRANDING };
  renderBrandingForm();
});
managementElements.saveBrandingButton.addEventListener('click', () => void saveBranding());
managementElements.resetMenuButton.addEventListener('click', () => {
  managementState.menu = { ...MANAGEMENT_DEFAULT_MENU };
  renderMenuForm();
});
managementElements.saveMenuButton.addEventListener('click', () => void saveMenu());

window.addEventListener('prototype-shell:bootstrap', (event) => {
  const detail = event.detail || {};
  managementState.pages = detail.pages || [];
  managementState.docs = detail.docs || [];
  managementState.bindings = detail.bindings || [];
  managementState.pageRules = detail.pageRules || {};
  managementState.health = detail.health || null;
  managementState.branding = normalizeBrandingDraft(detail.branding);
  managementState.menu = normalizeMenuDraft(detail.menu);
  resetBindingDraft();
  if (managementState.open) renderManagement();
});

window.addEventListener('prototype-shell:page-change', (event) => {
  managementState.currentPage = event.detail?.page || null;
  managementState.rawPrototype = false;
  resetBindingDraft();
  if (managementState.open) renderManagement();
});

window.addEventListener('prototype-shell:prototype-mode', (event) => {
  managementState.rawPrototype = Boolean(event.detail?.raw);
  if (managementState.open) renderAdapterForm();
});

window.addEventListener('prototype-shell:diagnostic', (event) => {
  const { type, page, detail } = event.detail || {};
  if (!page) return;
  if (type === 'layout') managementState.diagnostics.set(page, detail || {});
  if (type === 'error') {
    const errors = managementState.runtimeErrors.get(page) || [];
    errors.push({ ...detail, recordedAt: Date.now() });
    managementState.runtimeErrors.set(page, errors.slice(-30));
  }
  if (managementState.open && managementState.currentPage?.path === page) renderDiagnostics();
});

document.addEventListener(
  'keydown',
  (event) => {
    if (isManagementShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      setManagementOpen(!managementState.open);
      return;
    }
    if (event.key === 'Escape' && managementState.open) {
      event.preventDefault();
      event.stopPropagation();
      setManagementOpen(false);
      return;
    }
    if (event.key === 'Tab' && managementState.open) {
      const focusable = [...managementElements.panel.querySelectorAll('button, input, select, textarea')]
        .filter((element) => !element.disabled && !element.closest('.hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  },
  true,
);
