import { canonicalToPortalResult } from './adapter.js';
import { validateGeneratedDesign } from './validator.js';

export const BUILD_STEP_QUALITY_RUBRIC = [
  'Each step should describe one build operation or verification gate.',
  'Each step should have builder-facing instructions, exact part IDs, and a stage-specific visual intent.',
  'Cut steps should communicate board-vs-panel shape and key dimensions.',
  'Drill, mark, and fastener steps should include hole diameter, offsets, edge clearance, and the host part.',
  'If the text says to work before assembly, the visual should not show only the finished assembly.',
  'Complex or hidden fastening should request callouts, close-ups, or inset views instead of relying on a generic model view.',
  'Assembly-relevant generated steps should include mini-video animation intent so the part order can be reviewed visually.'
];

export function reviewBuildSteps(design) {
  const findings = [];
  const recommendedAnnotations = { step_instructions: [], part_notes: [], design_notes: [] };
  const missingCapabilities = [];
  if (!design) {
    return {
      ok: false,
      quality_gate_passed: false,
      status: 'not_run',
      score: 0,
      rubric: BUILD_STEP_QUALITY_RUBRIC,
      findings: [{ severity: 'error', category: 'build_steps', message: 'No design exists yet.' }],
      recommended_annotations: recommendedAnnotations,
      missing_capabilities: missingCapabilities
    };
  }

  const steps = Array.isArray(design.assembly_steps) ? design.assembly_steps : [];
  if (!steps.length) {
    findings.push({
      severity: 'error',
      category: 'build_steps',
      message: 'The design has no assembly_steps for a builder to follow.'
    });
  }

  const validation = design.validation || validateGeneratedDesign(design);
  const portalResult = canonicalToPortalResult({ ...design, validation }, validation);
  const portalSteps = portalResult.buildSteps || [];
  const partsById = new Map((design.parts || []).map((part) => [part.id, part]));

  for (const [index, step] of steps.entries()) {
    reviewStep({ design, step, index, partsById, portalStep: portalSteps[index], findings, recommendedAnnotations, missingCapabilities });
  }

  const errorCount = findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 30 - warningCount * 10);
  const qualityGatePassed = errorCount === 0 && warningCount === 0;
  return {
    ok: true,
    quality_gate_passed: qualityGatePassed,
    status: qualityGatePassed ? 'ready' : 'needs_revision',
    score,
    rubric: BUILD_STEP_QUALITY_RUBRIC,
    findings,
    recommended_annotations: recommendedAnnotations,
    recommended_tool_call: hasRecommendedAnnotations(recommendedAnnotations)
      ? { name: 'annotate_design', arguments: recommendedAnnotations }
      : null,
    missing_capabilities: dedupeCapabilities(missingCapabilities)
  };
}

function reviewStep({ design, step, index, partsById, portalStep, findings, recommendedAnnotations, missingCapabilities }) {
  const stepLabel = step.id || `step.${index + 1}`;
  const titleText = String(step.title || '').toLowerCase();
  const text = [step.title, ...(step.instructions || [])].join(' ').toLowerCase();
  const stepParts = (step.part_ids || []).map((id) => partsById.get(id)).filter(Boolean);
  const referenceParts = stepParts.filter((part) => part.physical === false);
  const physicalParts = stepParts.filter((part) => part.physical !== false);
  const instructions = Array.isArray(step.instructions) ? step.instructions : [];

  if (!step.id) {
    findings.push({
      severity: 'error',
      category: 'build_steps',
      step_id: stepLabel,
      message: 'Build step is missing a stable id, so reviewers and annotation tools cannot target it.'
    });
  }

  if (!step.title || !instructions.length) {
    findings.push({
      severity: 'error',
      category: 'build_steps',
      step_id: stepLabel,
      message: 'Build step needs a title and at least one builder-facing instruction.'
    });
  }

  if (!Array.isArray(step.part_ids) || !step.part_ids.length) {
    findings.push({
      severity: 'warning',
      category: 'part_references',
      step_id: stepLabel,
      message: 'Build step has no part_ids, so the renderer and reviewer cannot focus the visual on the current operation.'
    });
  }

  if (isCutStep(titleText)) reviewCutStep({ design, step, text, findings, recommendedAnnotations });
  if (isDrillOrMarkStep(titleText)) reviewDrillOrMarkStep({ step, text, referenceParts, physicalParts, portalStep, findings, recommendedAnnotations, missingCapabilities });
  if (mentionsFasteners(text)) reviewFastenerStep({ step, text, findings, recommendedAnnotations, missingCapabilities });

  if (!isFinishStep(text) && !hasStageSpecificDiagram(portalStep)) {
    findings.push({
      severity: 'warning',
      category: 'step_visual',
      step_id: stepLabel,
      message: 'Portal adapter will use a generic assembled 3D view for this step; a first-time builder may not know which parts changed.'
    });
    missingCapabilities.push({
      capability: 'stage-specific build-step diagram selection',
      reason: `Step ${stepLabel} needs a visual mode that highlights only the current operation instead of a generic assembled view.`
    });
  }

  if (!isFinishStep(text) && !isCutStep(titleText) && !hasBuildStepAnimation(portalStep)) {
    findings.push({
      severity: 'warning',
      category: 'step_animation',
      step_id: stepLabel,
      message: 'Build step has no mini-video animation intent, so the local loop cannot visually check whether the operation order is logical.'
    });
    missingCapabilities.push({
      capability: 'generated build-step mini-video animation',
      reason: `Step ${stepLabel} needs reusable animation metadata that brings its referenced parts into the current assembly state.`
    });
  }
}

function reviewCutStep({ design, step, text, findings, recommendedAnnotations }) {
  const cutPartIds = new Set((design.cut_list || []).map((item) => item.part_id));
  const missingCutParts = (step.part_ids || []).filter((partId) => cutPartIds.has(partId) === false);
  if (missingCutParts.length) {
    findings.push({
      severity: 'warning',
      category: 'cut_list',
      step_id: step.id,
      message: `Cut step references parts that are not in the cut list: ${missingCutParts.join(', ')}.`
    });
  }

  if (!/\d/.test(text)) {
    findings.push({
      severity: 'warning',
      category: 'cut_dimensions',
      step_id: step.id,
      message: 'Cut step text does not include dimensions; builders may need to jump back to the cut list.'
    });
    recommendedAnnotations.step_instructions.push({
      step_id: step.id,
      mode: 'append',
      instructions: cutDimensionInstructions(design, step)
    });
  }
}

function cutDimensionInstructions(design, step) {
  const byPartId = new Map((design.cut_list || []).map((item) => [item.part_id, item]));
  const lines = (step.part_ids || [])
    .map((partId) => byPartId.get(partId))
    .filter(Boolean)
    .map((item) => {
      const panelNote = item.width_in > item.thickness_in * 3 ? ' Treat this as a flat panel in the cut layout, not a narrow rail.' : '';
      return `Cut ${item.qty} ${item.name}: ${formatInches(item.length_in)} long x ${formatInches(item.width_in)} wide x ${formatInches(item.thickness_in)} thick.${panelNote}`;
    });
  return lines.length ? lines : ['Add the exact length, width, and thickness for each cut part, and call out flat panels separately from narrow rails.'];
}

function reviewDrillOrMarkStep({ step, text, referenceParts, physicalParts, portalStep, findings, recommendedAnnotations, missingCapabilities }) {
  if (!referenceParts.length) {
    findings.push({
      severity: 'warning',
      category: 'drill_references',
      step_id: step.id,
      message: 'Drill/mark step does not reference hole, pilot, fastener, or layout reference parts.'
    });
  }

  if (!physicalParts.length && referenceParts.length) {
    const hostIds = [...new Set(referenceParts.map((part) => part.meta?.host_part_id).filter(Boolean))];
    if (hostIds.length) {
      recommendedAnnotations.step_instructions.push({
        step_id: step.id,
        mode: 'append',
        instructions: [`Name the host part(s) for this layout in the step text: ${hostIds.join(', ')}.`]
      });
    }
  }

  if (!/\d/.test(text) || !/(edge|end|inset|center|spacing|from)/.test(text)) {
    findings.push({
      severity: 'warning',
      category: 'drill_layout',
      step_id: step.id,
      message: 'Drill/mark step should include hole size plus offset, spacing, or edge-clearance guidance.'
    });
    recommendedAnnotations.step_instructions.push({
      step_id: step.id,
      mode: 'append',
      instructions: ['Add hole diameter, distance from the nearest edges or ends, and minimum edge clearance before drilling.']
    });
  }

  if (/before assembly/.test(text) && !hasPreAssemblyDiagram(portalStep)) {
    findings.push({
      severity: 'warning',
      category: 'stage_visual',
      step_id: step.id,
      message: 'Step text says to drill before assembly, but the portal visual is likely to show the assembled panels and rails together.'
    });
    missingCapabilities.push({
      capability: 'pre-assembly drill-layout view',
      reason: `Step ${step.id} needs a visual that shows only the loose host part(s), hole references, dimensions, and labels before the frame or tray is assembled.`
    });
  }
}

function reviewFastenerStep({ step, text, findings, recommendedAnnotations, missingCapabilities }) {
  if (!/(pilot|predrill|pre-drill|countersink|angle|diagonal|clearance|avoid)/.test(text)) {
    findings.push({
      severity: 'warning',
      category: 'fastener_guidance',
      step_id: step.id,
      message: 'Fastener step mentions screws or nails but does not explain pilot holes, countersinks, angle, clearance, or collision avoidance.'
    });
    recommendedAnnotations.step_instructions.push({
      step_id: step.id,
      mode: 'append',
      instructions: ['Predrill fastener holes, keep screws offset from opposing screws, and countersink exposed heads if needed.']
    });
  }

  if (/(diagonal|angle|caster|wheel|hidden|pocket)/.test(text)) {
    missingCapabilities.push({
      capability: 'fastener callout or inset build-step diagram',
      reason: `Step ${step.id} mentions a fastener detail that should be shown with a close-up callout or inset view.`
    });
  }
}

function isCutStep(text) {
  return /\bcut|cutting|parts?\b/.test(text);
}

function isDrillOrMarkStep(text) {
  return /\bdrill|pilot|hole|mark|layout\b/.test(text);
}

function mentionsFasteners(text) {
  return /\bscrew|nail|fasten|glue|caster|wheel|bolt\b/.test(text);
}

function isFinishStep(text) {
  return /\bfinish|sand|paint|varnish|seal|review\b/.test(text);
}

function hasStageSpecificDiagram(portalStep = {}) {
  return Boolean(portalStep.diagram?.stageSpecific || portalStep.image || portalStep.images?.length);
}

function hasPreAssemblyDiagram(portalStep = {}) {
  return Boolean(portalStep.diagram?.preAssembly || portalStep.image === 'drill-layout' || portalStep.image === 'linear-hardware-drill-layout');
}

function hasBuildStepAnimation(portalStep = {}) {
  return Boolean(portalStep.animation?.type);
}

function dedupeCapabilities(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = `${item.capability.toLowerCase()}|${item.reason.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function formatInches(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value} in`;
  return `${Number.isInteger(number) ? number : Number(number.toFixed(3))} in`;
}

function hasRecommendedAnnotations(annotations) {
  return Boolean(
    annotations.step_instructions.length
    || annotations.part_notes.length
    || annotations.design_notes.length
  );
}
