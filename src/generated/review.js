export const PACKAGE_REVIEW_ROLES = [
  {
    id: 'parameter_reviewer',
    title: 'Parameter Reviewer',
    focus: 'Check whether the selected parameters and inferred limits are complete, realistic, and internally consistent.'
  },
  {
    id: 'design_validator',
    title: 'Design Validator',
    focus: 'Check geometry, parts, joints, references, cut-list consistency, and missing deterministic validators.'
  },
  {
    id: 'build_planner',
    title: 'Build Planner',
    focus: 'Check whether the assembly steps, tool assumptions, and builder workflow are practical and complete.'
  },
  {
    id: 'publication_reviewer',
    title: 'Publication Reviewer',
    focus: 'Check whether the package has the artifacts and adapter coverage needed for portal publication.'
  },
  {
    id: 'capability_scout',
    title: 'Capability Scout',
    focus: 'Identify sandbox, validation, export, or portal capabilities that Codex should add before broader generated designs.'
  }
];

export const PACKAGE_REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['role', 'ok_to_publish', 'findings', 'recommended_revisions', 'missing_capabilities'],
  properties: {
    role: { type: 'string' },
    ok_to_publish: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'category', 'message'],
        properties: {
          severity: { type: 'string', enum: ['info', 'warning', 'error'] },
          category: { type: 'string' },
          message: { type: 'string' }
        }
      }
    },
    recommended_revisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'change', 'reason'],
        properties: {
          target: { type: 'string' },
          change: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    },
    missing_capabilities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['capability', 'reason'],
        properties: {
          capability: { type: 'string' },
          reason: { type: 'string' }
        }
      }
    }
  }
};

export function buildPackageReviewInput(planPackage) {
  const design = planPackage.design || {};
  const validation = planPackage.validation || design.validation || {};
  const portalResult = planPackage.exports?.portal_result || {};
  const publishability = planPackage.publishability || {};
  return {
    package_schema_version: planPackage.package_schema_version,
    design: {
      design_id: design.design_id,
      template_id: design.template_id,
      units: design.units,
      parameters: design.parameters,
      part_count: design.parts?.length || 0,
      physical_part_count: design.parts?.filter((part) => part.physical !== false).length || 0,
      reference_part_count: design.parts?.filter((part) => part.physical === false).length || 0,
      parts: (design.parts || []).map((part) => ({
        id: part.id,
        role: part.role,
        physical: part.physical !== false,
        material: part.material,
        size: part.size,
        position: part.position
      })),
      cut_list: design.cut_list || [],
      assembly_steps: design.assembly_steps || [],
      joints: design.joints || []
    },
    validation,
    publishability,
    portal_result: {
      ok: portalResult.ok,
      type: portalResult.type,
      part_count: portalResult.parts?.length || 0,
      assembly_part_count: portalResult.assembly?.parts?.length || 0,
      build_step_count: portalResult.buildSteps?.length || 0,
      errors: portalResult.errors || [],
      warnings: portalResult.warnings || []
    },
    exports: {
      has_openscad: Boolean(planPackage.exports?.openscad || design.exports?.openscad),
      openscad_chars: planPackage.exports?.openscad?.length || 0
    }
  };
}

export function buildReviewMessages(role, reviewInput) {
  return [
    {
      role: 'system',
      content: [
        `You are the ${role.title} for a woodworking generated-design sandbox.`,
        role.focus,
        'Review the package as a specialist. Return JSON only.',
        'Reference parts may be nonphysical layout guides, holes, or drill targets; they are allowed in design.parts and assembly steps without appearing in the physical cut list.',
        'Only mark geometry or reference issues as errors when the package data directly proves the issue.',
        'If deterministic validation and publishability both pass, default ok_to_publish to true.',
        'Treat model-only concerns as warnings, recommended revisions, or missing capabilities unless the package contains an explicit contradiction.',
        'Do not request source-code edits directly; list missing capabilities when deterministic tools are insufficient.',
        'Use ok_to_publish=false only for issues that should block publishing this specific package.'
      ].join(' ')
    },
    {
      role: 'user',
      content: JSON.stringify({
        role: role.id,
        package: reviewInput,
        expected_output: PACKAGE_REVIEW_SCHEMA
      }, null, 2)
    }
  ];
}

export function summarizePackageReviews(reviews) {
  const findings = reviews.flatMap((review) => (review.findings || []).map((finding) => ({ role: review.role, ...finding })));
  const missingCapabilities = reviews.flatMap((review) => (review.missing_capabilities || []).map((item) => ({ role: review.role, ...item })));
  const recommendedRevisions = reviews.flatMap((review) => (review.recommended_revisions || []).map((item) => ({ role: review.role, ...item })));
  return {
    ok_to_publish: reviews.every((review) => review.ok_to_publish !== false),
    review_count: reviews.length,
    error_count: findings.filter((finding) => finding.severity === 'error').length,
    warning_count: findings.filter((finding) => finding.severity === 'warning').length,
    info_count: findings.filter((finding) => finding.severity === 'info').length,
    findings,
    recommended_revisions: recommendedRevisions,
    missing_capabilities: dedupeCapabilities(missingCapabilities)
  };
}

export function normalizePackageReview(roleId, value) {
  const review = value && typeof value === 'object' ? value : {};
  return {
    role: roleId,
    ok_to_publish: review.ok_to_publish !== false,
    findings: Array.isArray(review.findings) ? review.findings.map(normalizeFinding) : [],
    recommended_revisions: Array.isArray(review.recommended_revisions) ? review.recommended_revisions.map(normalizeRevision) : [],
    missing_capabilities: Array.isArray(review.missing_capabilities) ? review.missing_capabilities.map(normalizeCapability) : []
  };
}

function normalizeFinding(value) {
  return {
    severity: ['info', 'warning', 'error'].includes(value?.severity) ? value.severity : 'info',
    category: String(value?.category || 'general'),
    message: String(value?.message || '').trim()
  };
}

function normalizeRevision(value) {
  return {
    target: String(value?.target || '').trim(),
    change: String(value?.change || '').trim(),
    reason: String(value?.reason || '').trim()
  };
}

function normalizeCapability(value) {
  return {
    capability: String(value?.capability || '').trim(),
    reason: String(value?.reason || '').trim()
  };
}

function dedupeCapabilities(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = `${item.capability.toLowerCase()}|${item.reason.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}
