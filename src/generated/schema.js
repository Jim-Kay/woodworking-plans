export const GENERATED_DESIGN_SCHEMA_VERSION = '0.1';

export const TEMPLATE_DEFINITIONS = [
  {
    template_id: 'tray_bird_feeder',
    title: 'Tray Bird Feeder',
    aliases: ['bird feeder', 'tray feeder', 'outdoor seed tray'],
    parameters: {
      width_in: { type: 'number', min: 6, max: 24, default: 12 },
      depth_in: { type: 'number', min: 5, max: 18, default: 8 },
      side_height_in: { type: 'number', min: 0.75, max: 3, default: 1.5 },
      bottom_thickness_in: { type: 'number', min: 0.25, max: 1, default: 0.75 },
      side_thickness_in: { type: 'number', min: 0.25, max: 1, default: 0.75 },
      material: { type: 'string', default: 'cedar_fence_picket' },
      hanging: { type: 'boolean', default: true },
      drainage_holes: { type: 'boolean', default: true }
    }
  },
  {
    template_id: 'board_with_linear_hardware',
    title: 'Board With Linear Hardware',
    aliases: ['wall_key_rack', 'key rack', 'coat hook rail', 'mug rack', 'peg rail', 'hook board'],
    components: [
      'geometry.rectangular_panel',
      'hardware.linear_hook_array',
      'hardware.wall_mount_hole_pair',
      'patterns.centered_linear_spacing',
      'validators.edge_clearance',
      'validators.linear_spacing',
      'build_steps.mark_drill_install',
      'rendering.stage_aware_reference_view'
    ],
    parameters: {
      width_in: { type: 'number', min: 8, max: 48, default: 18 },
      height_in: { type: 'number', min: 2.5, max: 10, default: 4 },
      board_thickness_in: { type: 'number', min: 0.375, max: 1.5, default: 0.75 },
      hook_count: { type: 'number', min: 1, max: 12, default: 5 },
      hook_spacing_in: { type: 'number', min: 1.5, max: 8, default: 3 },
      min_end_inset_in: { type: 'number', min: 0.75, max: 6, default: 1.5 },
      mounting_holes: { type: 'boolean', default: true },
      mount_hole_diameter_in: { type: 'number', min: 0.125, max: 0.5, default: 0.1875 },
      pilot_hole_diameter_in: { type: 'number', min: 0.0625, max: 0.375, default: 0.125 },
      hook_projection_in: { type: 'number', min: 0.5, max: 4, default: 1.25 },
      hardware_type: { type: 'string', default: 'screw_hook' },
      material: { type: 'string', default: 'pine_1x4' }
    }
  }
];

export function listTemplates() {
  return TEMPLATE_DEFINITIONS.map((template) => ({
    template_id: template.template_id,
    title: template.title,
    aliases: template.aliases || [],
    components: template.components || [],
    parameters: template.parameters
  }));
}

export function findTemplateCandidates(value) {
  const query = String(value || '').toLowerCase();
  if (!query) return [];
  return TEMPLATE_DEFINITIONS
    .filter((template) => [template.template_id, template.title, ...(template.aliases || [])]
      .some((item) => String(item || '').toLowerCase() === query || String(item || '').toLowerCase().includes(query) || query.includes(String(item || '').toLowerCase())))
    .map((template) => template.template_id);
}

export function getTemplateDefinition(templateId) {
  return TEMPLATE_DEFINITIONS.find((template) => template.template_id === templateId) || null;
}

export function defaultParametersForTemplate(templateId) {
  const template = getTemplateDefinition(templateId);
  if (!template) return {};
  return Object.fromEntries(Object.entries(template.parameters).map(([key, definition]) => [key, definition.default]));
}

export function createCapabilityRequest({ capability, reason, design_id = null, scenario = null, evidence = [] }) {
  return {
    type: 'capability_request',
    schema_version: GENERATED_DESIGN_SCHEMA_VERSION,
    capability: String(capability || '').trim(),
    reason: String(reason || '').trim(),
    design_id,
    scenario,
    evidence,
    requested_by: 'local-design-sandbox'
  };
}
