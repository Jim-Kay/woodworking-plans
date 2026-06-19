export function reviewComponentInterfaces(design) {
  if (!design || typeof design !== 'object') {
    return result(false, [{ severity: 'error', category: 'schema', message: 'No generated design is available to review.' }], []);
  }

  const findings = [];
  const missingCapabilities = [];
  const parts = Array.isArray(design.parts) ? design.parts : [];
  const joints = Array.isArray(design.joints) ? design.joints : [];
  const componentSummary = summarizeComponents(parts);

  if (design.template_id === 'extension_leaf_dining_table') {
    reviewExtensionLeafTableInterfaces({ design, parts, joints, findings, missingCapabilities });
  }

  const hasErrors = findings.some((finding) => finding.severity === 'error');
  const hasWarnings = findings.some((finding) => finding.severity === 'warning');
  return result(!hasErrors, findings, missingCapabilities, componentSummary, hasWarnings);
}

function reviewExtensionLeafTableInterfaces({ design, parts, joints, findings, missingCapabilities }) {
  const componentIds = new Set(design.components || []);
  const relationshipIds = new Set(design.relationships || []);
  const requiredComponents = [
    'geometry.extension_tabletop_set',
    'geometry.leg_apron_table_base',
    'hardware.telescoping_leaf_support_slide',
    'validators.extension_leaf_support_path'
  ];
  const requiredRelationships = [
    'relationship.fixed_contact.apron_to_leg_table_frame',
    'relationship.motion.telescoping_slide_support_under_leaf',
    'relationship.support.extension_leaf_carried_by_slide_supports',
    'relationship.clearance.extension_leaf_slide_travel'
  ];

  for (const componentId of requiredComponents) {
    if (!componentIds.has(componentId)) findings.push(error('missing_component', `Extension table design is missing required component ${componentId}.`, [componentId]));
  }
  for (const relationshipId of requiredRelationships) {
    if (!relationshipIds.has(relationshipId)) findings.push(error('missing_relationship', `Extension table design is missing required relationship ${relationshipId}.`, [relationshipId]));
  }

  const supports = parts.filter((part) => part.physical !== false && /^support\./.test(part.id || ''));
  const slideReferences = parts.filter((part) => part.physical === false && /^slide\./.test(part.id || ''));
  const fixedSlideMembers = parts.filter((part) => {
    const text = [
      part.id,
      part.name,
      part.role,
      part.meta?.component_id,
      part.meta?.slide_member,
      part.meta?.mount
    ].filter(Boolean).join(' ').toLowerCase();
    return part.physical !== false && /slide|track|carrier/.test(text) && /fixed|apron|base|mounted|track|carrier/.test(text);
  });

  if (supports.length < 4) {
    findings.push(error('support_path', 'Extension table should model front/back support arms for both end leaves.', supports.map((part) => part.id)));
  }
  if (slideReferences.length < supports.length) {
    findings.push(error('motion_reference', 'Each retractable support arm should have a slide/travel reference or hardware member.', slideReferences.map((part) => part.id)));
  }
  if (!fixedSlideMembers.length) {
    findings.push(error(
      'subsystem_interface',
      'The slide subsystem is not decomposed into a fixed rail/track mounted to the base plus a moving support arm. A tabletop can hide this, but the no-top view will not match the photographed mechanism.',
      supports.map((part) => part.id)
    ));
    missingCapabilities.push({
      capability: 'component-first extension table slide subsystem',
      reason: 'The template needs separate fixed slide carrier rails/tracks, moving support arms, stops, and base mounting interfaces before it can be trusted from photo reference.',
      evidence: ['No physical fixed slide member or carrier rail was found for hardware.telescoping_leaf_support_slide.']
    });
  }

  const slidingJoints = joints.filter((joint) => joint.type === 'sliding');
  if (slidingJoints.length < supports.length) {
    findings.push(error('motion_relationship', 'Each support arm should have an explicit sliding relationship to its slide hardware.', slidingJoints.map((joint) => joint.id)));
  }

  const apronParts = parts.filter((part) => /^apron\./.test(part.id || ''));
  const carrierParts = parts.filter((part) => /carrier|track|slide\.fixed|runner/.test(String(part.id || '').toLowerCase()));
  if (apronParts.length && !carrierParts.length) {
    findings.push(warning(
      'photo_fidelity',
      'The base is modeled as a simple apron rectangle. The photographed undercarriage has visible slide carriers and nested support rails that should be represented as their own components.',
      apronParts.map((part) => part.id)
    ));
  }
}

function summarizeComponents(parts) {
  const summary = new Map();
  for (const part of parts || []) {
    const componentId = part.meta?.component_id || 'uncategorized';
    const item = summary.get(componentId) || { component_id: componentId, physical_parts: 0, reference_parts: 0, part_ids: [] };
    if (part.physical === false) item.reference_parts += 1;
    else item.physical_parts += 1;
    item.part_ids.push(part.id);
    summary.set(componentId, item);
  }
  return [...summary.values()];
}

function result(ok, findings, missingCapabilities, componentSummary = [], hasWarnings = false) {
  return {
    ok,
    status: ok ? (hasWarnings ? 'valid_with_warnings' : 'ready') : 'needs_revision',
    quality_gate_passed: ok,
    findings,
    component_summary: componentSummary,
    missing_capabilities: missingCapabilities,
    recommended_action: ok ? 'review_build_steps' : 'request_capability',
    capability_request_arguments: ok ? null : capabilityArguments(missingCapabilities, findings)
  };
}

function capabilityArguments(missingCapabilities, findings) {
  const first = missingCapabilities[0];
  return {
    capability: first?.capability || 'component-first generated design interface review',
    reason: first?.reason || 'The generated design failed component interface review and needs a reusable modeling capability before publication.',
    evidence: [
      ...(first?.evidence || []),
      ...findings.filter((finding) => finding.severity === 'error').map((finding) => finding.message)
    ]
  };
}

function error(category, message, evidence = []) {
  return { severity: 'error', category, message, evidence };
}

function warning(category, message, evidence = []) {
  return { severity: 'warning', category, message, evidence };
}
