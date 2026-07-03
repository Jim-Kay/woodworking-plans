import { Z_CLIP_CATALOG } from './catalogs.js';
import { buildFrameAssembly } from './frameAssembly.js';

const INCH_TO_MM = 25.4;
const Z_CLIP_TOLERANCE_IN = 1 / 32;
const SCREW_MIN_EDGE_IN = 0.5;
const RABBET_LEDGE_EPSILON_IN = 0.001;
const MIN_RABBET_LEDGE_WARNING_IN = 0.125;
const INCH_DISPLAY_DENOMINATOR = 16;
export const Z_CLIP_LINER_SETBACK_IN = 0.5;

export function normalizeBuild(build = 'liner') {
  if (build === 'two') return 'liner';
  if (build === 'one') return 'strainer';
  return build === 'strainer' ? 'strainer' : 'liner';
}

export function usesSupportRails(plan) {
  return ['liner', 'strainer'].includes(normalizeBuild(plan.build));
}

export function clonePlan(plan) {
  return JSON.parse(JSON.stringify(plan));
}

export function toInches(value, unit = 'in') {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'mm' ? n / INCH_TO_MM : n;
}

export function fromInches(value, unit = 'in') {
  if (!Number.isFinite(value)) return '';
  return unit === 'mm' ? value * INCH_TO_MM : value;
}

export function formatLength(value, unit = 'in') {
  if (!Number.isFinite(value)) return '-';
  if (unit === 'mm') return `${(value * INCH_TO_MM).toFixed(1)} mm`;
  return `${formatFractionalInches(value)} in`;
}

function formatFractionalInches(value) {
  const sign = value < 0 ? '-' : '';
  const roundedSixteenths = Math.round(Math.abs(value) * INCH_DISPLAY_DENOMINATOR);
  const whole = Math.floor(roundedSixteenths / INCH_DISPLAY_DENOMINATOR);
  const numerator = roundedSixteenths % INCH_DISPLAY_DENOMINATOR;
  if (!numerator) return `${sign}${whole}`;

  const divisor = greatestCommonDivisor(numerator, INCH_DISPLAY_DENOMINATOR);
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = INCH_DISPLAY_DENOMINATOR / divisor;
  const fraction = `${simplifiedNumerator}/${simplifiedDenominator}`;
  return whole ? `${sign}${whole} ${fraction}` : `${sign}${fraction}`;
}

function greatestCommonDivisor(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export function getStageLabels(build = 'two') {
  const buildKind = normalizeBuild(build);
  const labels = ['Plan'];
  if (buildKind === 'liner') labels.push('Liner: Bottom', 'Liner: Top', 'Liner: Left', 'Liner: Right');
  if (buildKind === 'strainer') labels.push('Rabbet Ledge', 'Strainer: Bottom', 'Strainer: Top', 'Strainer: Left', 'Strainer: Right');
  labels.push('Face: Bottom', 'Face: Top', 'Face: Left', 'Face: Right', 'Spacers', 'Canvas', 'Mounting', 'Stretchers');
  return labels;
}

export function getZClipByOffset(offset) {
  const numericOffset = Number(offset);
  if (!Number.isFinite(numericOffset)) return null;
  return Z_CLIP_CATALOG.find((clip) => Math.abs(clip.offset - numericOffset) < Z_CLIP_TOLERANCE_IN) || null;
}

export function zClipFits(clipDef, plan, linerDepth) {
  const reasons = [];
  if (!clipDef) return { ok: false, reasons: ['No clip definition'] };

  if (Number.isFinite(linerDepth) && Math.abs(linerDepth - clipDef.offset) > Z_CLIP_TOLERANCE_IN) {
    reasons.push(`Liner depth ${formatLength(linerDepth, plan.unit)} does not match clip offset ${formatLength(clipDef.offset, plan.unit)}`);
  }

  const expectedLinerW = recommendedLinerWidth(plan);
  if (Number.isFinite(expectedLinerW) && Number.isFinite(plan.linerW) && Math.abs(plan.linerW - expectedLinerW) > Z_CLIP_TOLERANCE_IN) {
    reasons.push(`For Z-clips, liner width should be ${formatLength(expectedLinerW, plan.unit)} so the liner inner edge sits ${formatLength(Z_CLIP_LINER_SETBACK_IN, plan.unit)} outside the stretcher inner edge.`);
  }

  return { ok: reasons.length === 0, reasons };
}

export function calculatePlan(plan) {
  const buildKind = normalizeBuild(plan.build);
  const errors = [];
  const warnings = [];
  const required = ['canvasW', 'canvasH', 'canvasT', 'stretcherW', 'reveal', 'face', 'depth', 'stock'];
  for (const key of required) {
    if (!Number.isFinite(plan[key]) || (key !== 'reveal' && plan[key] <= 0) || (key === 'reveal' && plan[key] < 0)) {
      errors.push(`${labelFor(key)} must be a valid positive number.`);
    }
  }

  if (Number.isFinite(plan.stretcherW) && (plan.stretcherW * 2 >= plan.canvasW || plan.stretcherW * 2 >= plan.canvasH)) {
    errors.push('Stretcher width is too large for this canvas size.');
  }

  if (buildKind === 'strainer' && (!Number.isFinite(plan.rabbet) || plan.rabbet <= 0)) {
    errors.push('Rabbet ledge must be a valid positive number.');
  }
  if (buildKind === 'strainer' && (!Number.isFinite(plan.strainerDepth) || plan.strainerDepth <= 0)) {
    errors.push('Strainer depth must be a valid positive number.');
  }
  if (!Number.isFinite(plan.faceLip) || plan.faceLip < 0) {
    errors.push('Face lip must be zero or a positive number.');
  }

  const supportDepth = plan.depth - (plan.canvasT + (plan.backGap || 0));
  const supportThickness = buildKind === 'strainer'
    ? plan.strainerDepth
    : supportDepth;
  const supportBottom = buildKind === 'strainer' ? supportDepth - supportThickness : 0;
  const linerDepth = supportDepth;

  if (Number.isFinite(supportDepth) && supportDepth < 0) {
    errors.push('Frame depth is shallower than the canvas thickness plus back clearance.');
  } else if (Number.isFinite(supportDepth) && supportDepth < 0.5) {
    errors.push('Canvas support depth is less than 1/2 in.');
  }
  if (buildKind === 'strainer' && Number.isFinite(supportThickness) && Number.isFinite(supportDepth) && supportThickness > supportDepth) {
    errors.push('Strainer depth is deeper than the available support height.');
  }
  if (buildKind === 'strainer' && Number.isFinite(supportBottom)) {
    if (supportBottom <= RABBET_LEDGE_EPSILON_IN) {
      errors.push(`Strainer depth leaves no rabbet ledge. Increase frame depth or reduce strainer depth so at least ${formatLength(MIN_RABBET_LEDGE_WARNING_IN, plan.unit)} remains under the strainer.`);
    } else if (supportBottom < MIN_RABBET_LEDGE_WARNING_IN) {
      warnings.push(`Rabbet ledge is only ${formatLength(supportBottom, plan.unit)} wide. A ledge of at least ${formatLength(MIN_RABBET_LEDGE_WARNING_IN, plan.unit)} is recommended for the strainer.`);
    }
  }

  if (usesSupportRails({ build: buildKind }) && (!Number.isFinite(plan.linerW) || plan.linerW <= 0)) {
    errors.push('Support rail width must be positive.');
  }

  const innerW = plan.canvasW + 2 * plan.reveal;
  const innerH = plan.canvasH + 2 * plan.reveal;
  const outerW = innerW + 2 * plan.face;
  const outerH = innerH + 2 * plan.face;

  const clipSelected = plan.mountMethod === 'clips' && plan.mountClip !== 'none' && usesSupportRails({ build: buildKind });
  const clipDef = clipSelected ? getZClipByOffset(Number(plan.mountClip)) : null;
  const clipFit = clipSelected ? zClipFits(clipDef, { ...plan, build: buildKind }, supportDepth) : { ok: false, reasons: [] };
  const effectiveMountMethod = clipSelected ? (clipFit.ok ? 'Z-clips' : 'Screws') : plan.mountMethod === 'screws' ? 'Screws' : '-';
  if (clipSelected && !clipFit.ok) warnings.push(...clipFit.reasons);

  if (plan.mountMethod === 'screws' && usesSupportRails({ build: buildKind })) {
    const expectedLinerW = recommendedLinerWidth(plan);
    if (Number.isFinite(expectedLinerW) && Math.abs(plan.linerW - expectedLinerW) > Z_CLIP_TOLERANCE_IN) {
      warnings.push(`For screws, liner width should be ${formatLength(expectedLinerW, plan.unit)} so the liner inner edge lines up with the stretcher inner edge.`);
    }
    if (Number.isFinite(plan.stretcherW) && plan.stretcherW < SCREW_MIN_EDGE_IN) {
      warnings.push(`Stretcher width is narrow for screw mounting. Recommended minimum screw landing is ${formatLength(SCREW_MIN_EDGE_IN, plan.unit)}.`);
    }
  }

  const parts = makeParts(plan, innerW, innerH, outerW, outerH);
  const screwRange = getScrewLengthRange({ ...plan, build: buildKind }, supportThickness);
  if (plan.mountMethod === 'screws' && usesSupportRails({ build: buildKind }) && screwRange) {
    parts.push({
      part: 'Mounting Screws',
      qty: 8,
      length: screwRange.min,
      width: NaN,
      thickness: NaN,
      notes: `Use ${formatLength(screwRange.min, plan.unit)} to ${formatLength(screwRange.max, plan.unit)} screws. Minimum reaches halfway into stretcher; maximum leaves ${formatLength(screwRange.frontSafety, plan.unit)} before canvas front.`
    });
  }
  const boardFeet = estimateBoardFeet(plan, parts);
  const calculation = { ok: errors.length === 0, errors, warnings, innerW, innerH, outerW, outerH, linerDepth, supportDepth, supportThickness, supportBottom, parts, boardFeet, effectiveMountMethod, clipFit, screwRange };
  if (calculation.ok) calculation.assembly = buildFrameAssembly({ ...plan, build: buildKind }, calculation);
  return calculation;
}

export function applyOuterSize(plan, outerW, outerH) {
  const next = clonePlan(plan);
  if (!Number.isFinite(outerW) || !Number.isFinite(outerH)) return next;
  const ringW = (outerW - next.canvasW) / 2;
  const ringH = (outerH - next.canvasH) / 2;
  const ring = Math.min(ringW, ringH);
  next.reveal = Math.max(0, Math.min(next.reveal, ring - 0.25));
  next.face = Math.max(0.25, ring - next.reveal);
  return next;
}

export function applyClipConstraints(plan) {
  const next = clonePlan(plan);
  if (next.mountMethod !== 'clips' || next.mountClip === 'none') return next;
  const clip = getZClipByOffset(Number(next.mountClip));
  if (!clip) return next;
  next.depth = next.canvasT + clip.offset;
  next.linerW = recommendedLinerWidth(next);
  return next;
}

export function recommendedLinerWidth(plan) {
  if (!usesSupportRails(plan)) return plan.linerW;
  if (!Number.isFinite(plan.stretcherW) || !Number.isFinite(plan.reveal)) return NaN;
  if (plan.mountMethod === 'clips') return Math.max(0.25, plan.reveal + plan.stretcherW - Z_CLIP_LINER_SETBACK_IN);
  return plan.reveal + plan.stretcherW;
}

export function applyMountingRules(plan) {
  const next = clonePlan(plan);
  next.build = normalizeBuild(next.build);
  if (!usesSupportRails(next)) return next;
  next.linerW = recommendedLinerWidth(next);
  if (next.mountMethod === 'clips') return applyClipConstraints(next);
  return next;
}

function makeParts(plan, innerW, innerH, outerW, outerH) {
  const buildKind = normalizeBuild(plan.build);
  const parts = [];
  const strainerThickness = plan.strainerDepth;
  const faceThickness = buildKind === 'strainer' ? plan.face + (plan.rabbet || 0) : plan.face;
  const faceDepth = plan.depth + (plan.faceLip || 0);
  const supportDepth = plan.depth - (plan.canvasT + (plan.backGap || 0));
  const rabbetWidth = Math.max(0, supportDepth - strainerThickness);
  const rabbetNote = `cut ${formatLength(plan.rabbet || 0, plan.unit)} deep x ${formatLength(rabbetWidth, plan.unit)} wide rabbet ledge from back edge after milling`;
  if (buildKind === 'liner') {
    if (plan.join === 'miter') {
      parts.push({ part: 'Face - Long', qty: 2, length: outerH, width: faceDepth, thickness: plan.face, notes: '45 degree miter, measure to long point' });
      parts.push({ part: 'Face - Short', qty: 2, length: outerW, width: faceDepth, thickness: plan.face, notes: '45 degree miter, measure to long point' });
      parts.push({ part: 'Liner - Long', qty: 2, length: innerH, width: plan.linerW, thickness: plan.stock, notes: '45 degree miter, measure to long point' });
      parts.push({ part: 'Liner - Short', qty: 2, length: innerW, width: plan.linerW, thickness: plan.stock, notes: '45 degree miter, measure to long point' });
    } else {
      parts.push({ part: 'Face - Long', qty: 2, length: outerH, width: faceDepth, thickness: plan.face, notes: 'Square cut' });
      parts.push({ part: 'Face - Short', qty: 2, length: Math.max(0, outerW - plan.face * 2), width: faceDepth, thickness: plan.face, notes: 'Between face long sides' });
      parts.push({ part: 'Liner - Long', qty: 2, length: innerH, width: plan.linerW, thickness: plan.stock, notes: 'Square cut' });
      parts.push({ part: 'Liner - Short', qty: 2, length: Math.max(0, innerW - plan.linerW * 2), width: plan.linerW, thickness: plan.stock, notes: 'Between liner long sides' });
    }
  } else {
    if (plan.join === 'miter') {
      parts.push({ part: 'Face - Long', qty: 2, length: outerH, width: faceDepth, thickness: faceThickness, notes: `45 degree miter, ${rabbetNote}` });
      parts.push({ part: 'Face - Short', qty: 2, length: outerW, width: faceDepth, thickness: faceThickness, notes: `45 degree miter, ${rabbetNote}` });
      parts.push({ part: 'Strainer - Long', qty: 2, length: innerH, width: plan.linerW, thickness: strainerThickness, notes: '45 degree miter, seat on rabbet ledge' });
      parts.push({ part: 'Strainer - Short', qty: 2, length: innerW, width: plan.linerW, thickness: strainerThickness, notes: '45 degree miter, seat on rabbet ledge' });
    } else {
      parts.push({ part: 'Face - Long', qty: 2, length: outerH, width: faceDepth, thickness: faceThickness, notes: `Square cut, ${rabbetNote}` });
      parts.push({ part: 'Face - Short', qty: 2, length: Math.max(0, outerW - faceThickness * 2), width: faceDepth, thickness: faceThickness, notes: `Between face long sides, ${rabbetNote}` });
      parts.push({ part: 'Strainer - Long', qty: 2, length: innerH, width: plan.linerW, thickness: strainerThickness, notes: 'Square cut, seat on rabbet ledge' });
      parts.push({ part: 'Strainer - Short', qty: 2, length: Math.max(0, innerW - plan.linerW * 2), width: plan.linerW, thickness: strainerThickness, notes: 'Between strainer long sides' });
    }
  }
  const spacer = Math.min(1, Math.max(0.125, plan.reveal));
  parts.push({ part: 'Spacer Blocks', qty: 8, length: spacer, width: spacer, thickness: spacer, notes: 'Optional: maintain reveal during glue-up' });
  return parts;
}

function estimateBoardFeet(plan, parts) {
  const cubic = parts
    .filter((part) => part.part !== 'Spacer Blocks')
    .filter((part) => part.part !== 'Mounting Screws')
    .reduce((sum, part) => sum + part.qty * part.length * part.width * part.thickness, 0);
  return cubic / 144;
}

export function getScrewLengthRange(plan, linerDepth = plan.depth - (plan.canvasT + (plan.backGap || 0))) {
  if (plan.mountMethod !== 'screws' || !usesSupportRails(plan)) return null;
  if (!Number.isFinite(linerDepth) || !Number.isFinite(plan.canvasT)) return null;
  const frontSafety = Math.min(0.125, Math.max(0.0625, plan.canvasT * 0.2));
  const min = linerDepth + plan.canvasT * 0.5;
  const max = linerDepth + plan.canvasT - frontSafety;
  if (max <= min) return null;
  return { min, max, frontSafety };
}

function labelFor(key) {
  return {
    canvasW: 'Canvas width',
    canvasH: 'Canvas height',
    canvasT: 'Canvas thickness',
    stretcherW: 'Stretcher width',
    reveal: 'Reveal',
    face: 'Face width',
    depth: 'Frame depth',
    faceLip: 'Face lip',
    stock: 'Stock thickness',
    strainerDepth: 'Strainer depth'
  }[key] || key;
}
