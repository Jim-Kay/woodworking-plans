export const GENERATED_DESIGN_SCHEMA_VERSION = '0.1';

export const TEMPLATE_DEFINITIONS = [
  {
    template_id: 'tray_bird_feeder',
    title: 'Tray Bird Feeder',
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
  }
];

export function listTemplates() {
  return TEMPLATE_DEFINITIONS.map((template) => ({
    template_id: template.template_id,
    title: template.title,
    parameters: template.parameters
  }));
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
