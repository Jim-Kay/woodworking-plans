export const TARGET_GEOMETRY_SCHEMA_VERSION = '0.1';

export const TARGET_GEOMETRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['target_id', 'object_type', 'units', 'confidence', 'source_views', 'overall_envelope', 'volumes', 'uncertainties', 'missing_capabilities'],
  properties: {
    target_id: { type: 'string' },
    object_type: { type: 'string' },
    units: { type: 'string', enum: ['in'] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    source_views: { type: 'array', items: { type: 'string' } },
    overall_envelope: { type: 'object', additionalProperties: true },
    volumes: { type: 'array', items: { type: 'object', additionalProperties: true } },
    uncertainties: { type: 'array', items: { type: 'string' } },
    missing_capabilities: { type: 'array', items: { type: 'object', additionalProperties: true } }
  }
};

export function buildTargetGeometryMessages(photoSet, imageDataUrls = [], options = {}) {
  return [
    {
      role: 'system',
      content: [
        'You are a target-geometry extraction agent for a woodworking design sandbox.',
        'Convert the supplied photos or clean isolated renders into a coarse target shape, not a build plan.',
        'Represent visible geometry as named volumes using woodworking-friendly primitive hints: panel, rail, post, block, cylinder, hardware_track, support_arm, or unknown.',
        'Use a right-handed inch coordinate system where x is width/length, y is depth, and z is height. If exact scale is unknown, preserve proportions and mark confidence low or medium.',
        'Do not invent hidden joinery. Hidden or uncertain mechanism volumes should be marked as uncertainty or missing_capability.',
        'The next agent will fit buildable primitives and choose components from a catalog.',
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
            extraction_focus: options.focus || 'coarse 3D target envelope and visible primitive volumes',
            expected_output: TARGET_GEOMETRY_SCHEMA
          }, null, 2)
        },
        ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } }))
      ]
    }
  ];
}

export function normalizeTargetGeometry(value = {}, context = {}) {
  const source = value?.target_geometry && typeof value.target_geometry === 'object'
    ? value.target_geometry
    : value?.output_shape && typeof value.output_shape === 'object'
      ? value.output_shape
      : value && typeof value === 'object'
        ? value
        : {};
  const photoSet = normalizePhotoSet(context.photoSet || source.photo_set || {});
  const volumes = normalizeVolumes(source.volumes || source.primitives || source.parts);
  return {
    schema_version: TARGET_GEOMETRY_SCHEMA_VERSION,
    target_id: cleanString(source.target_id || source.id || photoSet.photo_set_id || 'target_geometry'),
    object_type: cleanString(source.object_type || photoSet.object_type || 'unknown woodworking object'),
    units: 'in',
    confidence: confidence(source.confidence),
    source_views: cleanStringArray(source.source_views?.length ? source.source_views : photoSet.photos.map((photo) => photo.view)),
    overall_envelope: normalizeEnvelope(source.overall_envelope || source.envelope, volumes),
    volumes,
    uncertainties: cleanStringArray(source.uncertainties),
    missing_capabilities: normalizeCapabilities(source.missing_capabilities)
  };
}

export function summarizeTargetGeometry(targetGeometry) {
  const target = normalizeTargetGeometry(targetGeometry);
  return {
    target_id: target.target_id,
    object_type: target.object_type,
    confidence: target.confidence,
    source_view_count: target.source_views.length,
    volume_count: target.volumes.length,
    primitive_kinds: [...new Set(target.volumes.map((volume) => volume.kind))].sort(),
    uncertainty_count: target.uncertainties.length,
    missing_capability_count: target.missing_capabilities.length
  };
}

export function fitPrimitivesToTarget(targetGeometry) {
  const target = normalizeTargetGeometry(targetGeometry);
  const primitives = target.volumes.map((volume) => fitPrimitive(volume)).filter(Boolean);
  const componentSearches = dedupeSearches(primitives.map((primitive) => ({
    query: primitive.component_query,
    purpose: primitive.role,
    category_id: primitive.category_id
  })));
  const relationshipSearches = inferRelationshipSearches(target, primitives);
  const missingCapabilities = [...target.missing_capabilities];
  if (target.volumes.some((volume) => /hidden|internal|mechanism|slide|track|telescoping/i.test(`${volume.role} ${volume.name} ${volume.notes.join(' ')}`))
    && !primitives.some((primitive) => ['hardware_track', 'support_arm'].includes(primitive.primitive_type))) {
    missingCapabilities.push({
      capability: 'target geometry hidden mechanism inference',
      reason: 'The target mentions a hidden or moving mechanism, but no explicit track/support-arm primitive could be fitted.',
      evidence: ['Add detail photos or a clean no-cover/no-tabletop render before generating a buildable plan.']
    });
  }

  return {
    ok: primitives.length > 0,
    target_summary: summarizeTargetGeometry(target),
    primitives,
    component_searches: componentSearches,
    relationship_searches: relationshipSearches,
    uncertainties: target.uncertainties,
    missing_capabilities: missingCapabilities,
    recommended_action: missingCapabilities.length ? 'request_capability' : 'search_components'
  };
}

export function proposeComponentGraphFromTarget(targetGeometry, primitiveFit = fitPrimitivesToTarget(targetGeometry)) {
  const target = normalizeTargetGeometry(targetGeometry);
  const components = inferComponentHints(primitiveFit.primitives || []);
  const relationships = inferRelationshipHints(primitiveFit.primitives || []);
  return {
    ok: Boolean(components.length),
    graph_id: `${slug(target.target_id)}_component_graph`,
    target_id: target.target_id,
    object_type: target.object_type,
    components,
    relationships,
    primitive_ids: (primitiveFit.primitives || []).map((primitive) => primitive.primitive_id),
    component_searches: primitiveFit.component_searches || [],
    relationship_searches: primitiveFit.relationship_searches || [],
    open_questions: [
      ...target.uncertainties,
      ...(primitiveFit.missing_capabilities || []).map((item) => item.reason)
    ].filter(Boolean),
    recommended_action: 'search_components'
  };
}

function fitPrimitive(volume) {
  const roleText = `${volume.name} ${volume.role} ${volume.kind} ${volume.notes.join(' ')}`.toLowerCase();
  const size = volume.size;
  const primitiveType = inferPrimitiveType(volume, roleText, size);
  if (!primitiveType) return null;
  return {
    primitive_id: volume.id,
    source_volume_id: volume.id,
    primitive_type: primitiveType,
    name: volume.name || volume.id,
    role: volume.role || primitiveType,
    position: volume.position,
    size,
    confidence: volume.confidence,
    visible_in: volume.visible_in,
    component_query: componentQueryFor(primitiveType, roleText),
    category_id: primitiveType === 'hardware_track' ? 'hardware' : 'geometry',
    notes: volume.notes
  };
}

function inferPrimitiveType(volume, roleText, size) {
  if (/slide|track|drawer|telescoping|runner hardware/.test(roleText)) return 'hardware_track';
  if (/support arm|pull.?out support|leaf support/.test(roleText)) return 'support_arm';
  if (/leg|post|upright/.test(roleText)) return 'post';
  if (/top|leaf|panel|tread|shelf|board|surface/.test(roleText)) return 'panel';
  if (/apron|rail|stretcher|cleat|runner|brace/.test(roleText)) return 'rail';
  if (volume.kind === 'cylinder') return 'cylinder';
  const dims = [size.x, size.y, size.z].filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
  if (dims.length !== 3) return null;
  const [thin, middle, long] = dims;
  if (thin <= Math.max(1.25, long * 0.12) && middle > thin * 2) return 'panel';
  if (long > middle * 3 && middle <= thin * 2.5) return 'rail';
  if (long > middle * 2 && Math.abs(middle - thin) <= Math.max(0.5, middle * 0.35)) return 'post';
  return 'block';
}

function componentQueryFor(primitiveType, roleText) {
  if (primitiveType === 'hardware_track') return 'telescoping drawer slide track support hardware';
  if (primitiveType === 'support_arm') return 'retractable support arm table leaf slide support';
  if (primitiveType === 'post') return 'square leg post upright support';
  if (primitiveType === 'panel' && /leaf|table/.test(roleText)) return 'extension tabletop set end leaf panel';
  if (primitiveType === 'panel') return 'rectangular panel board flat surface';
  if (primitiveType === 'rail' && /apron|table/.test(roleText)) return 'leg apron table base rail';
  if (primitiveType === 'rail') return 'linear rail stretcher support';
  if (primitiveType === 'cylinder') return 'round dowel cylinder rod';
  return 'rectangular block spacer stop';
}

function inferRelationshipSearches(target, primitives) {
  const searches = [];
  const types = new Set(primitives.map((primitive) => primitive.primitive_type));
  if (types.has('post') && types.has('rail')) searches.push({ query: 'leg apron table base fixed contact', purpose: 'connect posts and aprons', type_id: 'fixed_contact' });
  if (types.has('hardware_track') && types.has('support_arm')) searches.push({ query: 'telescoping slide support arm motion clearance', purpose: 'model moving support track', type_id: 'motion' });
  if (types.has('support_arm') && primitives.some((primitive) => /leaf|top/.test(`${primitive.name} ${primitive.role}`.toLowerCase()))) {
    searches.push({ query: 'extension leaf carried by slide supports bearing edge load path', purpose: 'support removable leaf panels', type_id: 'support' });
  }
  if (/extension|leaf|slide|telescoping/i.test(`${target.object_type} ${target.volumes.map((volume) => volume.role).join(' ')}`)) {
    searches.push({ query: 'extension leaf slide travel clearance open closed sequence', purpose: 'check deployed and stowed states', type_id: 'clearance' });
  }
  return dedupeSearches(searches);
}

function inferComponentHints(primitives) {
  const hints = new Set();
  const text = primitives.map((primitive) => `${primitive.primitive_type} ${primitive.name} ${primitive.role}`).join(' ').toLowerCase();
  if (/top|leaf/.test(text)) hints.add('geometry.extension_tabletop_set');
  if (/post|leg|apron/.test(text)) hints.add('geometry.leg_apron_table_base');
  if (/support_arm|hardware_track|slide|track/.test(text)) hints.add('hardware.telescoping_leaf_support_slide');
  if (/panel/.test(text) && !hints.has('geometry.extension_tabletop_set')) hints.add('geometry.rectangular_panel');
  if (/rail/.test(text) && !hints.has('geometry.leg_apron_table_base')) hints.add('geometry.linear_rail');
  return [...hints].map((component_id) => ({ component_id, reason: componentReason(component_id) }));
}

function inferRelationshipHints(primitives) {
  const hints = new Set();
  const text = primitives.map((primitive) => `${primitive.primitive_type} ${primitive.name} ${primitive.role}`).join(' ').toLowerCase();
  if (/post|leg|apron/.test(text)) hints.add('relationship.fixed_contact.apron_to_leg_table_frame');
  if (/support_arm|hardware_track|slide|track/.test(text)) hints.add('relationship.motion.telescoping_slide_support_under_leaf');
  if (/leaf/.test(text) && /support/.test(text)) hints.add('relationship.support.extension_leaf_carried_by_slide_supports');
  if (/slide|track|telescoping/.test(text)) hints.add('relationship.clearance.extension_leaf_slide_travel');
  return [...hints].map((relationship_id) => ({ relationship_id, reason: relationshipReason(relationship_id) }));
}

function normalizePhotoSet(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    photo_set_id: cleanString(source.photo_set_id || source.id || 'photo_set'),
    object_type: cleanString(source.object_type || ''),
    photos: (Array.isArray(source.photos) ? source.photos : []).map((photo, index) => ({
      photo_id: cleanString(photo?.photo_id || photo?.id || `photo_${index + 1}`),
      view: cleanString(photo?.view || 'unknown')
    }))
  };
}

function normalizeEnvelope(value, volumes) {
  const envelope = value && typeof value === 'object' ? value : {};
  const fallback = envelopeFromVolumes(volumes);
  return {
    kind: cleanString(envelope.kind || 'box'),
    size: normalizeVector(envelope.size, fallback.size),
    position: normalizeVector(envelope.position, fallback.position),
    confidence: confidence(envelope.confidence)
  };
}

function envelopeFromVolumes(volumes) {
  if (!volumes.length) return { size: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } };
  const bounds = { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity, zMin: Infinity, zMax: -Infinity };
  for (const volume of volumes) {
    for (const axis of ['x', 'y', 'z']) {
      const minKey = `${axis}Min`;
      const maxKey = `${axis}Max`;
      bounds[minKey] = Math.min(bounds[minKey], volume.position[axis] - volume.size[axis] / 2);
      bounds[maxKey] = Math.max(bounds[maxKey], volume.position[axis] + volume.size[axis] / 2);
    }
  }
  return {
    size: { x: bounds.xMax - bounds.xMin, y: bounds.yMax - bounds.yMin, z: bounds.zMax - bounds.zMin },
    position: { x: (bounds.xMin + bounds.xMax) / 2, y: (bounds.yMin + bounds.yMax) / 2, z: (bounds.zMin + bounds.zMax) / 2 }
  };
}

function normalizeVolumes(value) {
  return (Array.isArray(value) ? value : [])
    .map((volume, index) => ({
      id: cleanString(volume?.id || volume?.volume_id || volume?.name || `volume_${index + 1}`),
      name: cleanString(volume?.name || volume?.id || `Volume ${index + 1}`),
      kind: normalizeKind(volume?.kind || volume?.shape || volume?.primitive),
      role: cleanString(volume?.role || volume?.name || 'unknown'),
      position: normalizeVector(volume?.position || volume?.center),
      size: normalizeVector(volume?.size || volume?.dimensions),
      confidence: confidence(volume?.confidence),
      visible_in: cleanStringArray(volume?.visible_in || volume?.seen_in),
      notes: cleanStringArray(volume?.notes)
    }))
    .filter((volume) => volume.id && positiveVector(volume.size));
}

function normalizeKind(value) {
  const kind = cleanString(value).toLowerCase();
  return ['box', 'panel', 'rail', 'post', 'block', 'cylinder', 'hardware_track', 'support_arm', 'unknown'].includes(kind) ? kind : 'box';
}

function normalizeVector(value, fallback = { x: 0, y: 0, z: 0 }) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    x: number(source.x ?? source.length ?? source.width, fallback.x),
    y: number(source.y ?? source.depth ?? source.thickness, fallback.y),
    z: number(source.z ?? source.height, fallback.z)
  };
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

function dedupeSearches(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = `${item.query || item.component_id || item.relationship_id}|${item.category_id || item.type_id || ''}`.toLowerCase();
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function componentReason(componentId) {
  if (componentId === 'geometry.extension_tabletop_set') return 'Target contains tabletop or removable leaf panel volumes.';
  if (componentId === 'geometry.leg_apron_table_base') return 'Target contains legs/posts and apron or rail volumes.';
  if (componentId === 'hardware.telescoping_leaf_support_slide') return 'Target contains slide tracks or moving support arms.';
  if (componentId === 'geometry.rectangular_panel') return 'Target contains a flat rectangular panel volume.';
  if (componentId === 'geometry.linear_rail') return 'Target contains a linear rail or stretcher volume.';
  return 'Inferred from fitted target primitive volumes.';
}

function relationshipReason(relationshipId) {
  if (relationshipId.includes('fixed_contact')) return 'Legs and aprons need explicit fixed contact relationships.';
  if (relationshipId.includes('motion')) return 'Tracks and support arms need explicit sliding motion.';
  if (relationshipId.includes('support')) return 'Leaf panels need explicit support path relationships.';
  if (relationshipId.includes('clearance')) return 'Moving slide/leaf states need travel clearance checks.';
  return 'Inferred from target primitive interfaces.';
}

function confidence(value) {
  return ['low', 'medium', 'high'].includes(value) ? value : 'low';
}

function positiveVector(vector) {
  return ['x', 'y', 'z'].every((axis) => Number.isFinite(vector[axis]) && vector[axis] > 0);
}

function cleanString(value) {
  return String(value || '').trim();
}

function cleanStringArray(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanString(item))
    .filter(Boolean);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value) {
  const text = cleanString(value || 'target').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return text || 'target';
}
