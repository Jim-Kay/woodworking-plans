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

console.log('llm sandbox loop runner tests passed');
