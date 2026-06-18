export const ASSEMBLY_RELATIONSHIP_CATALOG_VERSION = '0.1';

export const ASSEMBLY_RELATIONSHIP_TYPES = [
  {
    id: 'fixed_contact',
    title: 'Fixed Contact',
    description: 'Two parts are fastened or glued together with no intended motion.'
  },
  {
    id: 'layout_reference',
    title: 'Layout Reference',
    description: 'A nonphysical mark, hole, or spacing relationship used to guide drilling or placement.'
  },
  {
    id: 'support',
    title: 'Support',
    description: 'One part carries, braces, locates, or resists movement of another part.'
  },
  {
    id: 'motion',
    title: 'Motion',
    description: 'A hinge, sliding, folding, rotating, or removable relationship with intended movement.'
  },
  {
    id: 'clearance',
    title: 'Clearance',
    description: 'Parts intentionally avoid contact by a specified gap, reveal, inset, or travel allowance.'
  }
];

export const ASSEMBLY_RELATIONSHIP_CATALOG = [
  {
    relationship_id: 'relationship.fixed_contact.panel_to_rail',
    type_id: 'fixed_contact',
    title: 'Panel To Rail Fixed Contact',
    description: 'A rail or cleat is fastened to a broad panel face with its bottom face seated flat on the panel and edges aligned or intentionally inset.',
    aliases: ['rail on panel', 'cleat on backer', 'side rail on base', 'face contact', 'butt-fastened rail'],
    part_roles: ['panel', 'rail', 'cleat', 'backer', 'base'],
    geometry_cues: ['coplanar contact faces', 'parallel faces', 'edge flush or inset', 'no unintended overlap'],
    validator_hints: ['validators.physical_part_overlap', 'validators.edge_clearance'],
    component_hints: ['geometry.rectangular_panel', 'geometry.linear_rail'],
    example_uses: ['tray side rail attached to bottom panel', 'wall cleat fastened to back board', 'shelf lip on flat panel']
  },
  {
    relationship_id: 'relationship.fixed_contact.rail_to_post_butt_joint',
    type_id: 'fixed_contact',
    title: 'Rail To Post Butt Joint',
    description: 'A horizontal rail or stretcher butts into a vertical post or leg and is fastened through the rail or post.',
    aliases: ['rail into post', 'stretcher to leg', 'frame rail joint', 'butt joint rail post'],
    part_roles: ['rail', 'post', 'leg', 'stretcher', 'upright'],
    geometry_cues: ['end face contacts side face', 'square frame bay', 'clear opening preserved'],
    validator_hints: ['validators.physical_part_overlap', 'validators.edge_clearance'],
    component_hints: ['geometry.linear_rail', 'geometry.square_leg_post', 'geometry.rectangular_frame_bay'],
    example_uses: ['tote rack frame bay', 'small bench stretcher', 'plant stand shelf frame']
  },
  {
    relationship_id: 'relationship.support.shelf_between_side_panels',
    type_id: 'support',
    title: 'Shelf Between Side Panels',
    description: 'A shelf panel spans between two side panels, posts, or rails and requires square alignment plus supported ends.',
    aliases: ['shelf between sides', 'bookcase shelf', 'cubby shelf', 'monitor riser top'],
    part_roles: ['shelf', 'panel', 'side panel', 'divider', 'support'],
    geometry_cues: ['shelf ends contact side supports', 'clear opening below', 'level top surface'],
    validator_hints: ['validators.physical_part_overlap', 'validators.load_bearing_caution'],
    component_hints: ['geometry.rectangular_panel', 'build_steps.dimensioned_stage_sequence'],
    example_uses: ['desktop bookshelf shelf', 'monitor riser top panel', 'small herb shelf']
  },
  {
    relationship_id: 'relationship.support.tote_runner_pair_to_frame',
    type_id: 'support',
    title: 'Tote Runner Pair Supported By Frame',
    description: 'Parallel runners attach to a frame bay and support a tote lip or bin flange with clear spacing and insertion clearance.',
    aliases: ['tote runners', 'bin rails', 'sliding tote supports', 'runner pair frame'],
    part_roles: ['runner', 'rail', 'frame', 'tote', 'bin'],
    geometry_cues: ['parallel runners', 'clear tote opening', 'matched runner height', 'front insertion path'],
    validator_hints: ['validators.physical_part_overlap', 'validators.linear_spacing'],
    component_hints: ['geometry.tote_runner_pair', 'geometry.rectangular_frame_bay'],
    example_uses: ['27 gallon tote rack', 'rolling tote rack workbench', 'garage bin storage']
  },
  {
    relationship_id: 'relationship.layout_reference.linear_hole_array_on_host',
    type_id: 'layout_reference',
    title: 'Linear Hole Array On Host',
    description: 'Repeated pilot holes, hook holes, or screw locations are centered on a host part with minimum end and edge clearances.',
    aliases: ['pilot hole row', 'hook layout', 'even holes', 'linear drill pattern', 'hardware spacing'],
    part_roles: ['host board', 'hook', 'peg', 'hole', 'fastener'],
    geometry_cues: ['centered spacing', 'minimum end inset', 'hole contained on host'],
    validator_hints: ['validators.edge_clearance', 'validators.linear_spacing', 'validators.host_containment'],
    component_hints: ['hardware.linear_hook_array', 'patterns.centered_linear_spacing'],
    example_uses: ['key hooks', 'mug pegs', 'battery slot pilot holes']
  },
  {
    relationship_id: 'relationship.layout_reference.wall_mount_holes_on_backer',
    type_id: 'layout_reference',
    title: 'Wall Mount Holes On Backer',
    description: 'Mounting holes are placed on a backer, cleat, or rail with symmetric spacing and enough edge distance for screws.',
    aliases: ['wall mounting holes', 'screw holes on backer', 'mounting screw pair', 'keyhole layout'],
    part_roles: ['backer', 'cleat', 'mounting hole', 'wall screw'],
    geometry_cues: ['symmetric pair', 'edge inset', 'hole diameter', 'vertical centerline'],
    validator_hints: ['validators.edge_clearance', 'validators.host_containment'],
    component_hints: ['hardware.wall_mount_hole_pair'],
    example_uses: ['key rack wall mount', 'mail organizer mount', 'charging shelf mount']
  },
  {
    relationship_id: 'relationship.layout_reference.drainage_holes_in_panel',
    type_id: 'layout_reference',
    title: 'Drainage Holes In Panel',
    description: 'Drainage holes are drilled through a horizontal outdoor panel before or during assembly with explicit edge distance guidance.',
    aliases: ['drainage holes', 'weep holes', 'outdoor hole grid', 'bottom panel drill pattern'],
    part_roles: ['bottom panel', 'hole', 'outdoor panel', 'planter base'],
    geometry_cues: ['through holes', 'edge clearance', 'distributed grid', 'pre-assembly drilling'],
    validator_hints: ['validators.edge_clearance', 'validators.host_containment'],
    component_hints: ['hardware.drainage_hole_grid', 'rendering.stage_aware_reference_view'],
    example_uses: ['tray bird feeder bottom panel', 'planter bottom', 'outdoor catch tray']
  },
  {
    relationship_id: 'relationship.motion.hinge_panel_to_cleat',
    type_id: 'motion',
    title: 'Hinged Panel To Cleat Or Frame',
    description: 'A panel rotates from a cleat, rail, or frame using hinge hardware and requires swing clearance plus stop/support validation.',
    aliases: ['fold down panel', 'hinged shelf', 'hinged desk', 'rotating panel', 'folding wing'],
    part_roles: ['panel', 'hinge', 'cleat', 'frame', 'support chain', 'bracket'],
    geometry_cues: ['shared hinge axis', 'open and closed states', 'swing clearance', 'support stop'],
    validator_hints: ['validators.physical_part_overlap', 'validators.load_bearing_caution'],
    component_hints: ['geometry.rectangular_panel', 'hardware.wall_mount_hole_pair'],
    missing_capability_hints: ['hinge-motion validator', 'open/closed state renderer', 'load-path validator'],
    example_uses: ['wall mounted fold down desk', 'folding miter saw wing', 'folding drying rack']
  },
  {
    relationship_id: 'relationship.motion.dowel_frame_hinged_to_wall_frame',
    type_id: 'motion',
    title: 'Dowel Frame Hinged To Wall Frame',
    description: 'A drying-rack style frame with parallel dowels rotates from a wall frame and needs dowel spacing, hinge-axis, and stop-chain relationships.',
    aliases: ['folding drying rack', 'dowel rack', 'wall hinged frame', 'parallel dowel frame'],
    part_roles: ['dowel', 'side rail', 'wall frame', 'hinge', 'stop chain'],
    geometry_cues: ['parallel dowels', 'dowels captured between side rails', 'hinge axis', 'open depth limit'],
    validator_hints: ['validators.linear_spacing', 'validators.physical_part_overlap'],
    component_hints: ['geometry.linear_rail', 'build_steps.dimensioned_stage_sequence'],
    missing_capability_hints: ['round dowel primitive', 'hinge-motion validator', 'folding frame renderer'],
    example_uses: ['laundry drying rack', 'folding towel rack', 'wall mounted dowel rack']
  },
  {
    relationship_id: 'relationship.clearance.reveal_between_frame_and_insert',
    type_id: 'clearance',
    title: 'Reveal Between Frame And Insert',
    description: 'A frame opening intentionally leaves an even visual gap around an insert such as a canvas, panel, or removable tray.',
    aliases: ['floating reveal', 'shadow gap', 'frame reveal', 'insert clearance', 'even gap'],
    part_roles: ['frame', 'insert', 'canvas', 'panel', 'opening'],
    geometry_cues: ['equal left right reveal', 'equal top bottom reveal', 'insert contained in opening'],
    validator_hints: ['validators.rabbet_strainer_fit'],
    component_hints: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set'],
    example_uses: ['floating frame canvas reveal', 'strainer on rabbet', 'recessed panel frame']
  },
  {
    relationship_id: 'relationship.support.rabbet_ledge_supports_strainer',
    type_id: 'support',
    title: 'Rabbet Ledge Supports Strainer',
    description: 'A milled rabbet ledge supports thin strainer rails or an insert from behind while preserving visible reveal.',
    aliases: ['rabbet ledge', 'strainer seated on rabbet', 'support ledge', 'notched frame support'],
    part_roles: ['rabbeted frame', 'strainer rail', 'ledge', 'canvas support'],
    geometry_cues: ['ledge depth', 'rail seated on ledge', 'flush back or recessed back', 'no clipping through face'],
    validator_hints: ['validators.rabbet_strainer_fit', 'validators.physical_part_overlap'],
    component_hints: ['geometry.rabbeted_frame_face_set', 'geometry.strainer_rail_set', 'rendering.rabbet_milling_operation_view'],
    example_uses: ['floating frame strainer on rabbet', 'canvas support rails', 'picture frame support ledge']
  },
  {
    relationship_id: 'relationship.support.stepped_shelf_on_posts',
    type_id: 'support',
    title: 'Stepped Shelf On Posts',
    description: 'Multiple shelf panels attach to posts at different heights, requiring clear non-overlapping levels and anti-tip guidance.',
    aliases: ['plant stand shelves', 'stepped shelves', 'tiered shelf', 'corner stand levels'],
    part_roles: ['shelf', 'post', 'rail', 'plant stand', 'tier'],
    geometry_cues: ['separate shelf elevations', 'post clearances', 'supported corners', 'anti tip warning'],
    validator_hints: ['validators.physical_part_overlap', 'validators.load_bearing_caution'],
    component_hints: ['geometry.rectangular_panel', 'geometry.square_leg_post', 'geometry.linear_rail'],
    example_uses: ['corner plant stand', 'tiered herb shelf', 'stepped display stand']
  },
  {
    relationship_id: 'relationship.fixed_contact.slats_to_corner_posts',
    type_id: 'fixed_contact',
    title: 'Slats Fastened To Corner Posts',
    description: 'Repeated side or bottom slats attach to corner posts or rails with air gaps and fastener edge clearance.',
    aliases: ['crate slats', 'slatted side', 'slats on posts', 'open crate wall', 'planter slats'],
    part_roles: ['slat', 'post', 'rail', 'crate', 'planter'],
    geometry_cues: ['repeated gaps', 'slat end support', 'fastener clearance', 'open side airflow'],
    validator_hints: ['validators.linear_spacing', 'validators.edge_clearance', 'validators.physical_part_overlap'],
    component_hints: ['geometry.slatted_panel_set', 'geometry.linear_rail', 'geometry.square_leg_post', 'patterns.centered_linear_spacing'],
    example_uses: ['produce crate sides', 'slatted planter', 'open storage crate']
  },
  {
    relationship_id: 'relationship.support.bottom_panel_supported_by_box_sides',
    type_id: 'support',
    title: 'Bottom Panel Supported By Box Sides',
    description: 'A flat bottom panel or slatted bottom is captured by side panels, slatted walls, rails, or posts and carries tray, crate, or planter contents.',
    aliases: ['bottom panel in box', 'planter bottom', 'crate floor', 'tray bottom supported by sides', 'bottom slats supported'],
    part_roles: ['bottom panel', 'side panel', 'slat', 'rail', 'post', 'box'],
    geometry_cues: ['bottom sits below or between side walls', 'side support on all edges', 'drainage or air gap references contained in bottom'],
    validator_hints: ['validators.physical_part_overlap', 'validators.host_containment', 'validators.edge_clearance'],
    component_hints: ['geometry.rectangular_panel', 'geometry.slatted_panel_set', 'hardware.drainage_hole_grid'],
    example_uses: ['small planter bottom panel', 'produce crate floor', 'tray feeder bottom supported by rails']
  },
  {
    relationship_id: 'relationship.support.caster_plate_to_base',
    type_id: 'support',
    title: 'Caster Plate To Reinforced Base',
    description: 'Caster plates mount under a base frame or panel with inset screw holes and reinforcement around the load path.',
    aliases: ['caster plate mount', 'rolling base wheels', 'caster screws', 'mobile base'],
    part_roles: ['caster', 'base', 'frame', 'mounting plate', 'wheel'],
    geometry_cues: ['plate inset from edges', 'four corner support', 'screw hole layout', 'load path through frame'],
    validator_hints: ['validators.edge_clearance', 'validators.load_bearing_caution'],
    component_hints: ['hardware.caster_plate_set', 'geometry.rectangular_frame_bay', 'rendering.dimensioned_callout_view'],
    example_uses: ['rolling tote rack', 'mobile workbench', 'miter saw stand base']
  }
];

export function listAssemblyRelationshipTypes() {
  return ASSEMBLY_RELATIONSHIP_TYPES.map((type) => ({ ...type }));
}

export function listAssemblyRelationships({ type_id = null, include_details = false } = {}) {
  const typeId = normalizeTypeId(type_id);
  return ASSEMBLY_RELATIONSHIP_CATALOG
    .filter((relationship) => !typeId || relationship.type_id === typeId)
    .map((relationship) => relationshipSummary(relationship, include_details));
}

export function getAssemblyRelationship(relationshipId) {
  const relationship = ASSEMBLY_RELATIONSHIP_CATALOG.find((item) => item.relationship_id === relationshipId);
  return relationship ? structuredClone(relationship) : null;
}

export function searchAssemblyRelationships({ query = '', part_roles = [], type_id = null, limit = 8 } = {}) {
  const typeId = normalizeTypeId(type_id);
  const queryProfile = buildSearchProfile([query, ...part_roles].join(' '));
  const roleTerms = new Set(cleanStringArray(part_roles).flatMap((role) => tokenize(role).flatMap(expandTerm)));
  const scored = ASSEMBLY_RELATIONSHIP_CATALOG
    .map((relationship) => ({ relationship, score: relationshipScore(relationship, queryProfile, roleTerms, typeId) }))
    .filter((item) => item.score > 0 || queryProfile.terms.length === 0)
    .sort((a, b) => b.score - a.score || a.relationship.relationship_id.localeCompare(b.relationship.relationship_id))
    .slice(0, Math.max(1, Number(limit) || 8));
  return scored.map(({ relationship, score }) => ({ ...relationshipSummary(relationship, true), score }));
}

function relationshipSummary(relationship, includeDetails) {
  const summary = {
    relationship_id: relationship.relationship_id,
    type_id: relationship.type_id,
    title: relationship.title,
    description: relationship.description,
    aliases: relationship.aliases,
    part_roles: relationship.part_roles
  };
  if (!includeDetails) return summary;
  return {
    ...summary,
    geometry_cues: relationship.geometry_cues,
    validator_hints: relationship.validator_hints,
    component_hints: relationship.component_hints,
    missing_capability_hints: relationship.missing_capability_hints || [],
    example_uses: relationship.example_uses
  };
}

function relationshipScore(relationship, queryProfile, roleTerms, typeId) {
  if (!queryProfile.terms.length) return typeId && relationship.type_id !== typeId ? 0 : 1;
  const profile = relationshipSearchProfile(relationship);
  let score = 0;

  if (typeId) score += relationship.type_id === typeId ? 4 : -2;
  if (profile.exactPhrases.has(queryProfile.normalized)) score += 18;
  if (profile.exactPhrases.has(queryProfile.normalized.replaceAll(' ', '_'))) score += 14;

  for (const term of queryProfile.terms) {
    if (profile.terms.has(term)) score += 3;
    else if (profile.text.includes(term)) score += 1.5;
  }

  for (const term of queryProfile.expandedTerms) {
    if (profile.terms.has(term)) score += 1.25;
    else if (profile.text.includes(term)) score += 0.5;
  }

  for (const term of roleTerms) {
    if (profile.roleTerms.has(term)) score += 2;
  }

  score += 6 * jaccard(queryProfile.trigrams, profile.trigrams);
  return Number(score.toFixed(3));
}

function relationshipSearchProfile(relationship) {
  const fields = [
    relationship.relationship_id,
    relationship.type_id,
    relationship.title,
    relationship.description,
    ...(relationship.aliases || []),
    ...(relationship.part_roles || []),
    ...(relationship.geometry_cues || []),
    ...(relationship.validator_hints || []),
    ...(relationship.component_hints || []),
    ...(relationship.missing_capability_hints || []),
    ...(relationship.example_uses || [])
  ];
  const profile = buildDocumentProfile(fields);
  return {
    ...profile,
    roleTerms: new Set((relationship.part_roles || []).flatMap((role) => tokenize(role).flatMap(expandTerm)))
  };
}

function buildDocumentProfile(fields) {
  const normalizedFields = fields.map(normalizeText).filter(Boolean);
  const text = normalizedFields.join(' ');
  return {
    text,
    terms: new Set(tokenize(text).flatMap(expandTerm)),
    exactPhrases: new Set(normalizedFields),
    trigrams: charNgrams(text, 3)
  };
}

function buildSearchProfile(query) {
  const normalized = normalizeText(query);
  const terms = tokenize(normalized);
  return {
    normalized,
    terms,
    expandedTerms: [...new Set(terms.flatMap(expandTerm).filter((term) => !terms.includes(term)))],
    trigrams: charNgrams(normalized, 3)
  };
}

function normalizeTypeId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (ASSEMBLY_RELATIONSHIP_TYPES.some((type) => type.id === raw)) return raw;
  const normalized = normalizeText(raw);
  const type = ASSEMBLY_RELATIONSHIP_TYPES.find((item) => {
    const haystack = normalizeText(`${item.id} ${item.title} ${item.description}`);
    return haystack.includes(normalized) || normalized.includes(item.id);
  });
  return type?.id || null;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9. ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandTerm(term) {
  const normalized = normalizeText(term);
  const group = SYNONYM_GROUPS.find((items) => items.includes(normalized));
  return group || [normalized];
}

function charNgrams(value, size) {
  const text = normalizeText(value).replace(/\s+/g, ' ');
  if (!text) return new Set();
  if (text.length <= size) return new Set([text]);
  const grams = new Set();
  for (let index = 0; index <= text.length - size; index += 1) grams.add(text.slice(index, index + size));
  return grams;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9_.-]+/)
    .filter(Boolean);
}

function cleanStringArray(values = []) {
  return (Array.isArray(values) ? values : [values]).map((value) => String(value || '').trim()).filter(Boolean);
}

const SYNONYM_GROUPS = [
  ['board', 'panel', 'plank', 'backer', 'base', 'shelf', 'tread', 'surface'],
  ['rail', 'stretcher', 'cleat', 'strip', 'runner', 'slat', 'support'],
  ['post', 'leg', 'upright', 'stile'],
  ['hole', 'holes', 'drill', 'pilot', 'bore', 'mount', 'mounting', 'screw', 'fastener'],
  ['hinge', 'hinged', 'fold', 'folding', 'rotate', 'rotating', 'motion', 'swing'],
  ['contact', 'mate', 'joint', 'attach', 'fasten', 'seat', 'seated', 'butt'],
  ['gap', 'clearance', 'reveal', 'inset', 'spacing', 'space'],
  ['dowel', 'rod', 'round', 'cylinder'],
  ['slat', 'slats', 'slatted', 'crate', 'planter', 'ventilated'],
  ['caster', 'wheel', 'rolling', 'mobile'],
  ['frame', 'bay', 'rack', 'stand'],
  ['notch', 'rabbet', 'ledge', 'groove', 'recess']
];
