export const PHOTO_DESIGN_BRIEF_SCHEMA_VERSION = '0.1';

export const PHOTO_DESIGN_BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['photo_set_id', 'object_type', 'confidence', 'photos', 'observations', 'parts', 'known_measurements', 'inferred_dimensions', 'component_searches', 'uncertainties', 'missing_capabilities'],
  properties: {
    photo_set_id: { type: 'string' },
    object_type: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    photos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['photo_id', 'view', 'description'],
        properties: {
          photo_id: { type: 'string' },
          view: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    observations: { type: 'array', items: { type: 'string' } },
    parts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'role', 'seen_in', 'component_query', 'confidence'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          seen_in: { type: 'array', items: { type: 'string' } },
          component_query: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          notes: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    known_measurements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value_in'],
        properties: {
          label: { type: 'string' },
          value_in: { type: 'number' },
          source: { type: 'string' }
        }
      }
    },
    inferred_dimensions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'estimate_in', 'confidence', 'basis'],
        properties: {
          label: { type: 'string' },
          estimate_in: { type: 'number' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          basis: { type: 'string' }
        }
      }
    },
    component_searches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['query', 'purpose'],
        properties: {
          query: { type: 'string' },
          purpose: { type: 'string' },
          category_id: { type: 'string' }
        }
      }
    },
    uncertainties: { type: 'array', items: { type: 'string' } },
    missing_capabilities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['capability', 'reason'],
        properties: {
          capability: { type: 'string' },
          reason: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

export function buildPhotoBriefMessages(photoSet, imageDataUrls = []) {
  return [
    {
      role: 'system',
      content: [
        'You are a vision design-brief agent for a woodworking generated-design sandbox.',
        'Reconcile all supplied photos into one object, using view labels and known measurements when provided.',
        'Do not generate a woodworking plan directly.',
        'Identify visible parts, likely roles, hardware, proportions, missing views, and uncertainties.',
        'For every visible buildable part, propose a component_searches query that a text design agent can run against the reusable component catalog.',
        'If a required feature cannot be represented with likely reusable components, report it as a missing capability.',
        'Use measurements only when supplied or clearly inferable from a supplied reference; otherwise add an uncertainty.',
        'Return JSON only.'
      ].join(' ')
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            photo_set: normalizePhotoSet(photoSet),
            expected_output: PHOTO_DESIGN_BRIEF_SCHEMA
          }, null, 2)
        },
        ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } }))
      ]
    }
  ];
}

export function normalizePhotoDesignBrief(value = {}, context = {}) {
  const brief = value && typeof value === 'object' ? value : {};
  const photoSet = normalizePhotoSet(context.photoSet || brief);
  return {
    schema_version: PHOTO_DESIGN_BRIEF_SCHEMA_VERSION,
    photo_set_id: cleanString(brief.photo_set_id || photoSet.photo_set_id || 'photo_set'),
    object_type: cleanString(brief.object_type || photoSet.object_type || 'unknown woodworking object'),
    confidence: confidence(brief.confidence),
    photos: normalizePhotos(brief.photos?.length ? brief.photos : photoSet.photos),
    observations: cleanStringArray(brief.observations),
    parts: normalizeBriefParts(brief.parts),
    known_measurements: normalizeMeasurements(brief.known_measurements?.length ? brief.known_measurements : photoSet.known_measurements),
    inferred_dimensions: normalizeInferredDimensions(brief.inferred_dimensions),
    component_searches: normalizeComponentSearches(brief.component_searches, brief.parts),
    uncertainties: cleanStringArray(brief.uncertainties),
    missing_capabilities: normalizeCapabilities(brief.missing_capabilities)
  };
}

export function scenarioFromPhotoDesignBrief(brief, options = {}) {
  const normalized = normalizePhotoDesignBrief(brief);
  const templateId = options.template_id || inferTemplateId(normalized);
  return {
    design_id: options.design_id || slug(normalized.photo_set_id || normalized.object_type),
    template_id: templateId,
    intent: normalized.object_type,
    source_brief: {
      schema_version: normalized.schema_version,
      photo_set_id: normalized.photo_set_id,
      confidence: normalized.confidence,
      observations: normalized.observations,
      parts: normalized.parts.map((part) => ({
        name: part.name,
        role: part.role,
        component_query: part.component_query,
        confidence: part.confidence
      })),
      uncertainties: normalized.uncertainties
    },
    parameters: inferScenarioParameters(normalized)
  };
}

export function summarizePhotoDesignBrief(brief) {
  if (!brief) return null;
  const normalized = normalizePhotoDesignBrief(brief);
  return {
    photo_set_id: normalized.photo_set_id,
    object_type: normalized.object_type,
    confidence: normalized.confidence,
    photo_count: normalized.photos.length,
    part_count: normalized.parts.length,
    component_search_count: normalized.component_searches.length,
    known_measurement_count: normalized.known_measurements.length,
    uncertainty_count: normalized.uncertainties.length,
    missing_capability_count: normalized.missing_capabilities.length
  };
}

function normalizePhotoSet(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    photo_set_id: cleanString(source.photo_set_id || source.id || 'photo_set'),
    object_type: cleanString(source.object_type || ''),
    known_measurements: normalizeMeasurements(source.known_measurements),
    photos: normalizePhotos(source.photos)
  };
}

function normalizePhotos(value) {
  return (Array.isArray(value) ? value : [])
    .map((photo, index) => ({
      photo_id: cleanString(photo?.photo_id || photo?.id || photo?.label || `photo_${index + 1}`),
      view: cleanString(photo?.view || 'unknown'),
      description: cleanString(photo?.description || photo?.path || photo?.url || '')
    }))
    .filter((photo) => photo.photo_id);
}

function normalizeBriefParts(value) {
  return (Array.isArray(value) ? value : [])
    .map((part) => ({
      name: cleanString(part?.name),
      role: cleanString(part?.role || part?.name),
      seen_in: cleanStringArray(part?.seen_in),
      component_query: cleanString(part?.component_query || part?.name),
      confidence: confidence(part?.confidence),
      notes: cleanStringArray(part?.notes)
    }))
    .filter((part) => part.name || part.component_query);
}

function normalizeMeasurements(value) {
  return (Array.isArray(value) ? value : [])
    .map((measurement) => ({
      label: cleanString(measurement?.label),
      value_in: number(measurement?.value_in, null),
      source: cleanString(measurement?.source || 'user')
    }))
    .filter((measurement) => measurement.label && Number.isFinite(measurement.value_in));
}

function normalizeInferredDimensions(value) {
  return (Array.isArray(value) ? value : [])
    .map((dimension) => ({
      label: cleanString(dimension?.label),
      estimate_in: number(dimension?.estimate_in, null),
      confidence: confidence(dimension?.confidence),
      basis: cleanString(dimension?.basis)
    }))
    .filter((dimension) => dimension.label && Number.isFinite(dimension.estimate_in));
}

function normalizeComponentSearches(value, parts = []) {
  const explicit = (Array.isArray(value) ? value : []).map((search) => ({
    query: cleanString(search?.query),
    purpose: cleanString(search?.purpose || search?.query),
    ...(search?.category_id ? { category_id: cleanString(search.category_id) } : {})
  }));
  const fromParts = (Array.isArray(parts) ? parts : []).map((part) => ({
    query: cleanString(part?.component_query || part?.name),
    purpose: cleanString(part?.role || part?.name)
  }));
  return dedupeSearches([...explicit, ...fromParts].filter((search) => search.query));
}

function normalizeCapabilities(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      capability: cleanString(item?.capability),
      reason: cleanString(item?.reason),
      evidence: cleanStringArray(item?.evidence)
    }))
    .filter((item) => item.capability || item.reason);
}

function inferTemplateId(brief) {
  const text = [
    brief.object_type,
    ...brief.parts.map((part) => `${part.name} ${part.role} ${part.component_query}`)
  ].join(' ').toLowerCase();
  if ((text.includes('mail') || text.includes('pocket') || text.includes('bin')) && (text.includes('hook') || text.includes('key'))) return 'wall_panel_with_pocket_and_linear_hardware';
  if (text.includes('hook') || text.includes('peg') || text.includes('rack')) return 'board_with_linear_hardware';
  if (text.includes('bird') || text.includes('feeder') || text.includes('tray')) return 'tray_bird_feeder';
  return 'unknown_from_photo_brief';
}

function inferScenarioParameters(brief) {
  const params = {};
  assignMeasurement(params, brief, ['overall width', 'width'], 'width_in');
  assignMeasurement(params, brief, ['overall height', 'height'], 'height_in');
  assignMeasurement(params, brief, ['overall depth', 'depth'], 'depth_in');
  assignMeasurement(params, brief, ['pocket depth', 'mail pocket depth'], 'pocket_depth_in');
  assignMeasurement(params, brief, ['pocket height', 'mail pocket height'], 'pocket_height_in');
  const hookPart = brief.parts.find((part) => /hook|peg/i.test(`${part.name} ${part.role} ${part.component_query}`));
  const hookCount = hookPart?.notes.join(' ').match(/\b(\d+)\s+(?:hooks?|pegs?)\b/i)?.[1];
  if (hookCount) params.hook_count = Number(hookCount);
  return params;
}

function assignMeasurement(params, brief, labels, key) {
  const match = [...brief.known_measurements, ...brief.inferred_dimensions.map((item) => ({ label: item.label, value_in: item.estimate_in }))]
    .find((item) => labels.some((label) => item.label.toLowerCase() === label || item.label.toLowerCase().includes(label)));
  if (match) params[key] = match.value_in;
}

function dedupeSearches(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = `${item.query.toLowerCase()}|${item.category_id || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function confidence(value) {
  return ['low', 'medium', 'high'].includes(value) ? value : 'low';
}

function cleanString(value) {
  return String(value || '').trim();
}

function cleanStringArray(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value) {
  const text = cleanString(value || 'photo_design').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return text || 'photo_design';
}
