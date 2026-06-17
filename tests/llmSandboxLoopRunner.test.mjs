import assert from 'node:assert/strict';
import { enforceWorkflowGate } from '../src/generated/llmSandboxLoopRunner.js';

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

console.log('llm sandbox loop runner tests passed');
