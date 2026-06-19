import assert from 'node:assert/strict';
import { enforceWorkflowGate, readyForFinalPackage } from '../src/generated/llmSandboxLoopRunner.js';

const gated = enforceWorkflowGate({
  action: 'request_capability',
  rationale: 'Portal notes mention future generic package loader support.',
  tool_call: {
    name: 'request_capability',
    arguments: {
      capability_type: 'portal_integration',
      evidence: 'check_publishability returned portal_integration_notes'
    }
  }
}, {
  transcript: [
    {
      model_action: {
        action: 'check_publishability',
        tool_call: { name: 'check_publishability', arguments: {} }
      },
      tool_result: {
        ok: true,
        errors: [],
        warnings: [],
        portal_integration_notes: ['A generic generated-package loader is still needed for arbitrary generated templates.']
      }
    }
  ]
});

assert.equal(gated.action, 'export_plan_package');
assert.equal(gated.tool_call.name, 'export_plan_package');
assert.equal(gated.overridden_model_action.action, 'request_capability');

const notGated = enforceWorkflowGate({
  action: 'request_capability',
  rationale: 'The renderer cannot show the needed joinery operation.',
  tool_call: {
    name: 'request_capability',
    arguments: { capability: 'joinery operation renderer' }
  }
}, {
  transcript: [
    {
      model_action: {
        action: 'check_publishability',
        tool_call: { name: 'check_publishability', arguments: {} }
      },
      tool_result: {
        ok: false,
        errors: ['Missing renderer support.']
      }
    }
  ]
});

assert.equal(notGated.action, 'request_capability');
assert.equal(notGated.tool_call.name, 'request_capability');

const compatibleTemplateGate = enforceWorkflowGate({
  action: 'propose_component_composition',
  rationale: 'The unsupported mail_key_organizer can be described from components.',
  tool_call: {
    name: 'propose_component_composition',
    arguments: {
      template_id: 'mail_key_organizer',
      component_ids: ['geometry.rectangular_panel']
    }
  }
}, {
  scenario: {
    design_id: 'mail_key_organizer_probe',
    parameters: { width_in: 18 }
  },
  transcript: [
    {
      model_action: {
        action: 'generate_design',
        tool_call: { name: 'generate_design', arguments: { template_id: 'mail_key_organizer' } }
      },
      tool_result: {
        ok: false,
        error: 'Unsupported template_id: mail_key_organizer',
        compatible_template_ids: ['wall_panel_with_pocket_and_linear_hardware']
      }
    }
  ]
});

assert.equal(compatibleTemplateGate.action, 'generate_design');
assert.equal(compatibleTemplateGate.tool_call.arguments.template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(compatibleTemplateGate.tool_call.arguments.design_id, 'mail_key_organizer_probe');
assert.equal(compatibleTemplateGate.tool_call.arguments.parameters.width_in, 18);
assert.equal(compatibleTemplateGate.overridden_model_action.action, 'propose_component_composition');

const blockedCompatibleTemplateGate = enforceWorkflowGate({
  action: 'propose_component_composition',
  rationale: 'The fold-down shelf needs hinge and support relationships.',
  tool_call: {
    name: 'propose_component_composition',
    arguments: {
      template_id: 'fold_down_entry_shelf',
      component_ids: ['geometry.rectangular_panel'],
      relationship_ids: ['relationship.motion.hinge_panel_to_cleat']
    }
  }
}, {
  scenario: {
    design_id: 'fold_down_shelf_probe',
    parameters: { width_in: 24 }
  },
  transcript: [
    {
      model_action: {
        action: 'generate_design',
        tool_call: { name: 'generate_design', arguments: { template_id: 'fold_down_entry_shelf' } }
      },
      tool_result: {
        ok: false,
        error: 'Unsupported template_id: fold_down_entry_shelf',
        compatible_template_ids: ['wall_panel_with_pocket_and_linear_hardware'],
        compatible_template_blockers: ['Scenario requires motion, hinge, swing, or support-stop relationships that no supported deterministic template currently represents.']
      }
    }
  ]
});

assert.equal(blockedCompatibleTemplateGate.action, 'propose_component_composition');
assert.equal(blockedCompatibleTemplateGate.tool_call.name, 'propose_component_composition');

const exactTemplateSearchGate = enforceWorkflowGate({
  action: 'search_components',
  rationale: 'Look for slide support parts before generating.',
  tool_call: {
    name: 'search_components',
    arguments: {
      query: 'telescoping slide support leaf'
    }
  }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'extension_table_probe',
    parameters: { width_in: 40, leaf_depth_in: 12 }
  },
  transcript: [
    {
      model_action: {
        action: 'search_templates',
        tool_call: { name: 'search_templates', arguments: { query: 'extension leaf dining table' } }
      },
      tool_result: {
        ok: true,
        templates: [
          { template_id: 'extension_leaf_dining_table', score: 31 },
          { template_id: 'board_with_linear_hardware', score: 3 }
        ]
      }
    }
  ]
});

assert.equal(exactTemplateSearchGate.action, 'generate_design');
assert.equal(exactTemplateSearchGate.tool_call.arguments.template_id, 'extension_leaf_dining_table');
assert.equal(exactTemplateSearchGate.tool_call.arguments.design_id, 'extension_table_probe');
assert.equal(exactTemplateSearchGate.tool_call.arguments.parameters.leaf_depth_in, 12);
assert.equal(exactTemplateSearchGate.overridden_model_action.action, 'search_components');

const targetGeometryInspectGate = enforceWorkflowGate({
  action: 'generate_design',
  rationale: 'Generate from the known extension table template.',
  tool_call: {
    name: 'generate_design',
    arguments: { template_id: 'extension_leaf_dining_table' }
  }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'target_geometry_probe',
    target_geometry: {
      target_id: 'target_geometry_probe',
      object_type: 'extension leaf table underside',
      volumes: [
        { id: 'slide.front', kind: 'hardware_track', role: 'fixed slide track', position: { x: 0, y: 0, z: 10 }, size: { x: 12, y: 0.5, z: 0.5 } }
      ]
    }
  },
  transcript: []
});

assert.equal(targetGeometryInspectGate.action, 'inspect_target_geometry');
assert.equal(targetGeometryInspectGate.tool_call.name, 'inspect_target_geometry');
assert.equal(targetGeometryInspectGate.overridden_model_action.action, 'generate_design');

const targetPrimitiveFitGate = enforceWorkflowGate({
  action: 'search_templates',
  rationale: 'Search matching templates.',
  tool_call: { name: 'search_templates', arguments: { query: 'extension table' } }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'target_geometry_probe'
  },
  targetGeometry: { target_id: 'target_geometry_probe', volumes: [] },
  transcript: []
});

assert.equal(targetPrimitiveFitGate.action, 'fit_primitives_to_target');
assert.equal(targetPrimitiveFitGate.tool_call.name, 'fit_primitives_to_target');

const targetComponentGraphGate = enforceWorkflowGate({
  action: 'generate_design',
  rationale: 'Generate after primitive fitting.',
  tool_call: { name: 'generate_design', arguments: { template_id: 'extension_leaf_dining_table' } }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'target_geometry_probe'
  },
  targetGeometry: { target_id: 'target_geometry_probe', volumes: [] },
  primitiveFit: { ok: true, primitives: [] },
  transcript: []
});

assert.equal(targetComponentGraphGate.action, 'target_geometry_to_component_graph');
assert.equal(targetComponentGraphGate.tool_call.name, 'target_geometry_to_component_graph');

const blockedTemplateRetryGate = enforceWorkflowGate({
  action: 'generate_design',
  rationale: 'Try the wall organizer template again.',
  tool_call: {
    name: 'generate_design',
    arguments: {
      template_id: 'wall_panel_with_pocket_and_linear_hardware',
      design_id: 'fold_down_shelf_probe',
      parameters: { width_in: 24 }
    }
  }
}, {
  scenario: {
    template_id: 'fold_down_entry_shelf',
    design_id: 'fold_down_shelf_probe',
    intent: 'Wall-mounted fold-down shelf with hinged panel, side chains, and swing clearance.',
    parameters: { width_in: 24, depth_open_in: 10 }
  },
  transcript: [
    {
      model_action: {
        action: 'search_assembly_relationships',
        tool_call: { name: 'search_assembly_relationships', arguments: { query: 'hinged panel to cleat' } }
      },
      tool_result: {
        ok: true,
        relationships: [
          {
            relationship_id: 'relationship.motion.hinge_panel_to_cleat',
            component_hints: ['geometry.rectangular_panel', 'hardware.wall_mount_hole_pair'],
            missing_capability_hints: ['hinge-motion validator', 'open/closed state renderer']
          }
        ]
      }
    },
    {
      model_action: {
        action: 'search_components',
        tool_call: { name: 'search_components', arguments: { query: 'wall mount holes panel' } }
      },
      tool_result: {
        ok: true,
        components: [
          { component_id: 'geometry.rectangular_panel' },
          { component_id: 'hardware.wall_mount_hole_pair' }
        ]
      }
    },
    {
      model_action: {
        action: 'generate_design',
        tool_call: { name: 'generate_design', arguments: { template_id: 'wall_panel_with_pocket_and_linear_hardware' } }
      },
      tool_result: {
        ok: false,
        attempted_template_id: 'wall_panel_with_pocket_and_linear_hardware',
        template_fit_blockers: ['Scenario requires motion, hinge, swing, or support-stop relationships that no supported deterministic template currently represents.']
      }
    }
  ]
});

assert.equal(blockedTemplateRetryGate.action, 'propose_component_composition');
assert.equal(blockedTemplateRetryGate.tool_call.arguments.template_id, 'fold_down_entry_shelf');
assert.equal(blockedTemplateRetryGate.tool_call.arguments.relationship_ids.includes('relationship.motion.hinge_panel_to_cleat'), true);
assert.equal(blockedTemplateRetryGate.tool_call.arguments.requested_missing_component_ids.includes('hardware.hinge_pair'), true);

const aliasTemplateGate = enforceWorkflowGate({
  action: 'propose_component_composition',
  rationale: 'The mail organizer can be composed from known components.',
  tool_call: {
    name: 'propose_component_composition',
    arguments: {
      template_id: 'mail_key_organizer',
      component_ids: ['geometry.rectangular_panel', 'geometry.shallow_wall_pocket']
    }
  }
}, {
  scenario: {
    design_id: 'mail_key_alias_probe',
    template_id: 'mail_key_organizer',
    parameters: { width_in: 18, height_in: 10 }
  },
  transcript: [
    {
      model_action: {
        action: 'search_components',
        tool_call: { name: 'search_components', arguments: { query: 'mail pocket key hooks' } }
      },
      tool_result: {
        ok: true
      }
    }
  ]
});

assert.equal(aliasTemplateGate.action, 'generate_design');
assert.equal(aliasTemplateGate.tool_call.arguments.template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(aliasTemplateGate.tool_call.arguments.design_id, 'mail_key_alias_probe');
assert.equal(aliasTemplateGate.tool_call.arguments.parameters.height_in, 10);

const validateGeneratedDesignGate = enforceWorkflowGate({
  action: 'propose_component_composition',
  rationale: 'The generated design still needs a component proposal.',
  tool_call: {
    name: 'propose_component_composition',
    arguments: {
      template_id: 'mail_key_organizer',
      component_ids: ['geometry.rectangular_panel']
    }
  }
}, {
  scenario: {
    template_id: 'mail_key_organizer',
    design_id: 'mail_key_alias_probe'
  },
  design: {
    design_id: 'mail_key_alias_probe',
    template_id: 'wall_panel_with_pocket_and_linear_hardware'
  },
  validation: null,
  transcript: []
});

assert.equal(validateGeneratedDesignGate.action, 'validate_design');
assert.equal(validateGeneratedDesignGate.tool_call.name, 'validate_design');
assert.equal(validateGeneratedDesignGate.overridden_model_action.action, 'propose_component_composition');

const buildStepReviewGate = enforceWorkflowGate({
  action: 'request_capability',
  rationale: 'The generated design might still need a reusable pocket component.',
  tool_call: {
    name: 'request_capability',
    arguments: { capability: 'reusable pocket component' }
  }
}, {
  scenario: {
    template_id: 'mail_key_organizer',
    design_id: 'mail_key_alias_probe'
  },
  design: {
    design_id: 'mail_key_alias_probe',
    template_id: 'wall_panel_with_pocket_and_linear_hardware'
  },
  validation: { ok: true, status: 'valid' },
  buildStepReview: null,
  transcript: []
});

assert.equal(buildStepReviewGate.action, 'review_build_steps');
assert.equal(buildStepReviewGate.tool_call.name, 'review_build_steps');
assert.equal(buildStepReviewGate.overridden_model_action.action, 'request_capability');

const componentInterfaceReviewGate = enforceWorkflowGate({
  action: 'review_build_steps',
  rationale: 'The extension table validated, so review build steps.',
  tool_call: { name: 'review_build_steps', arguments: {} }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'extension_table_probe'
  },
  design: {
    design_id: 'extension_table_probe',
    template_id: 'extension_leaf_dining_table'
  },
  validation: { ok: true, status: 'valid' },
  buildStepReview: null,
  transcript: []
});

assert.equal(componentInterfaceReviewGate.action, 'review_component_interfaces');
assert.equal(componentInterfaceReviewGate.tool_call.name, 'review_component_interfaces');
assert.equal(componentInterfaceReviewGate.overridden_model_action.action, 'review_build_steps');

const failedComponentInterfaceGate = enforceWorkflowGate({
  action: 'review_build_steps',
  rationale: 'Try to move on despite failed interface review.',
  tool_call: { name: 'review_build_steps', arguments: {} }
}, {
  scenario: {
    template_id: 'extension_leaf_dining_table',
    design_id: 'extension_table_probe'
  },
  design: {
    design_id: 'extension_table_probe',
    template_id: 'extension_leaf_dining_table'
  },
  validation: { ok: true, status: 'valid' },
  componentInterfaceReview: {
    quality_gate_passed: false,
    capability_request_arguments: {
      capability: 'component-first extension table slide subsystem',
      reason: 'Missing fixed slide tracks.',
      evidence: ['No physical fixed slide member found.']
    }
  },
  buildStepReview: null,
  transcript: []
});

assert.equal(failedComponentInterfaceGate.action, 'request_capability');
assert.equal(failedComponentInterfaceGate.tool_call.name, 'request_capability');
assert.match(failedComponentInterfaceGate.tool_call.arguments.capability, /component-first extension table/);

const exportAfterReviewReadyGate = enforceWorkflowGate({
  action: 'request_capability',
  rationale: 'The model still wants a component request.',
  tool_call: {
    name: 'request_capability',
    arguments: { capability: 'extra component' }
  }
}, {
  scenario: {
    template_id: 'mail_key_organizer',
    design_id: 'mail_key_alias_probe'
  },
  design: {
    design_id: 'mail_key_alias_probe',
    template_id: 'wall_panel_with_pocket_and_linear_hardware'
  },
  validation: { ok: true, status: 'valid' },
  buildStepReview: { ok: true, status: 'ready', quality_gate_passed: true },
  finalPackage: null,
  transcript: []
});

assert.equal(exportAfterReviewReadyGate.action, 'export_plan_package');
assert.equal(exportAfterReviewReadyGate.tool_call.name, 'export_plan_package');
assert.equal(exportAfterReviewReadyGate.overridden_model_action.action, 'request_capability');

assert.equal(readyForFinalPackage({
  design: { design_id: 'ready_design' },
  validation: { ok: true, status: 'valid' },
  buildStepReview: { ok: true, status: 'ready', quality_gate_passed: true },
  finalPackage: null
}), true);

assert.equal(readyForFinalPackage({
  design: { design_id: 'extension_needs_interfaces', template_id: 'extension_leaf_dining_table' },
  validation: { ok: true, status: 'valid' },
  buildStepReview: { ok: true, status: 'ready', quality_gate_passed: true },
  finalPackage: null
}), false);

assert.equal(readyForFinalPackage({
  design: { design_id: 'extension_ready', template_id: 'extension_leaf_dining_table' },
  validation: { ok: true, status: 'valid' },
  componentInterfaceReview: { ok: true, status: 'ready', quality_gate_passed: true },
  buildStepReview: { ok: true, status: 'ready', quality_gate_passed: true },
  finalPackage: null
}), true);

assert.equal(readyForFinalPackage({
  design: { design_id: 'needs_capability' },
  validation: { ok: true, status: 'valid' },
  buildStepReview: { ok: true, status: 'ready', quality_gate_passed: true },
  capabilityRequest: { capability: 'missing renderer' }
}), false);

console.log('llm sandbox loop runner tests passed');
