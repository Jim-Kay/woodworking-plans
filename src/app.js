import { CANVAS_CATALOG, DEFAULT_PLAN, Z_CLIP_CATALOG } from './catalogs.js';
import { applyMountingRules, applyOuterSize, calculatePlan, clonePlan, formatLength, fromInches, getStageLabels, normalizeBuild, toInches } from './frameMath.js';
import { PLAN_CATALOG, buildForPlanId, getPlanDefinition, planIdForBuild, resolvePlanId } from './plans.js';
import { calculateShelfPlan } from './shelfMath.js';
import { generateOpenScad } from './openScad.js';
import { runPhysicsDiagnostic } from './physicsSim.js';
import { FrameViewer } from './viewer3d.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const PLAN_STORAGE_KEY = 'floatingFramePlanner:lastState';
let purchaseBoardLength = 96;
let buildStepAnimationViewers = [];
let modalBuildStepAnimation = null;
let modalBuildStepPageOverflow = null;

const fields = {
  canvasW: $('#canvasW'),
  canvasH: $('#canvasH'),
  canvasT: $('#canvasT'),
  stretcherW: $('#stretcherW'),
  outerW: $('#outerW'),
  outerH: $('#outerH'),
  face: $('#face'),
  reveal: $('#reveal'),
  depth: $('#depth'),
  faceLip: $('#faceLip'),
  linerW: $('#linerW'),
  strainerDepth: $('#strainerDepth'),
  stock: $('#stock'),
  kerf: $('#kerf'),
  rabbet: $('#rabbet'),
  finishColor: $('#finishColor'),
  finishSheen: $('#finishSheen'),
  canvasAppearance: $('#canvasAppearance'),
  mountClip: $('#mountClip'),
  shelfW: $('#shelfW'),
  shelfH: $('#shelfH'),
  shelfD: $('#shelfD'),
  shelfLevels: $('#shelfLevels'),
  shelfBays: $('#shelfBays'),
  shelfSlats: $('#shelfSlats'),
  shelfPost: $('#shelfPost'),
  shelfRail: $('#shelfRail'),
  shelfDeck: $('#shelfDeck'),
  toteW: $('#toteW'),
  toteLipWidth: $('#toteLipWidth'),
  toteD: $('#toteD'),
  toteH: $('#toteH'),
  toteColumns: $('#toteColumns'),
  toteRows: $('#toteRows'),
  toteSideClearance: $('#toteSideClearance'),
  toteVerticalClearance: $('#toteVerticalClearance'),
  toteRailInset: $('#toteRailInset')
};

const cameraFields = {
  x: $('#cameraX'),
  y: $('#cameraY'),
  z: $('#cameraZ'),
  targetX: $('#targetX'),
  targetY: $('#targetY'),
  targetZ: $('#targetZ')
};

const STRING_PLAN_KEYS = ['unit', 'join', 'build', 'finishColor', 'finishSheen', 'canvasAppearance', 'modelPalette', 'modelOpacity', 'modelScene', 'mountMethod', 'mountClip'];
const BOOLEAN_PLAN_KEYS = ['showDimensions'];

const urlParams = new URLSearchParams(window.location.search);
const urlPlan = hydratePlanFromUrl();
const savedState = urlPlan ? null : hydratePlanFromStorage();
let currentPlanId = resolvePlanId(urlParams.get('plan') || (urlPlan ? planIdForBuild(urlPlan.build) : savedState?.planId) || planIdForBuild(savedState?.plan?.build));
if (currentPlanId === 'rolling-storage-shelf') purchaseBoardLength = 48;
const shouldShowCatalog = !urlParams.toString();
let plan = urlPlan || savedState?.plan || clonePlan(DEFAULT_PLAN);
if (!urlPlan && !savedState?.plan) Object.assign(plan, getPlanDefinition(currentPlanId).defaults || {});
plan.build = buildForPlanId(currentPlanId);
plan = applyPlanRules(plan);
let result = calculateCurrentPlan();
const viewer = new FrameViewer($('#viewport'));
viewer.onCameraChange(() => {
  renderCameraInputs();
  savePlanState();
});

init();

function init() {
  renderPlanCatalog();
  populateClipOptions();
  populateCanvasPresets();
  bindInputs();
  render();
  restoreSavedView();
  if (shouldShowCatalog) showCatalog();
  else showPlanner();
}

function bindInputs() {
  $('#btnPlanCatalog').addEventListener('click', showCatalog);
  $('#btnPlanCatalogTop').addEventListener('click', showCatalog);
  $('#btnResumePlan').addEventListener('click', showPlanner);
  $('#planGrid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-plan-id]');
    if (!card || card.dataset.status !== 'ready') return;
    selectPlan(card.dataset.planId);
  });

  Object.entries(fields).forEach(([key, el]) => {
    if (!el) return;
    el.addEventListener('input', () => {
      if (key === 'outerW' || key === 'outerH') {
        const outerW = toInches(fields.outerW.value, plan.unit);
        const outerH = toInches(fields.outerH.value, plan.unit);
        plan = applyOuterSize(plan, outerW, outerH);
      } else if (key === 'finishColor' || key === 'finishSheen' || key === 'canvasAppearance' || key === 'mountClip') {
        plan[key] = el.value;
      } else if (['shelfLevels', 'shelfBays', 'shelfSlats', 'toteColumns', 'toteRows'].includes(key)) {
        plan[key] = Number(el.value);
      } else {
        plan[key] = toInches(el.value, plan.unit);
      }
      plan = applyPlanRules(plan);
      render();
    });
  });

  $('#btnCalculate').addEventListener('click', render);
  $('#btnReset').addEventListener('click', () => {
    plan = clonePlan(DEFAULT_PLAN);
    Object.assign(plan, getPlanDefinition(currentPlanId).defaults || {});
    plan.build = buildForPlanId(currentPlanId);
    plan = applyPlanRules(plan);
    render();
  });
  $('#btnShare').addEventListener('click', copyShareLink);
  $('#btnOpenAdvanced').addEventListener('click', () => $('#advancedDialog').showModal());
  $('#btnSelectCanvas').addEventListener('click', () => $('#canvasDialog').showModal());
  $('#btnCloseBuildAnimation').addEventListener('click', () => $('#buildAnimationDialog').close());
  $('#buildAnimationDialog').addEventListener('close', cleanupModalBuildStepAnimation);
  $('#btnExportCsv').addEventListener('click', exportCsv);
  $('#btnCopyList').addEventListener('click', copyCutList);
  $('#btnPrint').addEventListener('click', printPlan);
  $('#btnCopyScad').addEventListener('click', copyOpenScad);
  $('#btnDownloadScad').addEventListener('click', downloadOpenScad);
  $('#btnRunPhysics').addEventListener('click', runPhysicsCheck);
  $('#purchaseBoardLength').addEventListener('change', (event) => {
    purchaseBoardLength = Number(event.target.value) || 96;
    renderPurchaseEstimate();
  });
  $('#btnCameraApply').addEventListener('click', applyCameraFromInputs);
  $('#btnTargetReset').addEventListener('click', resetCameraTarget);
  $('#btnProjectionToggle').addEventListener('click', () => {
    viewer.toggleProjectionMode();
    renderProjectionToggle();
    renderCameraInputs();
  });
  $('#btnFixClip').addEventListener('click', () => {
    plan = applyPlanRules(plan);
    render();
  });
  $('#modelPalette').addEventListener('change', (event) => {
    plan.modelPalette = event.target.value;
    viewer.manualCamera = true;
    render();
  });
  $('#modelTransparent').addEventListener('change', (event) => {
    plan.modelOpacity = event.target.checked ? 'transparent' : 'opaque';
    viewer.manualCamera = true;
    render();
  });
  $('#modelScene').addEventListener('change', (event) => {
    plan.modelScene = event.target.value;
    viewer.manualCamera = true;
    render();
  });
  $('#showDimensions').addEventListener('change', (event) => {
    plan.showDimensions = event.target.checked;
    viewer.manualCamera = true;
    render();
  });

  $('#stageSlider').addEventListener('input', (event) => {
    plan.stage = Number(event.target.value);
    render();
  });

  $('#unitsToggle').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-unit]');
    if (!button) return;
    plan.unit = button.dataset.unit;
    render();
  });

  $('#joinToggle').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-join]');
    if (!button) return;
    plan.join = button.dataset.join;
    render();
  });

  $('#mountToggle').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-mount]');
    if (!button) return;
    plan.mountMethod = button.dataset.mount;
    if (plan.mountMethod === 'clips' && plan.mountClip === 'none') plan.mountClip = String(Z_CLIP_CATALOG[0].offset);
    plan = applyPlanRules(plan);
    render();
  });

  $('#btnRefreshBuildSteps').addEventListener('click', () => renderBuildSteps(true));
  $('#buildStepsPanel').addEventListener('click', (event) => {
    const button = event.target.closest('[data-build-animation-fullscreen]');
    if (button) openBuildAnimationDialog(button.dataset.buildAnimationFullscreen, button.dataset.buildAnimationTitle);
  });

  $$('#tabBuilder, #tabCutList, #tabBuildSteps, #tabOpenScad, #tabPhysics').forEach((button) => {
    button.addEventListener('click', () => {
      showTab(button.id.replace('tab', '').toLowerCase());
    });
  });

  $$('[data-vis]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      plan.vis[checkbox.dataset.vis] = checkbox.checked;
      viewer.manualCamera = true;
      render();
    });
  });

  $$('[data-camera-preset]').forEach((button) => {
    button.addEventListener('click', () => applyCameraPreset(button.dataset.cameraPreset));
  });
}

function renderPlanCatalog() {
  $('#planGrid').innerHTML = PLAN_CATALOG.map((item) => `
    <article class="planCard ${item.status !== 'ready' ? 'disabled' : ''}" data-plan-id="${escapeHtml(item.id)}" data-status="${escapeHtml(item.status)}">
      <div class="planThumb">${planThumbnail(item.thumbnail)}</div>
      <div class="planCardBody">
        <div class="planCardMeta">
          <span>${escapeHtml(item.family)}</span>
          <span class="badge ${item.status === 'ready' ? 'ok' : ''}">${item.status === 'ready' ? 'Ready' : 'Coming soon'}</span>
        </div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.summary)}</p>
        <p class="planMaterials">${escapeHtml(item.materials)}</p>
        ${renderCatalogDetails(item.details)}
        <div class="planTags">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
    </article>
  `).join('');
  $('#btnResumePlan').classList.toggle('hidden', !savedState);
}

function showCatalog() {
  $('#planCatalog').classList.remove('hidden');
  $('#plannerApp').classList.add('hidden');
}

function showPlanner() {
  $('#planCatalog').classList.add('hidden');
  $('#plannerApp').classList.remove('hidden');
  showTab(urlParams.get('view') || 'builder');
  requestAnimationFrame(() => viewer.resize());
}

function showTab(activeTab) {
  if (!['builder', 'cutlist', 'buildsteps', 'openscad', 'physics'].includes(activeTab)) activeTab = 'builder';
  const showBuilder = activeTab === 'builder';
  const showCutList = activeTab === 'cutlist';
  const showBuildSteps = activeTab === 'buildsteps';
  const showOpenScad = activeTab === 'openscad';
  const showPhysics = activeTab === 'physics';
  $('#tabBuilder').classList.toggle('active', showBuilder);
  $('#tabCutList').classList.toggle('active', showCutList);
  $('#tabBuildSteps').classList.toggle('active', showBuildSteps);
  $('#tabOpenScad').classList.toggle('active', showOpenScad);
  $('#tabPhysics').classList.toggle('active', showPhysics);
  $('#builderView').classList.toggle('hidden', !showBuilder);
  $('#cutView').classList.toggle('hidden', !showCutList);
  $('#buildStepsView').classList.toggle('hidden', !showBuildSteps);
  $('#scadView').classList.toggle('hidden', !showOpenScad);
  $('#physicsView').classList.toggle('hidden', !showPhysics);
  if (showBuilder) requestAnimationFrame(() => viewer.resize());
  if (showBuildSteps) renderBuildSteps(true);
  else cleanupBuildStepAnimations();
}

function selectPlan(planId) {
  currentPlanId = resolvePlanId(planId);
  purchaseBoardLength = currentPlanId === 'rolling-storage-shelf' ? 48 : 96;
  const next = clonePlan(DEFAULT_PLAN);
  Object.assign(next, getPlanDefinition(currentPlanId).defaults || {});
  next.build = buildForPlanId(currentPlanId);
  plan = applyPlanRules(next);
  plan.stage = 0;
  viewer.manualCamera = false;
  render();
  showPlanner();
}

function planThumbnail(kind) {
  if (kind === 'frame-strainer') {
    return `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="8" fill="#0c1117"/><path d="M54 44h212l22 22v78H76L54 122z" fill="#5d3a25"/><path d="M80 66h166l16 16v42H96L80 108z" fill="#151923"/><path d="M92 76h142l10 10v28H102L92 104z" fill="#c79b5f"/><path d="M94 75h150" stroke="#f0c878" stroke-width="5"/><rect x="110" y="80" width="112" height="26" fill="#f4efe4" opacity=".9"/><path d="M54 122l22 22h212M266 44l22 22" stroke="#1d2635" stroke-width="2"/></svg>`;
  }
  if (kind === 'shelves') {
    return `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="8" fill="#0c1117"/><g stroke="#d7b982" stroke-width="8" stroke-linecap="square"><path d="M38 38h244M38 92h244M38 146h244M48 30v126M130 30v126M212 30v126M282 30v126"/></g><g stroke="#9d7048" stroke-width="3"><path d="M38 47h244M38 101h244M38 155h244"/></g><rect x="42" y="28" width="240" height="130" fill="none" stroke="#263449" stroke-width="2"/></svg>`;
  }
  if (kind === 'rolling-shelves') {
    return `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="8" fill="#0c1117"/><g fill="#d7b982"><rect x="70" y="36" width="18" height="118"/><rect x="232" y="36" width="18" height="118"/><rect x="92" y="42" width="136" height="14"/><rect x="92" y="86" width="136" height="14"/><rect x="92" y="130" width="136" height="14"/></g><g fill="#b98a56"><rect x="84" y="58" width="152" height="18" opacity=".95"/><rect x="84" y="102" width="152" height="18" opacity=".95"/><rect x="84" y="146" width="152" height="14" opacity=".95"/></g><g fill="#7d8798"><circle cx="78" cy="166" r="10"/><circle cx="242" cy="166" r="10"/></g><path d="M70 95h18M232 95h18" stroke="#263449" stroke-width="2"/></svg>`;
  }
  if (kind === 'tote-rack') {
    return `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="8" fill="#0c1117"/><g stroke="#d7b982" stroke-width="8" stroke-linecap="square"><path d="M42 34h236M42 86h236M42 138h236M50 28v122M270 28v122"/></g><g fill="#111827" stroke="#facc15" stroke-width="4"><rect x="66" y="46" width="48" height="26" rx="3"/><rect x="136" y="46" width="48" height="26" rx="3"/><rect x="206" y="46" width="48" height="26" rx="3"/><rect x="66" y="98" width="48" height="26" rx="3"/><rect x="136" y="98" width="48" height="26" rx="3"/><rect x="206" y="98" width="48" height="26" rx="3"/></g><g fill="#facc15"><rect x="62" y="42" width="56" height="8" rx="2"/><rect x="132" y="42" width="56" height="8" rx="2"/><rect x="202" y="42" width="56" height="8" rx="2"/><rect x="62" y="94" width="56" height="8" rx="2"/><rect x="132" y="94" width="56" height="8" rx="2"/><rect x="202" y="94" width="56" height="8" rx="2"/></g></svg>`;
  }
  return `<svg viewBox="0 0 320 190" aria-hidden="true"><rect width="320" height="190" rx="8" fill="#0c1117"/><path d="M52 48h210l24 24v70H76L52 118z" fill="#6b432a"/><path d="M82 72h150l20 18v30H102L82 104z" fill="#f4efe4"/><path d="M98 82h124l14 12v16H112L98 98z" fill="#91b6e8"/><path d="M52 118l24 24h210M262 48l24 24" stroke="#1d2635" stroke-width="2"/><path d="M80 142h176" stroke="#c79b5f" stroke-width="9"/></svg>`;
}

function render() {
  currentPlanId = planIdForBuild(plan.build);
  result = calculateCurrentPlan();
  $('#appTitle').textContent = getPlanDefinition(currentPlanId).title;
  renderFields();
  renderToggles();
  renderDimensionSummary();
  renderPlanDetails();
  renderStatus();
  renderCutList();
  renderOpenScad();
  renderPhysics();
  renderStage();
  viewer.update(plan, result);
  renderBuildSteps();
  renderCameraInputs();
  renderProjectionToggle();
  savePlanState();
}

function renderCatalogDetails(details) {
  if (!details) return '';
  const tools = (details.tools || []).slice(0, 2).join(', ');
  const notes = (details.notes || []).slice(0, 1).join(' ');
  const rows = [
    tools ? ['Tools', tools] : null,
    notes ? ['Note', notes] : null
  ].filter(Boolean);
  if (!rows.length) return '';
  return `
    <dl class="planCardDetails">
      ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}
    </dl>
  `;
}

function calculateCurrentPlan() {
  return isShelfPlan() ? calculateShelfPlan(plan) : calculatePlan(plan);
}

function applyPlanRules(nextPlan) {
  return isShelfPlan() || ['shelves', 'tote-rack'].includes(nextPlan.build) ? nextPlan : applyMountingRules(nextPlan);
}

function isShelfPlan() {
  return currentPlanId === 'basement-shelves' || currentPlanId === 'rolling-storage-shelf' || currentPlanId === 'tote-rack-27' || plan.build === 'shelves' || plan.build === 'rolling-shelves' || plan.build === 'tote-rack';
}

function renderFields() {
  const numericKeys = ['canvasW', 'canvasH', 'canvasT', 'stretcherW', 'face', 'reveal', 'depth', 'faceLip', 'linerW', 'strainerDepth', 'stock', 'kerf', 'rabbet', 'shelfW', 'shelfH', 'shelfD', 'shelfLevels', 'shelfBays', 'shelfSlats', 'shelfPost', 'shelfRail', 'shelfDeck', 'toteW', 'toteLipWidth', 'toteD', 'toteH', 'toteColumns', 'toteRows', 'toteSideClearance', 'toteVerticalClearance', 'toteRailInset'];
  numericKeys.forEach((key) => {
    const displayValue = plan.build === 'rolling-shelves' && key === 'shelfDeck' && result?.deck ? result.deck : plan[key];
    const isCount = ['shelfLevels', 'shelfBays', 'shelfSlats', 'toteColumns', 'toteRows'].includes(key);
    if (fields[key] && document.activeElement !== fields[key]) fields[key].value = isCount ? displayValue : roundDisplay(fromInches(displayValue, plan.unit));
  });
  if (fields.outerW && document.activeElement !== fields.outerW) fields.outerW.value = roundDisplay(fromInches(result.outerW, plan.unit));
  if (fields.outerH && document.activeElement !== fields.outerH) fields.outerH.value = roundDisplay(fromInches(result.outerH, plan.unit));
  if (fields.finishColor) fields.finishColor.value = plan.finishColor;
  if (fields.finishSheen) fields.finishSheen.value = plan.finishSheen;
  const rolling = plan.build === 'rolling-shelves';
  const toteRack = plan.build === 'tote-rack';
  fields.shelfBays?.closest('label')?.classList.toggle('hidden', rolling || toteRack);
  fields.shelfSlats?.closest('label')?.classList.toggle('hidden', toteRack);
  const deckLabel = fields.shelfDeck?.closest('label')?.querySelector('.labelRow');
  if (deckLabel?.firstChild) deckLabel.firstChild.textContent = rolling ? 'Plank width' : 'Deck board';
  fields.shelfDeck?.closest('label')?.classList.toggle('hidden', toteRack);
  if (fields.canvasAppearance) fields.canvasAppearance.value = plan.canvasAppearance;
  if (fields.mountClip) fields.mountClip.value = plan.mountClip;
  $$('[data-frame-controls]').forEach((el) => el.classList.toggle('hidden', isShelfPlan()));
  $$('[data-shelf-controls]').forEach((el) => el.classList.toggle('hidden', !isShelfPlan()));
  $$('[data-tote-controls]').forEach((el) => el.classList.toggle('hidden', !toteRack));
  $$('[data-shelf-controls]').forEach((el) => {
    const title = el.querySelector('.quickSectionTitle span')?.textContent || '';
    if (title === 'Shelf Size') el.classList.toggle('hidden', !isShelfPlan() || toteRack);
  });
  if (fields.linerW) {
    fields.linerW.disabled = true;
    fields.linerW.title = ['liner', 'strainer'].includes(normalizeBuild(plan.build))
      ? 'Derived from selected mounting hardware, stretcher width, and reveal.'
      : '';
  }
  document.querySelector('[data-liner-width-label]')?.classList.toggle('hidden', normalizeBuild(plan.build) === 'strainer');
  document.querySelector('[data-strainer-depth-label]')?.classList.toggle('hidden', normalizeBuild(plan.build) !== 'strainer');
  const linerLabel = document.querySelector('[data-support-label]');
  if (linerLabel) linerLabel.firstChild.textContent = normalizeBuild(plan.build) === 'strainer' ? 'Strainer' : 'Liner';
  document.querySelectorAll('[data-vis-label="liner"]').forEach((label) => {
    label.textContent = normalizeBuild(plan.build) === 'strainer' ? 'Strainer' : 'Liner';
  });
  if (isShelfPlan()) {
    document.querySelector('[data-stage-part="primary"]').textContent = 'Posts';
    document.querySelector('[data-stage-part="support"]').textContent = 'Rails';
    document.querySelector('[data-stage-part="surface"]').textContent = toteRack ? 'Totes' : 'Slats';
    document.querySelector('[data-stage-part="hardware"]').textContent = 'Fasteners';
  } else {
    document.querySelector('[data-stage-part="primary"]').textContent = 'Frame';
    document.querySelector('[data-stage-part="support"]').textContent = normalizeBuild(plan.build) === 'strainer' ? 'Strainer' : 'Liner';
    document.querySelector('[data-stage-part="surface"]').textContent = 'Canvas';
    document.querySelector('[data-stage-part="hardware"]').textContent = 'Hardware';
  }
  fields.mountClip.closest('.clipField').classList.toggle('hidden', plan.mountMethod !== 'clips');

  $$('#unitsToggle button').forEach((button) => button.classList.toggle('active', button.dataset.unit === plan.unit));
  Object.entries(plan.vis).forEach(([key, value]) => {
    const checkbox = $(`[data-vis="${key}"]`);
    if (checkbox) checkbox.checked = value;
  });
  $('#modelPalette').value = plan.modelPalette || 'natural';
  $('#modelScene').value = plan.modelScene || 'dark';
  $('#modelTransparent').checked = plan.modelOpacity === 'transparent';
  $('#showDimensions').checked = Boolean(plan.showDimensions);
}

function renderToggles() {
  const viewItems = isShelfPlan()
    ? [
        ['posts', 'Posts'],
        ['rails', 'Rails'],
        ['slats', plan.build === 'tote-rack' ? 'Totes' : 'Slats'],
        ['hardware', 'Fasteners']
      ]
    : [
        ['face', 'Face'],
        ['liner', normalizeBuild(plan.build) === 'strainer' ? 'Strainer' : 'Liner'],
        ['spacers', 'Spacers'],
        ['canvas', 'Canvas'],
        ['hardware', 'Hardware']
      ];
  $$('.view-controls label').forEach((label, index) => {
    const config = viewItems[index];
    label.classList.toggle('hidden', !config);
    if (!config) return;
    const [key, text] = config;
    const input = label.querySelector('input');
    const labelText = label.querySelector('[data-vis-label]');
    input.dataset.vis = key;
    input.checked = plan.vis?.[key] !== false;
    if (labelText) labelText.textContent = text;
  });
  $$('#joinToggle button').forEach((button) => button.classList.toggle('active', button.dataset.join === plan.join));
  $$('#mountToggle button').forEach((button) => button.classList.toggle('active', button.dataset.mount === plan.mountMethod));
  $('#btnFixClip').classList.toggle('hidden', !(plan.mountMethod === 'clips' && result.warnings.length));
}

function renderDimensionSummary() {
  if (isShelfPlan()) {
    if (plan.build === 'tote-rack') {
      const rows = [
        ['Rack size', `${formatLength(result.shelfW, plan.unit)} x ${formatLength(result.shelfH, plan.unit)} x ${formatLength(result.shelfD, plan.unit)}`],
        ['Tote size', `${formatLength(result.toteW, plan.unit)} x ${formatLength(result.toteH, plan.unit)} x ${formatLength(result.toteD, plan.unit)}`],
        ['Tote lip width', formatLength(result.toteLipWidth, plan.unit)],
        ['Runner clear width', formatLength(result.runnerClearWidth, plan.unit)],
        ['Neck clearance', formatLength(result.toteNeckClearance, plan.unit)],
        ['Lip bearing', formatLength(result.lipBearing, plan.unit)],
        ['Tote layout', `${result.columns} wide x ${result.rows} high`],
        ['Lid side gap', formatLength(result.sideClearance, plan.unit)],
        ['Vertical gap', formatLength(result.verticalClearance, plan.unit)],
        ['Rail inset', formatLength(result.railInset, plan.unit)],
        ['Capacity', `${result.capacity} totes`],
        ['Estimated board feet', result.ok ? result.boardFeet.toFixed(2) : '-']
      ];
      $('#dimensionSummary').innerHTML = rows.map(([key, value]) => `<div class="kvitem"><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join('');
      return;
    }
    const rolling = plan.build === 'rolling-shelves';
    const rows = [
      ['Overall size', `${formatLength(plan.shelfW, plan.unit)} x ${formatLength(plan.shelfH, plan.unit)} x ${formatLength(plan.shelfD, plan.unit)}`],
      ['Shelf levels', result.levels],
      ...(rolling ? [['Caster height', formatLength(result.casterHeight || 4, plan.unit)], ['Max cut length', formatLength(result.maxCutLength || 48, plan.unit)]] : [['Bays', result.bays], ['Bay width', formatLength(result.bayWidth, plan.unit)], ['Slats per shelf', result.slats]]),
      ['Post size', `${formatLength(result.post, plan.unit)} x ${formatLength(result.stock, plan.unit)}`],
      ['Rail height', formatLength(plan.shelfRail, plan.unit)],
      ...(rolling ? [['Planks per shelf', result.slats]] : []),
      [rolling ? 'Deck plank width' : 'Deck board width', formatLength(result.deck || plan.shelfDeck, plan.unit)],
      ['Estimated board feet', result.ok ? result.boardFeet.toFixed(2) : '-']
    ];
    $('#dimensionSummary').innerHTML = rows.map(([key, value]) => `<div class="kvitem"><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join('');
    return;
  }
  const rows = [
    ['Canvas', `${formatLength(plan.canvasW, plan.unit)} x ${formatLength(plan.canvasH, plan.unit)} x ${formatLength(plan.canvasT, plan.unit)}`],
    ['Stretcher width', formatLength(plan.stretcherW, plan.unit)],
    ['Reveal gap', formatLength(plan.reveal, plan.unit)],
    ['Face width', formatLength(plan.face, plan.unit)],
    ['Inner opening', `${formatLength(result.innerW, plan.unit)} x ${formatLength(result.innerH, plan.unit)}`],
    ['Outer size', `${formatLength(result.outerW, plan.unit)} x ${formatLength(result.outerH, plan.unit)}`],
    ['Frame depth', formatLength(plan.depth, plan.unit)],
    ['Face lip', formatLength(plan.faceLip, plan.unit)],
    ['Support height', formatLength(result.supportDepth, plan.unit)],
    ...(normalizeBuild(plan.build) === 'strainer' ? [['Strainer depth', formatLength(result.supportThickness, plan.unit)]] : []),
    ['Build method', normalizeBuild(plan.build) === 'strainer' ? 'Strainer on rabbet' : 'Liner rails'],
    ['Mounting', result.effectiveMountMethod],
    ['Estimated board feet', result.ok ? result.boardFeet.toFixed(2) : '-']
  ];
  $('#dimensionSummary').innerHTML = rows.map(([key, value]) => `<div class="kvitem"><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join('');
}

function renderPlanDetails() {
  const definition = getPlanDefinition(currentPlanId);
  const details = definition.details;
  const card = $('#planDetailsCard');
  if (!details) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }
  const sections = [
    ['Materials', details.materials],
    ['Tools', details.tools],
    ['Notes', details.notes]
  ].filter(([, items]) => items?.length);
  card.classList.remove('hidden');
  card.innerHTML = `
    <h2>Plan Notes</h2>
    <p>${escapeHtml(details.description || definition.summary)}</p>
    ${sections.map(([title, items]) => `
      <div class="planDetailSection">
        <h3>${escapeHtml(title)}</h3>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    `).join('')}
  `;
}

function renderStatus() {
  const status = $('#statusBar');
  const badges = [];
  if (result.ok) {
    badges.push(`<span class="badge ok">Ready</span>`);
    if (isShelfPlan()) badges.push(`<span class="badge">Shelves: ${result.levels} levels, ${result.bays} bays</span>`);
    else badges.push(`<span class="badge">Outer: ${escapeHtml(formatLength(result.outerW, plan.unit))} x ${escapeHtml(formatLength(result.outerH, plan.unit))}</span>`);
  }
  result.errors.forEach((error) => badges.push(`<span class="badge err">${escapeHtml(error)}</span>`));
  result.warnings.forEach((warning) => badges.push(`<span class="badge warn">${escapeHtml(warning)}</span>`));
  status.innerHTML = badges.join('');
  const mountStatus = $('#mountStatus');
  if (isShelfPlan()) return;
  mountStatus.textContent = result.effectiveMountMethod === 'Z-clips' ? 'Selected Z-clip fits.' : result.effectiveMountMethod === 'Screws' ? 'Screw mounting active.' : 'No mounting selected.';
  mountStatus.className = `mountStatus ${result.warnings.length ? 'warnText' : 'okText'}`;
}

function renderCutList() {
  const purchaseSelect = $('#purchaseBoardLength');
  if (purchaseSelect) purchaseSelect.value = String(purchaseBoardLength);
  $('#cutTable').innerHTML = result.parts.map((part, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(part.part)}</td>
      <td>${part.qty}</td>
      <td>${escapeHtml(formatLength(part.length, plan.unit))}</td>
      <td>${escapeHtml(formatLength(part.width, plan.unit))}</td>
      <td>${escapeHtml(formatLength(part.thickness, plan.unit))}</td>
      <td>${cutNoteHtml(part)}</td>
    </tr>
  `).join('');
  renderPurchaseEstimate();
}

function renderPurchaseEstimate() {
  const target = $('#purchaseEstimate');
  if (!target) return;
  const estimate = estimateBoardPurchases(result.parts, purchaseBoardLength, plan.kerf || 0);
  if (!estimate.groups.length) {
    target.innerHTML = '<p class="purchaseNote">No board-stock pieces in this cut list.</p>';
    return;
  }
  target.innerHTML = `
    <div class="purchaseSummary">
      <span><b>${estimate.totalBoards}</b> board${estimate.totalBoards === 1 ? '' : 's'} to buy</span>
      <span><b>${escapeHtml(formatLength(estimate.totalPurchased, plan.unit))}</b> purchased length</span>
      <span><b>${escapeHtml(formatLength(estimate.totalWaste, plan.unit))}</b> estimated offcut</span>
    </div>
    ${estimate.tooLong.length ? `<div class="purchaseWarning">${estimate.tooLong.map((item) => `${escapeHtml(item.part)} needs ${escapeHtml(formatLength(item.length, plan.unit))}`).join('; ')}</div>` : ''}
    ${visualCutListHtml(estimate)}
    <table class="purchaseTable">
      <thead><tr><th>Stock</th><th>Boards</th><th>Cut layout</th><th>Offcut</th></tr></thead>
      <tbody>
        ${estimate.groups.map((group) => `
          <tr>
            <td>${escapeHtml(formatLength(group.width, plan.unit))} x ${escapeHtml(formatLength(group.thickness, plan.unit))}</td>
            <td>${group.boards.length}</td>
            <td>${group.boards.map((board, index) => `<div><b>${index + 1}</b>: ${board.pieces.map((piece) => escapeHtml(formatLength(piece.length, plan.unit))).join(' + ')}</div>`).join('')}</td>
            <td>${escapeHtml(formatLength(group.waste, plan.unit))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function visualCutListHtml(estimate) {
  return `
    <div class="visualCutList" aria-label="Visual cut list">
      <div class="visualCutHeader">
        <h3>Visual Cut Layout</h3>
        <span>${escapeHtml(formatLength(purchaseBoardLength, plan.unit))} stock length</span>
      </div>
      ${estimate.groups.map((group) => `
        <section class="visualCutGroup">
          <div class="visualCutGroupTitle">
            <b>${escapeHtml(formatLength(group.width, plan.unit))} x ${escapeHtml(formatLength(group.thickness, plan.unit))}</b>
            <span>${group.boards.length} board${group.boards.length === 1 ? '' : 's'}</span>
          </div>
          ${group.boards.map((board, boardIndex) => visualCutBoardHtml(group, board, boardIndex)).join('')}
        </section>
      `).join('')}
    </div>
  `;
}

function visualCutBoardHtml(group, board, boardIndex) {
  const stockLength = Math.max(1, Number(purchaseBoardLength) || 96);
  const kerf = Math.max(0, Number(plan.kerf) || 0);
  const waste = Math.max(0, stockLength - board.used);
  const segments = [];
  board.pieces.forEach((piece, pieceIndex) => {
    if (pieceIndex && kerf > 0) {
      segments.push({
        className: 'kerf',
        width: percentOfStock(kerf, stockLength),
        label: `Kerf ${formatLength(kerf, plan.unit)}`
      });
    }
    segments.push({
      className: '',
      width: percentOfStock(piece.length, stockLength),
      label: `${piece.part} ${formatLength(piece.length, plan.unit)}`,
      piece
    });
  });
  if (waste > 0.0001) {
    segments.push({
      className: 'waste',
      width: percentOfStock(waste, stockLength),
      label: `Offcut ${formatLength(waste, plan.unit)}`
    });
  }
  return `
    <div class="visualBoard">
      <div class="visualBoardMeta">
        <b>Board ${boardIndex + 1}</b>
        <span>Used ${escapeHtml(formatLength(board.used, plan.unit))}</span>
      </div>
      <div class="visualBar">
        ${segments.map((segment) => `
          <span
            class="visualSegment ${segment.className}"
            style="width:${segment.width}%; ${segment.piece ? `--seg-color:${pieceColor(segment.piece.part, group.width, group.thickness)};` : ''}"
            title="${escapeHtml(segment.label)}"
          >
            ${segment.className ? '' : `<span>${escapeHtml(segment.piece.part)}</span><b>${escapeHtml(formatLength(segment.piece.length, plan.unit))}</b>`}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

function percentOfStock(value, stockLength) {
  return Math.max(0.4, Math.min(100, (value / stockLength) * 100));
}

function pieceColor(partName, width, thickness) {
  const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb7185', '#c084fc'];
  const key = `${partName}:${roundStock(width)}:${roundStock(thickness)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function renderOpenScad() {
  $('#scadOutput').textContent = generateOpenScad({ ...plan, plan: currentPlanId }, result);
}

function renderPhysics() {
  const output = $('#physicsOutput');
  if (!output || output.dataset.reportState === 'running') return;
  output.dataset.reportState = '';
  output.innerHTML = result?.assembly
    ? `${validationSummaryHtml()}<p>Select Run Check to test the current assembly with rigid bodies, gravity, and fastener links.</p>`
    : '<p>This plan does not have a shared assembly model available for physics checks yet.</p>';
}

function renderBuildSteps(force = false) {
  const target = $('#buildStepsPanel');
  if (!target) return;
  const view = $('#buildStepsView');
  const cacheKey = JSON.stringify({ planId: currentPlanId, plan, ok: result?.ok });
  if (!force && view?.classList.contains('hidden')) return;
  if (!force && target.dataset.cacheKey === cacheKey) return;
  const definition = getPlanDefinition(currentPlanId);
  const steps = definition.buildSteps || [];
  target.dataset.cacheKey = cacheKey;
  if (!steps.length) {
    target.innerHTML = '<p class="purchaseNote">No step-by-step build sequence is available for this plan yet.</p>';
    return;
  }
  target.innerHTML = `
    <div class="buildStepsIntro">
      <b>${escapeHtml(definition.title)}</b>
      <span>Use the cut list first, then follow these staged assembly views in order.</span>
    </div>
    <ol class="buildStepsList">
      ${steps.map((step, index) => buildStepHtml(step, index)).join('')}
    </ol>
  `;
  initBuildStepAnimations(target);
}

function buildStepHtml(step, index) {
  const images = buildStepImages(step, { width: 760, height: 430, grid: true });
  const animation = buildStepAnimation(step, { width: 760, height: 430 });
  const mediaName = `build-step-media-${index}`;
  return `
    <li class="buildStep">
      <div class="buildStepText">
        <div class="buildStepKicker">Step ${index + 1}</div>
        <h3>${escapeHtml(step.title)}</h3>
        <ul>${(step.instructions || []).map((item) => `<li>${escapeHtml(formatBuildInstruction(item))}</li>`).join('')}</ul>
      </div>
      <div class="buildStepMedia">
        ${animation ? `
          <input class="buildStepMode buildStepModeIllustrated" type="radio" id="${mediaName}-illustrated" name="${mediaName}" checked>
          <input class="buildStepMode buildStepModeVideo" type="radio" id="${mediaName}-video" name="${mediaName}">
          <div class="buildStepMediaTabs" role="tablist" aria-label="${escapeHtml(step.title)} media">
            <label class="buildStepMediaTab buildStepMediaTabIllustrated" for="${mediaName}-illustrated">Illustrated</label>
            <label class="buildStepMediaTab buildStepMediaTabVideo" for="${mediaName}-video">Mini-video</label>
          </div>
        ` : ''}
        <div class="buildStepMediaPanels">
          <div class="buildStepMediaPanel buildStepMediaPanelIllustrated">
            <div class="buildStepSceneGroup">
              ${images.length ? images.map((image, imageIndex) => `
                <div class="buildStepScene">
                  <img src="${image}" alt="${escapeHtml(step.title)} assembly view ${imageIndex + 1}" />
                </div>
              `).join('') : '<div class="buildStepScene"><div class="buildStepPlaceholder">3D view unavailable</div></div>'}
            </div>
          </div>
          ${animation ? `
            <div class="buildStepMediaPanel buildStepMediaPanelVideo">
              <div class="buildStepScene buildStepVideoScene">
                ${typeof animation === 'string'
                  ? `<img src="${animation}" alt="${escapeHtml(step.title)} animated assembly sequence" />`
                  : `<button class="buildStepFullscreen" type="button" data-build-animation-fullscreen="${escapeHtml(animation.type)}" data-build-animation-title="${escapeHtml(step.title)}">Full screen</button><canvas class="buildStepAnimationCanvas" data-build-animation="${escapeHtml(animation.type)}" aria-label="${escapeHtml(step.title)} animated assembly sequence"></canvas>`}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </li>
  `;
}

function buildStepImages(step, options = {}) {
  if (Array.isArray(step.images) && step.images.length) {
    return step.images.map((image) => buildStepImage({ ...step, image }, options)).filter(Boolean);
  }
  const image = buildStepImage(step, options);
  return image ? [image] : [];
}

function buildStepImage(step, options = {}) {
  if (step.image === 'cut-layout') return cutLayoutImage(options.width || 760, options.height || 430);
  if (step.image?.type === 'animation-still') {
    const animationType = step.image.animation || step.animation?.type;
    if (animationType) {
      const animationOptions = buildAnimationOptions(animationType);
      const span = Math.max(result?.shelfW || 60, result?.shelfH || 60, result?.shelfD || 30) * 0.1;
      return viewer.captureImage({
        stage: animationOptions.stage,
        vis: step.vis || buildStepVisibility(),
        showDimensions: animationOptions.showDimensions,
        dimensionContext: animationOptions.dimensionContext,
        width: options.width || 760,
        height: options.height || 430,
        grid: options.grid !== false,
        camera: animationOptions.camera(span),
        target: animationOptions.target(span),
        buildAnimation: { type: animationType, progress: step.image.progress ?? 0.92 }
      });
    }
  }
  if (step.image?.type === 'front-frame') return frontFrameAssemblyImage(step.image.phase || 1, options.width || 760, options.height || 430);
  return viewer.captureImage({
    stage: step.stage ?? 999,
    vis: step.vis || buildStepVisibility(),
    showDimensions: Boolean(step.dimensionContext),
    dimensionContext: step.dimensionContext,
    width: options.width || 760,
    height: options.height || 430,
    grid: options.grid !== false,
    camera: options.camera,
    target: options.target
  });
}

function buildStepAnimation(step, options = {}) {
  if ([
    'front-frame',
    'runner-rails',
    'tote-fit',
    'casters',
    'final-load',
    'rolling-post-assemblies',
    'rolling-rails',
    'rolling-deck',
    'rolling-finish',
    'shelf-base-frame',
    'shelf-bottom-slats',
    'shelf-corner-posts',
    'shelf-second-frame',
    'shelf-second-slats',
    'shelf-repeat-upward',
    'shelf-final-fasteners'
  ].includes(step.animation?.type)) return { type: step.animation.type };
  return null;
}

function cleanupBuildStepAnimations() {
  buildStepAnimationViewers.forEach((entry) => {
    stopBuildStepAnimation(entry);
  });
  buildStepAnimationViewers = [];
}

function initBuildStepAnimations(container) {
  cleanupBuildStepAnimations();
  container.querySelectorAll('[data-build-animation]').forEach((canvas) => {
    const entry = startBuildStepAnimation(canvas, canvas.dataset.buildAnimation);
    buildStepAnimationViewers.push(entry);
  });
}

function openBuildAnimationDialog(type, title) {
  const dialog = $('#buildAnimationDialog');
  const scene = $('#buildAnimationDialogScene');
  cleanupModalBuildStepAnimation();
  $('#buildAnimationDialogTitle').textContent = title || 'Build Step Animation';
  scene.innerHTML = `<canvas class="buildStepAnimationCanvas" data-build-animation="${escapeHtml(type)}" aria-label="${escapeHtml(title || 'Build step')} fullscreen animated assembly sequence"></canvas>`;
  lockPageOverflowForBuildAnimation();
  dialog.showModal();
  const canvas = scene.querySelector('canvas');
  modalBuildStepAnimation = startBuildStepAnimation(canvas, type, { forceVisible: true });
  requestAnimationFrame(() => modalBuildStepAnimation?.viewer?.resize?.());
}

function cleanupModalBuildStepAnimation() {
  if (modalBuildStepAnimation) stopBuildStepAnimation(modalBuildStepAnimation);
  modalBuildStepAnimation = null;
  restorePageOverflowForBuildAnimation();
  const scene = $('#buildAnimationDialogScene');
  if (scene) scene.innerHTML = '';
}

function lockPageOverflowForBuildAnimation() {
  if (modalBuildStepPageOverflow) return;
  modalBuildStepPageOverflow = {
    body: document.body.style.overflow,
    documentElement: document.documentElement.style.overflow
  };
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

function restorePageOverflowForBuildAnimation() {
  if (!modalBuildStepPageOverflow) return;
  document.body.style.overflow = modalBuildStepPageOverflow.body;
  document.documentElement.style.overflow = modalBuildStepPageOverflow.documentElement;
  modalBuildStepPageOverflow = null;
}

function startBuildStepAnimation(canvas, type, settings = {}) {
  const miniViewer = new FrameViewer(canvas);
  const entry = { viewer: miniViewer, canvas, type, cancelled: false, frame: null, startedAt: null, forceVisible: Boolean(settings.forceVisible) };
  const tick = (now) => {
    if (entry.cancelled) return;
    if (entry.forceVisible || canvas.offsetParent) {
      if (entry.startedAt === null) entry.startedAt = now;
      const progress = ((now - entry.startedAt) % 8000) / 8000;
      const options = buildAnimationOptions(type);
      const animationPlan = {
        ...plan,
        stage: options.stage,
        vis: buildStepVisibility(),
        showDimensions: options.showDimensions,
        dimensionContext: options.dimensionContext,
        buildAnimation: { type, progress }
      };
      miniViewer.update(animationPlan, result);
      const span = Math.max(result?.shelfW || 60, result?.shelfH || 60, result?.shelfD || 30) * 0.1;
      const camera = options.camera(span);
      const target = options.target(span);
      miniViewer.setCameraPosition(camera, target);
    } else {
      entry.startedAt = null;
    }
    entry.frame = requestAnimationFrame(tick);
  };
  entry.frame = requestAnimationFrame(tick);
  return entry;
}

function stopBuildStepAnimation(entry) {
  entry.cancelled = true;
  if (entry.frame) cancelAnimationFrame(entry.frame);
  entry.viewer?.dispose?.();
}

function buildAnimationOptions(type) {
  const defaultTarget = (span) => ({ x: 0, y: span * 0.42, z: 0 });
  const options = {
    'front-frame': { stage: 1, dimensionContext: 'post', showDimensions: true, camera: (span) => ({ x: span * 0.75, y: span * 0.58, z: span * 1.15 }), target: defaultTarget },
    'runner-rails': { stage: 2, dimensionContext: 'runner', showDimensions: true, camera: (span) => ({ x: span * 0.95, y: span * 0.65, z: span * 1.15 }), target: defaultTarget },
    'tote-fit': { stage: 5, dimensionContext: 'runner', showDimensions: true, camera: (span) => ({ x: span * 0.9, y: span * 0.6, z: -span * 1.25 }), target: defaultTarget },
    casters: { stage: 4, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.25, y: span * 0.32, z: span * 1.55 }), target: (span) => ({ x: 0, y: span * 0.04, z: 0 }) },
    'final-load': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.05, y: span * 0.72, z: span * 1.25 }), target: defaultTarget },
    'rolling-post-assemblies': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 0.75, y: span * 0.62, z: span * 1.18 }), target: defaultTarget },
    'rolling-rails': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.0, y: span * 0.66, z: span * 1.25 }), target: defaultTarget },
    'rolling-deck': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.05, y: span * 0.82, z: span * 1.18 }), target: defaultTarget },
    'rolling-finish': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.0, y: span * 0.48, z: span * 1.28 }), target: (span) => ({ x: 0, y: span * 0.3, z: 0 }) },
    'shelf-base-frame': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 0.95, y: span * 0.28, z: span * 1.25 }), target: (span) => ({ x: 0, y: span * 0.12, z: 0 }) },
    'shelf-bottom-slats': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 0.95, y: span * 0.42, z: span * 1.25 }), target: (span) => ({ x: 0, y: span * 0.16, z: 0 }) },
    'shelf-corner-posts': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 0.86, y: span * 0.72, z: span * 1.18 }), target: defaultTarget },
    'shelf-second-frame': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.0, y: span * 0.68, z: span * 1.25 }), target: defaultTarget },
    'shelf-second-slats': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.02, y: span * 0.76, z: span * 1.18 }), target: defaultTarget },
    'shelf-repeat-upward': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.05, y: span * 0.82, z: span * 1.28 }), target: defaultTarget },
    'shelf-final-fasteners': { stage: 999, dimensionContext: null, showDimensions: false, camera: (span) => ({ x: span * 1.0, y: span * 0.72, z: span * 1.25 }), target: defaultTarget }
  };
  return options[type] || options['runner-rails'];
}

function formatBuildInstruction(text) {
  return String(text || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => buildInstructionValue(key));
}

function buildInstructionValue(key) {
  if (key === 'frameRailLength') return formatLength(result?.shelfW, plan.unit);
  if (key === 'postClearWidth') {
    const parts = new Map(result?.assembly?.parts?.map((part) => [part.id, part]) || []);
    const first = parts.get('post.front.0');
    const second = parts.get('post.front.1');
    if (first && second) return formatLength(Math.max(0, second.position.x - first.position.x - first.size.x), plan.unit);
  }
  if (key === 'postCountPerFrame') return String((result?.columns || result?.bays || plan.toteColumns || 1) + 1);
  return `{${key}}`;
}

function frontFrameAssemblyImage(phase, width, height) {
  const parts = new Map(result?.assembly?.parts?.map((part) => [part.id, part]) || []);
  const postCount = (result?.columns || result?.bays || plan.toteColumns || 1) + 1;
  const railLength = result?.shelfW || 0;
  const firstPost = parts.get('post.front.0');
  const secondPost = parts.get('post.front.1');
  const postClear = firstPost && secondPost ? Math.max(0, secondPost.position.x - firstPost.position.x - firstPost.size.x) : 0;
  const postHeight = firstPost?.size?.y || 0;
  const railThickness = result?.stock || plan.shelfDeck || 1.5;
  const railFace = result?.rail || plan.shelfRail || 3.5;
  if (!railLength || !postHeight || !postCount) return null;

  const pad = 34;
  const noteH = 44;
  const frameW = width - pad * 2;
  const frameH = height - pad * 2 - noteH;
  const xScale = frameW / railLength;
  const railH = Math.max(8, railThickness * xScale);
  const postW = Math.max(10, (firstPost?.size?.x || 1.5) * xScale);
  const bottomRailY = height - pad - noteH - railH * 2.2;
  const secondRailY = bottomRailY + railH;
  const topRailY = Math.max(pad + 38, bottomRailY - postHeight * xScale);
  const railX = pad;
  const postBottomY = bottomRailY;
  const topPostY = topRailY + railH;
  const postXs = Array.from({ length: postCount }, (_, index) => {
    const part = parts.get(`post.front.${index}`);
    if (part) return railX + (part.position.x + railLength / 2 - part.size.x / 2) * xScale;
    return railX + index * (frameW - postW) / Math.max(1, postCount - 1);
  });
  const showTop = phase >= 2;
  const showSecondBottom = phase >= 3;
  const title = [
    '1. Fasten posts to the first bottom rail',
    '2. Add the top rail and fasten down into posts',
    '3. Add the second bottom rail and screw upward into the first'
  ][Math.max(0, Math.min(2, phase - 1))];
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c1117"/><stop offset="1" stop-color="#111827"/></linearGradient>',
    '<filter id="shadow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#020617" flood-opacity="0.45"/></filter>',
    '<marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#93c5fd"/></marker>',
    '</defs>',
    '<rect width="100%" height="100%" fill="url(#floor)"/>'
  ];
  for (let x = pad; x < width; x += 32) svg.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${height - pad}" stroke="#1f2937" stroke-width="1"/>`);
  for (let y = pad; y < height; y += 32) svg.push(`<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#1f2937" stroke-width="1"/>`);
  svg.push(`<text x="${pad}" y="25" fill="#bfdbfe" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="800">${escapeHtml(title)}</text>`);

  const railFill = '#d7bd83';
  const secondFill = '#b88b57';
  const postFill = '#b08f64';
  const stroke = '#3f2a1b';
  svg.push(`<rect x="${railX}" y="${bottomRailY}" width="${frameW}" height="${railH}" rx="2" fill="${railFill}" stroke="${stroke}" stroke-width="1.2" filter="url(#shadow)"/>`);
  if (showSecondBottom) svg.push(`<rect x="${railX}" y="${secondRailY}" width="${frameW}" height="${railH}" rx="2" fill="${secondFill}" stroke="${stroke}" stroke-width="1.2" filter="url(#shadow)"/>`);
  if (showTop) svg.push(`<rect x="${railX}" y="${topRailY}" width="${frameW}" height="${railH}" rx="2" fill="${railFill}" stroke="${stroke}" stroke-width="1.2" filter="url(#shadow)"/>`);
  postXs.forEach((x, index) => {
    svg.push(`<rect x="${x}" y="${topPostY}" width="${postW}" height="${postBottomY - topPostY}" rx="2" fill="${postFill}" stroke="${stroke}" stroke-width="1.2" filter="url(#shadow)"/>`);
    if (phase === 1) addScrewPair(svg, x + postW / 2, bottomRailY + railH * 0.55, 'up');
    if (phase === 2) addScrewPair(svg, x + postW / 2, topRailY + railH * 0.45, 'down');
    if (showSecondBottom) addLaminationScrews(svg, laminationScrewCenters(x, index, postW, postXs.length, xScale), secondRailY + railH * 0.82, bottomRailY + railH * 0.22);
    if (index < postXs.length - 1) {
      const x1 = x + postW;
      const x2 = postXs[index + 1];
      const y = bottomRailY + railH + 26;
      addDim(svg, x1, x2, y, `Clear ${escapeHtml(formatLength(postClear, plan.unit))}`);
    }
  });
  addDim(svg, railX, railX + frameW, topRailY - 20, `Rail ${escapeHtml(formatLength(railLength, plan.unit))}`);
  svg.push(`<text x="${pad}" y="${height - 18}" fill="#e5e7eb" font-family="Inter, Arial, sans-serif" font-size="12">Use ${postCount} posts per frame. Rail face shown as ${escapeHtml(formatLength(railFace, plan.unit))}; repeat this assembly for the back frame.</text>`);
  svg.push('</svg>');
  return `data:image/svg+xml;base64,${btoa(svg.join(''))}`;
}

function addDim(svg, x1, x2, y, label) {
  svg.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#93c5fd" stroke-width="1.4" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`);
  svg.push(`<line x1="${x1}" y1="${y - 8}" x2="${x1}" y2="${y + 8}" stroke="#bfdbfe" stroke-width="1"/>`);
  svg.push(`<line x1="${x2}" y1="${y - 8}" x2="${x2}" y2="${y + 8}" stroke="#bfdbfe" stroke-width="1"/>`);
  svg.push(`<rect x="${(x1 + x2) / 2 - 46}" y="${y - 22}" width="92" height="18" rx="3" fill="#111827" stroke="#334155"/>`);
  svg.push(`<text x="${(x1 + x2) / 2}" y="${y - 9}" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle">${label}</text>`);
}

function addScrewPair(svg, x, y, direction) {
  const offsets = [-5, 5];
  offsets.forEach((dx) => {
    const y2 = direction === 'up' ? y - 20 : y + 20;
    svg.push(`<line x1="${x + dx}" y1="${y}" x2="${x + dx}" y2="${y2}" stroke="#cbd5e1" stroke-width="2.2"/>`);
    svg.push(`<circle cx="${x + dx}" cy="${y}" r="3.5" fill="#64748b" stroke="#e5e7eb" stroke-width="1"/>`);
  });
}

function laminationScrewCenters(postX, postIndex, postW, postCount, xScale) {
  const offset = (result?.post || plan.shelfPost || 3.5) * 0.68 * xScale;
  const center = postX + postW / 2;
  if (postIndex === 0) return [center + offset - 5, center + offset + 5];
  if (postIndex === postCount - 1) return [center - offset - 5, center - offset + 5];
  return [center - offset, center + offset];
}

function addLaminationScrews(svg, centers, y1, y2) {
  centers.forEach((x) => {
    svg.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#cbd5e1" stroke-width="2.2"/>`);
    svg.push(`<circle cx="${x}" cy="${y1}" r="3.5" fill="#64748b" stroke="#e5e7eb" stroke-width="1"/>`);
  });
}

function cutLayoutImage(width, height) {
  const woodParts = (result.parts || [])
    .filter((part) => Number.isFinite(part.length) && Number.isFinite(part.width) && Number.isFinite(part.thickness))
    .filter((part) => !/screw|caster/i.test(part.part));
  if (!woodParts.length) return null;

  const pad = 32;
  const labelW = 190;
  const rowGap = 12;
  const rowH = Math.max(42, Math.min(64, (height - pad * 2 - rowGap * (woodParts.length - 1)) / woodParts.length));
  const drawingW = width - labelW - pad * 2;
  const maxLength = Math.max(...woodParts.map((part) => part.length));
  const scale = drawingW / Math.max(maxLength, 1);
  const colors = [0xb08f64, 0xc5a178, 0x8f5f37, 0xd7bd83, 0xa97949];
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c1117"/><stop offset="1" stop-color="#111827"/></linearGradient>',
    '<filter id="shadow" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#020617" flood-opacity="0.55"/></filter>',
    '</defs>',
    '<rect width="100%" height="100%" fill="url(#floor)"/>'
  ];
  for (let x = pad; x < width; x += 32) svg.push(`<line x1="${x}" y1="${pad}" x2="${x}" y2="${height - pad}" stroke="#1f2937" stroke-width="1"/>`);
  for (let y = pad; y < height; y += 32) svg.push(`<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#1f2937" stroke-width="1"/>`);
  svg.push(`<text x="${pad}" y="${pad - 6}" fill="#bfdbfe" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700">Cut pieces laid out by part group</text>`);

  woodParts.forEach((part, index) => {
    const y = pad + 14 + index * (rowH + rowGap);
    const boardX = pad + labelW;
    const boardW = Math.max(34, part.length * scale);
    const boardH = Math.max(10, Math.min(20, part.width * 4.2));
    const shown = Math.min(part.qty, Math.max(1, Math.floor((rowH - 18) / 4)));
    const color = colors[index % colors.length];
    const stroke = shadeSvgColor(color, -0.28).toString(16).padStart(6, '0');
    const fill = color.toString(16).padStart(6, '0');
    svg.push(`<text x="${pad}" y="${y + 14}" fill="#e5e7eb" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="700">${svgTextLines(part.part, 22).map((line, lineIndex) => `<tspan x="${pad}" dy="${lineIndex ? 15 : 0}">${escapeHtml(line)}</tspan>`).join('')}</text>`);
    svg.push(`<text x="${pad}" y="${y + 44}" fill="#93c5fd" font-family="Inter, Arial, sans-serif" font-size="12">${part.qty} pcs @ ${escapeHtml(formatLength(part.length, plan.unit))}</text>`);
    for (let copy = 0; copy < shown; copy += 1) {
      const dy = copy * 4;
      svg.push(`<rect x="${boardX + dy}" y="${y + 7 + dy}" width="${boardW}" height="${boardH}" rx="2" fill="#${fill}" stroke="#${stroke}" stroke-width="1.2" filter="url(#shadow)"/>`);
      svg.push(`<line x1="${boardX + dy + 8}" y1="${y + 10 + dy}" x2="${boardX + boardW - 8 + dy}" y2="${y + 10 + dy}" stroke="#f5deb3" stroke-opacity="0.28"/>`);
    }
    if (part.qty > shown) {
      svg.push(`<text x="${boardX + boardW + shown * 4 + 12}" y="${y + 21}" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="12">stack of ${part.qty}</text>`);
    }
  });
  svg.push('</svg>');
  return `data:image/svg+xml;base64,${btoa(svg.join(''))}`;
}

function svgTextLines(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function shadeSvgColor(hex, amount) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const mix = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  const nr = Math.round(r + (mix - r) * t);
  const ng = Math.round(g + (mix - g) * t);
  const nb = Math.round(b + (mix - b) * t);
  return (nr << 16) | (ng << 8) | nb;
}

function buildStepVisibility() {
  return isShelfPlan()
    ? { posts: true, rails: true, slats: true, hardware: true }
    : { face: true, liner: true, spacers: true, canvas: true, hardware: true };
}

function validationSummaryHtml() {
  const componentOverlaps = result?.validation?.componentOverlaps;
  if (!componentOverlaps) return '';
  if (!componentOverlaps.count) {
    return `
      <div class="physicsSummary good">
        <b>Geometry validation passed</b>
        <span>No solid component overlaps found. Fasteners are allowed to pass through parts.</span>
      </div>
    `;
  }

  const items = componentOverlaps.items || [];
  return `
    <div class="physicsSummary bad">
      <b>Component overlaps found</b>
      <span>${componentOverlaps.count} solid component overlap${componentOverlaps.count === 1 ? '' : 's'} need attention. Fasteners are excluded from this rule.</span>
    </div>
    <section>
      <h3>Overlapping Components</h3>
      <ul>
        ${items.map((item) => {
          const depth = item.depth?.map((value) => `${value.toFixed(3)} in`).join(' x ') || '';
          return `<li><b>${escapeHtml(item.partNames?.[0] || item.partIds?.[0])}</b> overlaps <b>${escapeHtml(item.partNames?.[1] || item.partIds?.[1])}</b>${depth ? ` (${escapeHtml(depth)})` : ''}.</li>`;
        }).join('')}
      </ul>
      ${componentOverlaps.hidden ? `<p class="physicsNote">${componentOverlaps.hidden} more overlap${componentOverlaps.hidden === 1 ? '' : 's'} not shown.</p>` : ''}
    </section>
  `;
}

async function runPhysicsCheck() {
  const output = $('#physicsOutput');
  if (!output) return;
  output.dataset.reportState = 'running';
  output.innerHTML = '<p>Running physics check...</p>';
  try {
    const report = await runPhysicsDiagnostic({ ...plan, plan: currentPlanId }, result, {
      gravity: $('#physicsGravity')?.value || '-y'
    });
    output.dataset.reportState = 'done';
    output.innerHTML = physicsReportHtml(report);
  } catch (error) {
    output.dataset.reportState = 'error';
    output.innerHTML = `
      <div class="physicsSummary bad">
        <b>Physics check could not run.</b>
        <span>${escapeHtml(error?.message || error)}</span>
      </div>
    `;
  }
}

function physicsReportHtml(report) {
  const stats = report.stats || {};
  const moved = report.moved || [];
  const weakFasteners = report.weakFasteners || [];
  const looseContacts = report.looseContacts || [];
  const unfastenedContacts = report.unfastenedContacts || [];
  const linkedFasteners = (report.fastenerLinks || []).filter((link) => link.partIds.length >= 2);
  const detailItems = [];

  if (moved.length) {
    const shown = moved.slice(0, 18);
    detailItems.push(`
      <section>
        <h3>Moved Parts</h3>
        <ul>${shown.map((item) => `<li><b>${escapeHtml(item.name)}</b> moved ${item.distance.toFixed(2)} in.</li>`).join('')}</ul>
        ${moved.length > shown.length ? `<p class="physicsNote">${moved.length - shown.length} more moved part${moved.length - shown.length === 1 ? '' : 's'} not shown.</p>` : ''}
      </section>
    `);
  }
  if (weakFasteners.length) {
    detailItems.push(`
      <section>
        <h3>Fasteners To Check</h3>
        <ul>${weakFasteners.map((item) => `<li><b>${escapeHtml(item.name)}</b> intersects ${item.partIds.length} part${item.partIds.length === 1 ? '' : 's'}.</li>`).join('')}</ul>
      </section>
    `);
  }
  if (looseContacts.length) {
    detailItems.push(`
      <section>
        <h3>Declared Contacts To Check</h3>
        <ul>${looseContacts.map((item) => `<li><b>${escapeHtml(item.name)}</b> could not be linked.</li>`).join('')}</ul>
      </section>
    `);
  }
  if (unfastenedContacts.length) {
    const shown = unfastenedContacts.slice(0, 18);
    detailItems.push(`
      <section>
        <h3>Unfastened Contacts</h3>
        <ul>${shown.map((item) => `<li><b>${escapeHtml(item.name)}</b> touches but has no modeled fastener between those parts.</li>`).join('')}</ul>
        ${unfastenedContacts.length > shown.length ? `<p class="physicsNote">${unfastenedContacts.length - shown.length} more unfastened contact${unfastenedContacts.length - shown.length === 1 ? '' : 's'} not shown.</p>` : ''}
      </section>
    `);
  }
  if (!detailItems.length) {
    detailItems.push('<p>No obvious floating parts or loose fasteners were found in this first-pass check.</p>');
  }

  return `
    <div class="physicsSummary ${report.ok ? 'good' : 'bad'}">
      <b>${escapeHtml(report.ok ? 'Stable in basic check' : 'Needs attention')}</b>
      <span>${escapeHtml(report.summary)}</span>
    </div>
    <div class="physicsStats">
      <span><b>${stats.bodies ?? 0}</b> bodies</span>
      <span><b>${stats.anchored ?? 0}</b> anchored</span>
      <span><b>${stats.fasteners ?? 0}</b> fasteners</span>
      <span><b>${linkedFasteners.length}</b> linking parts</span>
      <span><b>${stats.contacts ?? 0}</b> contacts</span>
      <span><b>${stats.joints ?? 0}</b> joints</span>
    </div>
    <div class="physicsDetails">${detailItems.join('')}</div>
  `;
}

function estimateBoardPurchases(parts, boardLength, kerf) {
  const groupsByStock = new Map();
  const tooLong = [];
  const usableKerf = Math.max(0, Number(kerf) || 0);
  const stockLength = Math.max(1, Number(boardLength) || 96);

  parts.forEach((part) => {
    if (!Number.isFinite(part.length) || !Number.isFinite(part.width) || !Number.isFinite(part.thickness)) return;
    const qty = Math.max(0, Math.round(Number(part.qty) || 0));
    if (!qty) return;
    if (part.length > stockLength) tooLong.push(part);
    const key = `${roundStock(part.width)}x${roundStock(part.thickness)}`;
    if (!groupsByStock.has(key)) {
      groupsByStock.set(key, {
        width: part.width,
        thickness: part.thickness,
        pieces: []
      });
    }
    const group = groupsByStock.get(key);
    for (let i = 0; i < qty; i += 1) {
      group.pieces.push({ part: part.part, length: part.length });
    }
  });

  const groups = Array.from(groupsByStock.values()).map((group) => {
    const boards = packPieces(group.pieces, stockLength, usableKerf);
    const used = boards.reduce((sum, board) => sum + board.used, 0);
    return {
      ...group,
      boards,
      used,
      waste: Math.max(0, boards.length * stockLength - used)
    };
  });
  const totalBoards = groups.reduce((sum, group) => sum + group.boards.length, 0);
  const totalPurchased = totalBoards * stockLength;
  const totalUsed = groups.reduce((sum, group) => sum + group.used, 0);

  return {
    groups,
    tooLong,
    totalBoards,
    totalPurchased,
    totalWaste: Math.max(0, totalPurchased - totalUsed)
  };
}

function packPieces(pieces, boardLength, kerf) {
  const boards = [];
  const sorted = [...pieces].sort((a, b) => b.length - a.length);
  sorted.forEach((piece) => {
    let bestBoard = null;
    let bestRemaining = Infinity;
    boards.forEach((board) => {
      const extra = piece.length + (board.pieces.length ? kerf : 0);
      const remaining = boardLength - board.used - extra;
      if (remaining >= -0.0001 && remaining < bestRemaining) {
        bestRemaining = remaining;
        bestBoard = board;
      }
    });
    if (!bestBoard) {
      bestBoard = { used: 0, pieces: [] };
      boards.push(bestBoard);
    }
    bestBoard.used += piece.length + (bestBoard.pieces.length ? kerf : 0);
    bestBoard.pieces.push(piece);
  });
  return boards;
}

function roundStock(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function cutNoteHtml(part) {
  const note = escapeHtml(part.notes);
  if (normalizeBuild(plan.build) === 'strainer' && part.part.startsWith('Face') && part.notes.includes('rabbet')) {
    return `<span class="noteWithHelp">${note}${rabbetNoteHelp(part)}</span>`;
  }
  if (part.notes.includes('miter') && (part.part.startsWith('Liner') || part.part.startsWith('Strainer') || normalizeBuild(plan.build) === 'liner' && part.part.startsWith('Face'))) {
    return `<span class="noteWithHelp">${note}${miterNoteHelp(part)}</span>`;
  }
  return note;
}

function rabbetNoteHelp(part) {
  return `
    <span class="fieldHelp cutHelp" tabindex="0" aria-label="Rabbet cut diagram">
      <span class="infoIcon">i</span>
      <span class="helpCard cutHelpCard">
        ${rabbetGuideContent(part)}
      </span>
    </span>
  `;
}

function rabbetGuideContent(part) {
  const rabbetDepth = formatLength(plan.rabbet, plan.unit);
  const rabbetWidth = formatLength(result.supportBottom, plan.unit);
  const rabbetCutDepth = formatLength(plan.canvasT + (plan.faceLip || 0) + result.supportThickness, plan.unit);
  const faceDepth = formatLength(plan.depth + (plan.faceLip || 0), plan.unit);
  const faceThickness = formatLength(plan.face + (plan.rabbet || 0), plan.unit);
  const faceWidth = formatLength(plan.face, plan.unit);
  const strainerDepth = formatLength(result.supportThickness, plan.unit);
  const partLength = formatLength(part.length, plan.unit);
  const shortPointLength = formatLength(Math.max(0, part.length - 2 * (plan.face + (plan.rabbet || 0))), plan.unit);
  return `
    <b>Rabbet cut guide</b>
    <span class="cutHelpText">Remove the highlighted area from the inside back edge. The remaining ledge supports the strainer.</span>
    <svg class="cutDiagram" viewBox="0 0 420 330" aria-hidden="true">
      <text x="12" y="18">End view</text>
      <path class="keepProfile" d="M42 30h30v58h22v54H42z" />
      <path class="profile" d="M42 30h30v58h22v54H42z" />
      <path class="remove" d="M72 30h22v58H72z" />
      <path class="ledge" d="M72 88h22v54H72z" />
      <line class="dimLine gray" x1="16" y1="30" x2="16" y2="142" />
      <line class="tick gray" x1="4" y1="30" x2="28" y2="30" />
      <line class="tick gray" x1="4" y1="142" x2="28" y2="142" />
      <text class="dimText grayText" x="1" y="91">${escapeHtml(faceDepth)}</text>
      <line class="dimLine gray" x1="122" y1="30" x2="122" y2="88" />
      <line class="tick gray" x1="106" y1="30" x2="138" y2="30" />
      <line class="tick gray" x1="106" y1="88" x2="138" y2="88" />
      <text class="dimText grayText" x="132" y="63">${escapeHtml(rabbetCutDepth)}</text>
      <line class="dimLine gray" x1="122" y1="88" x2="122" y2="142" />
      <line class="tick gray" x1="106" y1="88" x2="138" y2="88" />
      <line class="tick gray" x1="106" y1="142" x2="138" y2="142" />
      <text class="dimText grayText" x="132" y="121">${escapeHtml(rabbetWidth)}</text>
      <line class="dimLine gray" x1="72" y1="20" x2="94" y2="20" />
      <line class="tick gray" x1="72" y1="12" x2="72" y2="28" />
      <line class="tick gray" x1="94" y1="12" x2="94" y2="28" />
      <text class="dimText grayText" x="70" y="9">${escapeHtml(rabbetDepth)}</text>
      <text x="184" y="18">Board depth: ${escapeHtml(faceDepth)}</text>
      <text x="184" y="36">Vertical rabbet cut: ${escapeHtml(rabbetCutDepth)}</text>
      <text x="184" y="54">Horizontal rabbet width from back edge: ${escapeHtml(rabbetWidth)}</text>

      <text x="12" y="180">Top view</text>
      <path class="topProfile" d="M78 230H166 M252 230H340 M48 300H166 M252 300H370 M48 300L78 230 M340 230L370 300" />
      <path class="topRemove" d="M82 240H166 M252 240H338" />
      <path class="squiggle" d="M185 214c-16 18 16 28 0 46c-16 18 16 28 0 46" />
      <path class="squiggle" d="M205 214c-16 18 16 28 0 46c-16 18 16 28 0 46" />
      <line class="dimLine gray" x1="48" y1="318" x2="370" y2="318" />
      <line class="tick gray" x1="48" y1="304" x2="48" y2="329" />
      <line class="tick gray" x1="370" y1="304" x2="370" y2="329" />
      <text class="dimText grayText" x="192" y="313">${escapeHtml(partLength)}</text>
      <line class="dimLine gray" x1="78" y1="198" x2="340" y2="198" />
      <line class="tick gray" x1="78" y1="184" x2="78" y2="210" />
      <line class="tick gray" x1="340" y1="184" x2="340" y2="210" />
      <text class="dimText grayText" x="192" y="192">${escapeHtml(shortPointLength)}</text>
      <line class="dimLine gray" x1="26" y1="230" x2="26" y2="300" />
      <line class="tick gray" x1="14" y1="230" x2="54" y2="230" />
      <line class="tick gray" x1="14" y1="300" x2="54" y2="300" />
      <text class="dimText grayText" x="4" y="268">${escapeHtml(faceThickness)}</text>
      <line class="dimLine gray" x1="394" y1="230" x2="394" y2="248" />
      <line class="tick gray" x1="380" y1="230" x2="414" y2="230" />
      <line class="tick gray" x1="380" y1="248" x2="414" y2="248" />
      <text class="dimText grayText" x="380" y="222">${escapeHtml(rabbetDepth)}</text>
      <line class="dimLine gray" x1="394" y1="248" x2="394" y2="300" />
      <line class="tick gray" x1="380" y1="248" x2="414" y2="248" />
      <line class="tick gray" x1="380" y1="300" x2="414" y2="300" />
      <text class="dimText grayText" x="377" y="276">${escapeHtml(faceWidth)}</text>
    </svg>
  `;
}

function miterNoteHelp(part) {
  return `
    <span class="fieldHelp cutHelp" tabindex="0" aria-label="Miter cut diagram">
      <span class="infoIcon">i</span>
      <span class="helpCard cutHelpCard miterHelpCard">
        ${miterGuideContent(part)}
      </span>
    </span>
  `;
}

function miterGuideContent(part) {
  const railWidthValue = part.part.startsWith('Face') ? part.thickness : part.width;
  const railWidth = formatLength(railWidthValue, plan.unit);
  const longPoint = formatLength(part.length, plan.unit);
  const shortPoint = formatLength(Math.max(0, part.length - 2 * railWidthValue), plan.unit);
  const label = part.part.replace(/\s+-\s+/, ' ').toLowerCase();
  return `
    <b>Miter guide</b>
    <span class="cutHelpText">For the ${escapeHtml(label)}, measure the listed length to the long points. The short edge is shorter by one board width at each miter.</span>
    <svg class="miterDiagram" viewBox="0 0 420 170" aria-hidden="true">
      <text x="12" y="18">Top view</text>
      <path class="topProfile" d="M86 58H170 M250 58H334 M56 128H170 M250 128H364 M56 128L86 58 M334 58L364 128" />
      <path class="squiggle" d="M190 40c-16 18 16 28 0 46c-16 18 16 28 0 46" />
      <path class="squiggle" d="M210 40c-16 18 16 28 0 46c-16 18 16 28 0 46" />
      <line class="dimLine gray" x1="56" y1="148" x2="364" y2="148" />
      <line class="tick gray" x1="56" y1="136" x2="56" y2="164" />
      <line class="tick gray" x1="364" y1="136" x2="364" y2="164" />
      <text class="dimText grayText" x="192" y="143">${escapeHtml(longPoint)}</text>
      <line class="dimLine gray" x1="86" y1="34" x2="334" y2="34" />
      <line class="tick gray" x1="86" y1="22" x2="86" y2="48" />
      <line class="tick gray" x1="334" y1="22" x2="334" y2="48" />
      <text class="dimText grayText" x="192" y="28">${escapeHtml(shortPoint)}</text>
      <line class="dimLine gray" x1="28" y1="58" x2="28" y2="128" />
      <line class="tick gray" x1="14" y1="58" x2="56" y2="58" />
      <line class="tick gray" x1="14" y1="128" x2="56" y2="128" />
      <text class="dimText grayText" x="4" y="96">${escapeHtml(railWidth)}</text>
    </svg>
  `;
}

function renderStage() {
  const labels = isShelfPlan()
    ? plan.build === 'tote-rack'
      ? ['Plan', 'Frames', 'Runner rails', 'Back bracing', 'Casters', 'Totes']
      : ['Plan', 'Posts', 'Rails', 'Shelf slats', 'Fasteners']
    : getStageLabels(plan.build);
  const slider = $('#stageSlider');
  slider.max = labels.length - 1;
  slider.value = Math.min(plan.stage, labels.length - 1);
  $('#stageLabel').textContent = labels[slider.value] || 'Plan';
}

function renderCameraInputs() {
  const pos = viewer.getCameraPosition();
  const target = viewer.getTargetPosition();
  const values = {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    targetX: target.x,
    targetY: target.y,
    targetZ: target.z
  };
  Object.entries(cameraFields).forEach(([key, input]) => {
    if (input && document.activeElement !== input) input.value = values[key].toFixed(2);
  });
}

function applyCameraFromInputs() {
  viewer.manualCamera = true;
  viewer.setCameraPosition({
    x: Number(cameraFields.x.value),
    y: Number(cameraFields.y.value),
    z: Number(cameraFields.z.value)
  }, {
    x: Number(cameraFields.targetX.value),
    y: Number(cameraFields.targetY.value),
    z: Number(cameraFields.targetZ.value)
  });
  renderCameraInputs();
}

function applyCameraPreset(name) {
  const span = isShelfPlan() ? Math.max(result?.shelfW || 96, result?.shelfH || 72) * 0.08 : Math.max(result?.outerW || 20, result?.outerH || 20) * 0.14;
  const target = isShelfPlan() ? { x: 0, y: (result?.shelfH || 72) * 0.05, z: 0 } : { x: 0, y: Math.max(0.05, (result?.effDepth || plan.depth || 1) * 0.05), z: 0 };
  const presets = {
    top: { x: 0.01, y: span * 2.6, z: 0.01 },
    back: { x: span * 1.7, y: span * 0.42, z: -span * 1.9 },
    below: { x: span * 1.6, y: -span * 1.25, z: span * 1.6 }
  };
  viewer.manualCamera = true;
  viewer.setCameraPosition(presets[name] || presets.back, target);
  renderCameraInputs();
}

function resetCameraTarget() {
  viewer.manualCamera = true;
  const pos = viewer.getCameraPosition();
  viewer.setCameraPosition(pos, isShelfPlan() ? { x: 0, y: (result?.shelfH || 72) * 0.05, z: 0 } : { x: 0, y: Math.max(0.05, (result?.effDepth || plan.depth || 1) * 0.05), z: 0 });
  renderCameraInputs();
}

function renderProjectionToggle() {
  const button = $('#btnProjectionToggle');
  if (!button) return;
  const isIso = viewer.getProjectionMode() === 'iso';
  button.textContent = isIso ? 'Perspective' : 'Iso';
  button.classList.toggle('active', isIso);
}

function populateClipOptions() {
  fields.mountClip.innerHTML = `<option value="none">No clip</option>` + Z_CLIP_CATALOG.map((clip) => (
    `<option value="${clip.offset}">${formatLength(clip.offset, 'in')} offset</option>`
  )).join('');
}

function populateCanvasPresets() {
  $('#canvasPresetList').innerHTML = CANVAS_CATALOG.map((item, index) => `
    <button class="presetItem" data-index="${index}" type="button">
      <span>
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(item.brand)}${item.sku ? ` · SKU ${escapeHtml(item.sku)}` : ''}</small>
      </span>
      <span>${formatLength(item.width, 'in')} x ${formatLength(item.height, 'in')}</span>
    </button>
  `).join('');

  $('#canvasPresetList').addEventListener('click', (event) => {
    const item = event.target.closest('[data-index]');
    if (!item) return;
    const preset = CANVAS_CATALOG[Number(item.dataset.index)];
    plan.canvasW = preset.width;
    plan.canvasH = preset.height;
    plan.canvasT = preset.thickness;
    plan.stretcherW = preset.stretcherW;
    $('#canvasDialog').close();
    plan = applyPlanRules(plan);
    render();
  });
}

function exportCsv() {
  const header = ['Part', 'Qty', `Length (${plan.unit})`, `Width (${plan.unit})`, `Thickness (${plan.unit})`, 'Notes'];
  const rows = result.parts.map((part) => [
    part.part,
    part.qty,
    displayNumber(part.length),
    displayNumber(part.width),
    displayNumber(part.thickness),
    part.notes
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  downloadText('floating-frame-cut-list.csv', csv, 'text/csv');
}

async function copyCutList() {
  const text = result.parts.map((part) => `${part.part}: ${part.qty} x ${formatLength(part.length, plan.unit)} (W ${formatLength(part.width, plan.unit)}, T ${formatLength(part.thickness, plan.unit)}) ${part.notes}`).join('\n');
  await navigator.clipboard.writeText(text);
  temporaryBadge('Cut list copied');
}

async function copyOpenScad() {
  await navigator.clipboard.writeText(generateOpenScad({ ...plan, plan: currentPlanId }, result));
  temporaryBadge('OpenSCAD copied');
}

function downloadOpenScad() {
  downloadText(`${currentPlanId}.scad`, generateOpenScad({ ...plan, plan: currentPlanId }, result), 'text/plain');
}

async function copyShareLink() {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({ plan: currentPlanId, ...serializePlan(plan) }).toString();
  await navigator.clipboard.writeText(url.toString());
  temporaryBadge('Share link copied');
}

function printPlan() {
  const definition = getPlanDefinition(currentPlanId);
  const rows = result.parts.map((part, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(part.part)}</td><td>${part.qty}</td><td>${escapeHtml(formatLength(part.length, plan.unit))}</td><td>${escapeHtml(formatLength(part.width, plan.unit))}</td><td>${escapeHtml(formatLength(part.thickness, plan.unit))}</td><td>${escapeHtml(part.notes)}</td></tr>`).join('');
  const guides = result.parts.map((part, index) => printGuideHtml(part, index)).filter(Boolean).join('');
  const views = printViewHtml();
  const details = printPlanDetailsHtml(definition);
  const dimensions = printDimensionSummaryHtml();
  const purchases = printPurchaseSummaryHtml();
  const buildSteps = printBuildStepsHtml(definition);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html><title>${escapeHtml(definition.title)} Plan</title>
    <style>
      @page{margin:.55in}
      body{font-family:Arial,sans-serif;padding:28px;color:#111;line-height:1.35}
      h1{margin:0 0 8px;font-size:28px} h2{font-size:17px;margin:0 0 9px} h3{font-size:14px;margin:0 0 6px}
      section{margin:22px 0}.summary{margin:0 0 18px;color:#444;max-width:820px}.muted{color:#555}
      .hero{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;margin-bottom:20px}.hero img{width:100%;height:auto;border-radius:6px;background:#0c1117;border:1px solid #bbb}.panel{break-inside:avoid;border:1px solid #bbb;border-radius:6px;padding:12px;margin:0 0 12px}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:12px}.kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.kv div{border:1px solid #ddd;padding:6px}.kv span{display:block;color:#555;font-size:11px}.kv b{font-size:12px} ul{margin:0;padding-left:18px} li{margin-bottom:5px}
      table{border-collapse:collapse;width:100%;font-size:12px} th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top} th{background:#eee}
      .views{margin:20px 0 22px}.viewGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.viewShot{break-inside:avoid;border:1px solid #bbb;border-radius:6px;padding:8px}.viewShot b{display:block;font-size:12px;margin:0 0 6px;color:#333}.viewShot img{display:block;width:100%;height:auto;border-radius:4px;background:#0c1117}
      .steps{counter-reset:step}.printStep{break-inside:avoid;display:grid;grid-template-columns:.9fr 1.1fr;gap:12px;border:1px solid #bbb;border-radius:6px;padding:12px;margin:0 0 14px}.printStepImages{display:grid;gap:8px}.printStep img{width:100%;height:auto;border-radius:4px;background:#0c1117}.stepNo{font-size:11px;font-weight:bold;color:#555;text-transform:uppercase}.purchaseStats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.purchaseStats span{border:1px solid #bbb;border-radius:999px;padding:5px 8px;font-size:12px}
      .guides{margin-top:24px}.guideGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px}.printGuide{break-inside:avoid;border:1px solid #bbb;border-radius:6px;padding:12px;margin:0 0 14px}.printGuide b{display:block;margin-bottom:4px}.cutHelpText{display:block;font-size:12px;color:#333;margin-bottom:8px}.cutDiagram{width:100%;max-width:520px;height:auto}.miterDiagram{width:100%;max-width:430px;height:auto}.profile,.topProfile{fill:none;stroke:#111;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.keepProfile{fill:#b7dfbf;stroke:none}.remove{fill:#e26b6b;opacity:.55}.ledge{fill:#37a857;opacity:.75}.topRemove{fill:none;stroke:#d85656;stroke-width:3;stroke-linecap:round}.squiggle{fill:none;stroke:#888;stroke-width:1.5}.dimLine,.tick{stroke:#777;stroke-width:2}.grayText,.dimText{fill:#555;font-size:11px}.dimText{text-anchor:middle}
      @media print{.printStep,.panel,.viewShot,.printGuide{break-inside:avoid}.pageBreak{break-before:page}}
    </style>
    <h1>${escapeHtml(definition.title)}</h1>
    <p class="summary">${escapeHtml(definition.details?.description || definition.summary)}</p>
    <section class="hero">
      <div>
        ${details}
        ${dimensions}
      </div>
      <div>${printCompletedImageHtml()}</div>
    </section>
    ${views}
    ${purchases}
    <section>
      <h2>Cut List</h2>
    <table><thead><tr><th>#</th><th>Part</th><th>Qty</th><th>Length</th><th>Width</th><th>Thickness</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
    ${buildSteps}
    ${guides ? `<section class="guides"><h2>Cutting Diagrams</h2><div class="guideGrid">${guides}</div></section>` : ''}
  `);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}

function printPlanDetailsHtml(definition) {
  const details = definition.details;
  if (!details) return '';
  const sections = [
    ['Materials', details.materials],
    ['Tools', details.tools],
    ['Notes', details.notes]
  ].filter(([, items]) => items?.length);
  return sections.map(([title, items]) => `
    <div class="panel">
      <h2>${escapeHtml(title)}</h2>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function printDimensionSummaryHtml() {
  const rows = isShelfPlan()
    ? [
        ['Overall size', `${formatLength(result.shelfW, plan.unit)} x ${formatLength(result.shelfH, plan.unit)} x ${formatLength(result.shelfD, plan.unit)}`],
        ['Levels', result.levels],
        ['Bays', result.bays],
        ['Post size', `${formatLength(result.post, plan.unit)} x ${formatLength(result.stock, plan.unit)}`],
        ['Rail height', formatLength(plan.shelfRail, plan.unit)],
        ['Deck/plank width', formatLength(result.deck || plan.shelfDeck, plan.unit)]
      ]
    : [
        ['Canvas', `${formatLength(plan.canvasW, plan.unit)} x ${formatLength(plan.canvasH, plan.unit)} x ${formatLength(plan.canvasT, plan.unit)}`],
        ['Outer size', `${formatLength(result.outerW, plan.unit)} x ${formatLength(result.outerH, plan.unit)}`],
        ['Reveal', formatLength(plan.reveal, plan.unit)],
        ['Face width', formatLength(plan.face, plan.unit)],
        ['Depth', formatLength(plan.depth, plan.unit)],
        ['Mounting', result.effectiveMountMethod]
      ];
  return `
    <div class="panel">
      <h2>Plan Summary</h2>
      <div class="kv">${rows.map(([key, value]) => `<div><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div>
    </div>
  `;
}

function printPurchaseSummaryHtml() {
  const estimate = estimateBoardPurchases(result.parts, purchaseBoardLength, plan.kerf || 0);
  if (!estimate.groups.length) return '';
  return `
    <section>
      <h2>Board Purchase Estimate</h2>
      <div class="purchaseStats">
        <span><b>${estimate.totalBoards}</b> board${estimate.totalBoards === 1 ? '' : 's'} to buy</span>
        <span><b>${escapeHtml(formatLength(estimate.totalPurchased, plan.unit))}</b> purchased length</span>
        <span><b>${escapeHtml(formatLength(estimate.totalWaste, plan.unit))}</b> estimated offcut</span>
      </div>
      <table><thead><tr><th>Stock</th><th>Boards</th><th>Cut layout</th><th>Offcut</th></tr></thead><tbody>
        ${estimate.groups.map((group) => `
          <tr>
            <td>${escapeHtml(formatLength(group.width, plan.unit))} x ${escapeHtml(formatLength(group.thickness, plan.unit))}</td>
            <td>${group.boards.length}</td>
            <td>${group.boards.map((board, index) => `<div><b>${index + 1}</b>: ${board.pieces.map((piece) => escapeHtml(formatLength(piece.length, plan.unit))).join(' + ')}</div>`).join('')}</td>
            <td>${escapeHtml(formatLength(group.waste, plan.unit))}</td>
          </tr>
        `).join('')}
      </tbody></table>
    </section>
  `;
}

function printCompletedImageHtml() {
  const target = printCameraTarget();
  const span = printCameraSpan();
  const data = viewer.captureImage({
    camera: { x: span * 1.15, y: span * 0.75, z: span * 1.25 },
    target,
    vis: buildStepVisibility(),
    stage: 999,
    width: 980,
    height: 640
  });
  return data ? `<img src="${data}" alt="Completed ${escapeHtml(getPlanDefinition(currentPlanId).title)}">` : '';
}

function printBuildStepsHtml(definition) {
  const steps = definition.buildSteps || [];
  if (!steps.length) return '';
  return `
    <section class="steps pageBreak">
      <h2>Step-by-step Build Instructions</h2>
      ${steps.map((step, index) => {
        const images = buildStepImages(step, {
          camera: printStepCamera(step),
          target: printCameraTarget(),
          width: 820,
          height: 480
        });
        return `
          <div class="printStep">
            <div>
              <div class="stepNo">Step ${index + 1}</div>
              <h3>${escapeHtml(step.title)}</h3>
              <ul>${(step.instructions || []).map((item) => `<li>${escapeHtml(formatBuildInstruction(item))}</li>`).join('')}</ul>
            </div>
            ${images.length ? `<div class="printStepImages">${images.map((image, imageIndex) => `<img src="${image}" alt="${escapeHtml(step.title)} assembly view ${imageIndex + 1}">`).join('')}</div>` : '<div class="panel muted">3D view unavailable</div>'}
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function printViewHtml() {
  const fullVis = buildStepVisibility();
  const frameVis = isShelfPlan()
    ? { posts: true, rails: true, slats: false, hardware: true }
    : { face: true, liner: true, spacers: true, canvas: false, hardware: true };
  const target = printCameraTarget();
  const span = printCameraSpan();
  const shots = [
    { title: 'Top view, full assembly', camera: { x: 0.01, y: span * 1.8, z: 0.01 }, vis: fullVis },
    { title: 'Angled view, full assembly', camera: { x: span * 1.15, y: span * 0.75, z: span * 1.25 }, vis: fullVis },
    { title: isShelfPlan() ? 'Structure without shelf surfaces' : 'Frame and supports', camera: { x: 0.01, y: span * 1.8, z: 0.01 }, vis: frameVis },
    { title: 'Back view, full assembly', camera: { x: span * 1.1, y: span * 0.45, z: -span * 1.35 }, vis: fullVis }
  ].map((shot) => ({
    ...shot,
    data: viewer.captureImage({ camera: shot.camera, target, vis: shot.vis, stage: 999, width: 900, height: 520 })
  })).filter((shot) => shot.data);
  if (!shots.length) return '';
  return `
    <section class="views">
      <h2>Completed Object Views</h2>
      <div class="viewGrid">
        ${shots.map((shot) => `<div class="viewShot"><b>${escapeHtml(shot.title)}</b><img src="${shot.data}" alt="${escapeHtml(shot.title)}"></div>`).join('')}
      </div>
    </section>
  `;
}

function printCameraSpan() {
  const width = isShelfPlan() ? result?.shelfW || 48 : result?.outerW || 24;
  const height = isShelfPlan() ? result?.shelfH || 72 : result?.outerH || 24;
  const depth = isShelfPlan() ? result?.shelfD || 24 : plan.depth || 2;
  return Math.max(width, height, depth, 24) * 0.13;
}

function printCameraTarget() {
  return isShelfPlan()
    ? { x: 0, y: (result?.shelfH || 72) * 0.05, z: 0 }
    : { x: 0, y: Math.max(0.05, (plan.depth || 1) * 0.05), z: 0 };
}

function printStepCamera(step) {
  if (step.camera) return step.camera;
  const span = printCameraSpan();
  return { x: span * 1.15, y: span * 0.72, z: span * 1.25 };
}

function printGuideHtml(part, index) {
  if (normalizeBuild(plan.build) === 'strainer' && part.part.startsWith('Face') && part.notes.includes('rabbet')) {
    return `<section class="printGuide"><h2>${index + 1}. ${escapeHtml(part.part)}</h2>${rabbetGuideContent(part)}</section>`;
  }
  if (part.notes.includes('miter') && (part.part.startsWith('Liner') || part.part.startsWith('Strainer') || normalizeBuild(plan.build) === 'liner' && part.part.startsWith('Face'))) {
    return `<section class="printGuide"><h2>${index + 1}. ${escapeHtml(part.part)}</h2>${miterGuideContent(part)}</section>`;
  }
  return '';
}

function hydratePlanFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return null;
  const next = clonePlan(DEFAULT_PLAN);
  Object.assign(next, getPlanDefinition(params.get('plan')).defaults || {});
  for (const [key, raw] of params.entries()) {
    if (key in next) {
      if (STRING_PLAN_KEYS.includes(key)) next[key] = key === 'build' ? normalizePlanBuild(raw) : raw;
      else if (BOOLEAN_PLAN_KEYS.includes(key)) next[key] = raw === 'true' || raw === '1';
      else next[key] = Number(raw);
    }
  }
  return next;
}

function hydratePlanFromStorage() {
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const next = clonePlan(DEFAULT_PLAN);
    Object.entries(saved.plan || {}).forEach(([key, value]) => {
      if (!(key in next)) return;
      if (STRING_PLAN_KEYS.includes(key)) {
        next[key] = key === 'build' ? normalizePlanBuild(value) : value;
      } else if (BOOLEAN_PLAN_KEYS.includes(key)) {
        next[key] = value === true || value === 'true' || value === 1 || value === '1';
      } else if (typeof value === 'number' && Number.isFinite(value)) {
        next[key] = value;
      } else if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
        next[key] = Number(value);
      }
    });
    if (saved.plan?.vis && typeof saved.plan.vis === 'object') {
      next.vis = { ...next.vis, ...saved.plan.vis };
    }
    if (next.build === 'shelves' && next.shelfPost <= 1.5) next.shelfPost = 3.5;
    return { plan: next, view: saved.view || null };
  } catch {
    return null;
  }
}

function savePlanState() {
  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({
      planId: currentPlanId,
      plan: {
        ...serializePlan(plan),
        vis: { ...plan.vis }
      },
      view: {
        camera: viewer.getCameraPosition(),
        target: viewer.getTargetPosition(),
        projection: viewer.getProjectionMode()
      }
    }));
  } catch {
    // Local persistence is a convenience; the planner should keep working if storage is unavailable.
  }
}

function restoreSavedView() {
  if (!savedState?.view) return;
  if (savedState.view.projection) {
    viewer.setProjectionMode(savedState.view.projection);
    renderProjectionToggle();
  }
  if (savedState.view.camera && savedState.view.target) {
    viewer.setCameraPosition(savedState.view.camera, savedState.view.target);
    renderCameraInputs();
  }
}

function serializePlan(current) {
  const serializable = {};
  Object.entries(current).forEach(([key, value]) => {
    if (typeof value !== 'object' && Number.isFinite(value)) serializable[key] = String(value);
    else if (typeof value === 'boolean') serializable[key] = String(value);
    else if (typeof value === 'string') serializable[key] = value;
  });
  return serializable;
}

function normalizePlanBuild(value) {
  return value === 'shelves' || value === 'rolling-shelves' ? value : normalizeBuild(value);
}

function displayNumber(value) {
  const converted = fromInches(value, plan.unit);
  return typeof converted === 'number' ? converted.toFixed(plan.unit === 'mm' ? 1 : 3) : '';
}

function roundDisplay(value) {
  if (!Number.isFinite(Number(value))) return '';
  return Number(value).toFixed(plan.unit === 'mm' ? 1 : 3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function temporaryBadge(message) {
  const old = $('#statusBar').innerHTML;
  $('#statusBar').innerHTML = `<span class="badge ok">${escapeHtml(message)}</span>`;
  setTimeout(() => { $('#statusBar').innerHTML = old; }, 1800);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
