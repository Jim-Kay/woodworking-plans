export function validateGeneratedDesign(design) {
  const errors = [];
  const warnings = [];

  if (!design || typeof design !== 'object') {
    return result(['Design must be an object.'], warnings);
  }

  requiredString(design.schema_version, 'schema_version', errors);
  requiredString(design.design_id, 'design_id', errors);
  requiredString(design.template_id, 'template_id', errors);
  if (design.units !== 'in') errors.push('Only inch-based generated designs are supported in this first sandbox pass.');

  const parts = Array.isArray(design.parts) ? design.parts : [];
  if (!parts.length) errors.push('Design must include at least one part.');
  const partIds = new Set();
  for (const part of parts) {
    if (!part?.id) errors.push('Every part must include an id.');
    if (partIds.has(part.id)) errors.push(`Duplicate part id: ${part.id}.`);
    partIds.add(part.id);
    for (const axis of ['x', 'y', 'z']) {
      if (!positiveNumber(part?.size?.[axis])) errors.push(`Part ${part?.id || '(missing id)'} size.${axis} must be positive.`);
      if (!finiteNumber(part?.position?.[axis])) errors.push(`Part ${part?.id || '(missing id)'} position.${axis} must be finite.`);
    }
  }

  const physicalPartIds = new Set(parts.filter((part) => part.physical !== false).map((part) => part.id));
  const partsById = new Map(parts.map((part) => [part.id, part]));
  for (const joint of design.joints || []) {
    if (!joint.id) errors.push('Every joint must include an id.');
    for (const partId of joint.part_ids || []) {
      if (!partIds.has(partId)) errors.push(`Joint ${joint.id || '(missing id)'} references missing part ${partId}.`);
    }
  }

  for (const step of design.assembly_steps || []) {
    if (!step.id) errors.push('Every assembly step must include an id.');
    for (const partId of step.part_ids || []) {
      if (!partIds.has(partId)) errors.push(`Assembly step ${step.id || '(missing id)'} references missing part ${partId}.`);
    }
  }

  const cutListIds = new Set((design.cut_list || []).map((item) => item.part_id));
  for (const partId of physicalPartIds) {
    if (!cutListIds.has(partId)) errors.push(`Physical part ${partId} is missing from cut list.`);
  }
  for (const item of design.cut_list || []) {
    if (!physicalPartIds.has(item.part_id)) errors.push(`Cut list references non-physical or missing part ${item.part_id}.`);
    for (const key of ['length_in', 'width_in', 'thickness_in']) {
      if (!positiveNumber(item[key])) errors.push(`Cut list item ${item.part_id} ${key} must be positive.`);
    }
  }

  validateReferenceHosts(parts, partsById, errors);
  validatePhysicalPartOverlaps(parts, errors);
  validateTrayBirdFeederRules(design, errors, warnings);
  validateBoardWithLinearHardwareRules(design, errors, warnings);
  validateWallPanelPocketHardwareRules(design, errors, warnings);
  validateTwoStepStoolRules(design, errors, warnings);

  return result(errors, warnings);
}

export function checkPublishability(design, validation = validateGeneratedDesign(design), exports = {}) {
  const errors = [];
  const warnings = [];
  if (!validation.ok) errors.push('Design must pass validation before publishing.');
  if (!design?.assembly_steps?.length) errors.push('Publishable package must include assembly steps.');
  if (!design?.cut_list?.length) errors.push('Publishable package must include a cut list.');
  if (!exports.openscad && !design?.exports?.openscad) warnings.push('OpenSCAD export has not been attached to the package yet.');
  if (!design?.parts?.some((part) => part.physical !== false)) errors.push('Publishable package must include physical parts.');
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    portal_integration_notes: [
      'Current portal integration supports generated tray-feeder, board-with-linear-hardware, and two-step-stool adapter paths.',
      'Wall-panel pocket-and-hardware packages can be generated and exported, but still need a portal catalog adapter before public browsing.',
      'Two-step stool packages can be generated and exported as dimensional aids, but require human structural review before real-world use.',
      'A generic generated-package loader is still needed for arbitrary generated templates.',
      'Template-driven parameter controls are still needed beyond the first hardcoded generated plan.'
    ]
  };
}

function validateTwoStepStoolRules(design, errors, warnings) {
  if (design.template_id !== 'two_step_stool') return;
  const p = design.parameters || {};
  if (!between(p.width_in, 10, 30)) errors.push('width_in must be between 10 and 30 in.');
  if (!between(p.depth_in, 10, 30)) errors.push('depth_in must be between 10 and 30 in.');
  if (!between(p.height_in, 8, 30)) errors.push('height_in must be between 8 and 30 in.');
  if (!between(p.lower_step_height_in, 4, 18)) errors.push('lower_step_height_in must be between 4 and 18 in.');
  if (Number(p.lower_step_height_in) >= Number(p.height_in)) errors.push('lower_step_height_in must be below height_in.');
  if (!between(p.lower_step_depth_in, 5, 16)) errors.push('lower_step_depth_in must be between 5 and 16 in.');
  if (!between(p.upper_step_depth_in, 5, 16)) errors.push('upper_step_depth_in must be between 5 and 16 in.');
  if (!between(p.tread_thickness_in, 0.5, 1.5)) errors.push('tread_thickness_in must be between 0.5 and 1.5 in.');
  if (!between(p.leg_width_in, 1, 3)) errors.push('leg_width_in must be between 1 and 3 in.');
  if (!between(p.leg_depth_in, 1, 3)) errors.push('leg_depth_in must be between 1 and 3 in.');
  if (Number(p.leg_width_in) * 2 >= Number(p.width_in)) errors.push('leg_width_in leaves no clear span between legs.');
  if (Number(p.leg_depth_in) * 2 >= Number(p.depth_in)) errors.push('leg_depth_in leaves no clear span between front and back legs.');
  const partsById = new Map((design.parts || []).map((part) => [part.id, part]));
  const upperTread = partsById.get('tread.upper');
  const middleLegs = ['leg.middle.left', 'leg.middle.right'].map((id) => partsById.get(id)).filter(Boolean);
  const upperFrontRail = partsById.get('rail.middle.upper');
  if (upperTread) {
    const upperFrontEdge = Number(upperTread.position?.y) - Number(upperTread.size?.y) / 2;
    const supportedFrontEdge = middleLegs.length >= 2
      && middleLegs.every((leg) => Math.abs((Number(leg.position?.y) - Number(leg.size?.y) / 2) - upperFrontEdge) <= Number(p.leg_depth_in || 0) + 0.25)
      && upperFrontRail;
    if (!supportedFrontEdge) errors.push('upper tread must have front-edge support legs and an upper front rail; unsupported cantilevered upper steps are not publishable.');
  }
  warnings.push('Generated step stools are not load certified; verify species, joinery, fasteners, and real weight capacity before standing on the build.');
  if (!Number(p.claimed_capacity_lbs)) warnings.push('No claimed_capacity_lbs is certified by the sandbox; treat capacity as unknown.');
}

function validateWallPanelPocketHardwareRules(design, errors, warnings) {
  if (design.template_id !== 'wall_panel_with_pocket_and_linear_hardware') return;
  const p = design.parameters || {};
  if (!between(p.width_in, 10, 36)) errors.push('width_in must be between 10 and 36 in.');
  if (!between(p.height_in, 8, 24)) errors.push('height_in must be between 8 and 24 in.');
  if (!between(p.board_thickness_in, 0.375, 1.5)) errors.push('board_thickness_in must be between 0.375 and 1.5 in.');
  if (!between(p.pocket_depth_in, 1.5, 5)) errors.push('pocket_depth_in must be between 1.5 and 5 in.');
  if (!between(p.pocket_height_in, 2, 8)) errors.push('pocket_height_in must be between 2 and 8 in.');
  if (!between(p.pocket_lip_height_in, 0.75, 3)) errors.push('pocket_lip_height_in must be between 0.75 and 3 in.');
  if (!between(p.pocket_stock_thickness_in, 0.25, 0.75)) errors.push('pocket_stock_thickness_in must be between 0.25 and 0.75 in.');
  if (!between(p.hook_count, 1, 10)) errors.push('hook_count must be between 1 and 10.');
  if (!between(p.hook_spacing_in, 1.5, 6)) errors.push('hook_spacing_in must be between 1.5 and 6 in.');
  const hookSpan = (Number(p.hook_count) - 1) * Number(p.hook_spacing_in);
  const requiredWidth = hookSpan + Number(p.min_end_inset_in || 0) * 2;
  if (Number.isFinite(requiredWidth) && requiredWidth > Number(p.width_in)) errors.push('hook_count and hook_spacing_in do not fit within width_in and min_end_inset_in.');
  if (Number(p.pocket_height_in) + 3 > Number(p.height_in)) warnings.push('Pocket height leaves limited vertical room for hook layout and mounting holes.');
  if (Number(p.pocket_depth_in) > 3.5) warnings.push('Deep wall pockets may need stronger fasteners or side support.');
  if (!p.mounting_holes) warnings.push('Wall-mounted organizers usually need mounting holes or another explicit mounting method.');
}

function validateBoardWithLinearHardwareRules(design, errors, warnings) {
  if (design.template_id !== 'board_with_linear_hardware') return;
  const p = design.parameters || {};
  if (!between(p.width_in, 8, 48)) errors.push('width_in must be between 8 and 48 in.');
  if (!between(p.height_in, 2.5, 10)) errors.push('height_in must be between 2.5 and 10 in.');
  if (!between(p.board_thickness_in, 0.375, 1.5)) errors.push('board_thickness_in must be between 0.375 and 1.5 in.');
  if (!between(p.hook_count, 1, 12)) errors.push('hook_count must be between 1 and 12.');
  if (!between(p.hook_spacing_in, 1.5, 8)) errors.push('hook_spacing_in must be between 1.5 and 8 in.');
  const span = (Number(p.hook_count) - 1) * Number(p.hook_spacing_in);
  const requiredWidth = span + Number(p.min_end_inset_in || 0) * 2;
  if (Number.isFinite(requiredWidth) && requiredWidth > Number(p.width_in)) errors.push('hook_count and hook_spacing_in do not fit within width_in and min_end_inset_in.');
  if (p.mounting_holes && Number(p.width_in) < Number(p.min_end_inset_in || 0) * 2 + 2) errors.push('mounting holes need more board width or smaller min_end_inset_in.');
  if (p.hook_count > 6 && Number(p.board_thickness_in) < 0.75) warnings.push('Thin boards with many hooks may need stronger mounting or thicker stock.');
  if (!p.mounting_holes) warnings.push('Wall-mounted hardware boards usually need mounting holes or another explicit mounting method.');
}

function validateTrayBirdFeederRules(design, errors, warnings) {
  if (design.template_id !== 'tray_bird_feeder') return;
  const p = design.parameters || {};
  if (!between(p.width_in, 6, 24)) errors.push('width_in must be between 6 and 24 in.');
  if (!between(p.depth_in, 5, 18)) errors.push('depth_in must be between 5 and 18 in.');
  if (!between(p.side_height_in, 0.75, 3)) errors.push('side_height_in must be between 0.75 and 3 in.');
  if (!between(p.bottom_thickness_in, 0.25, 1)) errors.push('bottom_thickness_in must be between 0.25 and 1 in.');
  if (!between(p.side_thickness_in, 0.25, 1)) errors.push('side_thickness_in must be between 0.25 and 1 in.');
  if (p.side_thickness_in * 2 >= p.depth_in) errors.push('side_thickness_in leaves no usable bottom depth.');
  if (!p.drainage_holes) warnings.push('Outdoor tray feeders should include drainage holes.');
  if (!String(p.material || '').includes('cedar')) warnings.push('Use outdoor-friendly material or finish for bird feeders.');
}

function validateReferenceHosts(parts, partsById, errors) {
  for (const part of parts) {
    if (part?.physical !== false || !part.meta?.host_part_id) continue;
    const host = partsById.get(part.meta.host_part_id);
    if (!host) {
      errors.push(`Reference part ${part.id} host_part_id references missing part ${part.meta.host_part_id}.`);
      continue;
    }
    if (host.physical === false) {
      errors.push(`Reference part ${part.id} host_part_id must reference a physical part.`);
      continue;
    }
    if (!boxContains(host, part)) {
      errors.push(`Reference part ${part.id} must fit within host part ${host.id}.`);
    }
  }
}

function validatePhysicalPartOverlaps(parts, errors) {
  const physicalParts = parts.filter((part) => part?.physical !== false && !isOverlapExemptPart(part));
  for (let outer = 0; outer < physicalParts.length; outer += 1) {
    for (let inner = outer + 1; inner < physicalParts.length; inner += 1) {
      const overlap = boxOverlap(physicalParts[outer], physicalParts[inner]);
      if (!overlap) continue;
      errors.push(`Physical parts ${physicalParts[outer].id} and ${physicalParts[inner].id} overlap by ${cleanNumber(overlap.x)} x ${cleanNumber(overlap.y)} x ${cleanNumber(overlap.z)} in; generated wood parts may touch but must not occupy the same volume.`);
    }
  }
}

function isOverlapExemptPart(part) {
  const text = [
    part.id,
    part.role,
    part.material,
    part.name,
    part.meta?.component_id,
    part.meta?.category_id,
    part.meta?.exported_as
  ].filter(Boolean).join(' ').toLowerCase();
  return /reference|guide|fastener|screw|nail|bolt|washer|hinge|hook|peg|pilot|mounting_hole|drainage|hanging/.test(text);
}

function boxOverlap(a, b) {
  const overlap = Object.fromEntries(['x', 'y', 'z'].map((axis) => {
    const aMin = Number(a.position?.[axis]) - Number(a.size?.[axis]) / 2;
    const aMax = Number(a.position?.[axis]) + Number(a.size?.[axis]) / 2;
    const bMin = Number(b.position?.[axis]) - Number(b.size?.[axis]) / 2;
    const bMax = Number(b.position?.[axis]) + Number(b.size?.[axis]) / 2;
    return [axis, Math.min(aMax, bMax) - Math.max(aMin, bMin)];
  }));
  return overlap.x > 1e-6 && overlap.y > 1e-6 && overlap.z > 1e-6 ? overlap : null;
}

function boxContains(host, child) {
  return ['x', 'y', 'z'].every((axis) => {
    const hostMin = Number(host.position?.[axis]) - Number(host.size?.[axis]) / 2;
    const hostMax = Number(host.position?.[axis]) + Number(host.size?.[axis]) / 2;
    const childMin = Number(child.position?.[axis]) - Number(child.size?.[axis]) / 2;
    const childMax = Number(child.position?.[axis]) + Number(child.size?.[axis]) / 2;
    return childMin >= hostMin - 1e-6 && childMax <= hostMax + 1e-6;
  });
}

function result(errors, warnings) {
  return {
    ok: errors.length === 0,
    status: errors.length ? 'invalid' : warnings.length ? 'valid_with_warnings' : 'valid',
    errors,
    warnings
  };
}

function requiredString(value, label, errors) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label} must be a non-empty string.`);
}

function finiteNumber(value) {
  return Number.isFinite(Number(value));
}

function positiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function between(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function cleanNumber(value) {
  return Number(Number(value).toFixed(4)).toString();
}
