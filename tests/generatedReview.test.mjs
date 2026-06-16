import assert from 'node:assert/strict';
import { exportPlanPackage, generateDesign } from '../src/generated/sandbox.js';
import {
  buildPhotoBriefMessages,
  normalizePhotoDesignBrief,
  scenarioFromPhotoDesignBrief,
  summarizePhotoDesignBrief
} from '../src/generated/photoBrief.js';
import {
  PACKAGE_REVIEW_ROLES,
  VISUAL_REVIEW_SCHEMA,
  buildPackageReviewInput,
  buildReviewMessages,
  buildVisualReviewInput,
  buildVisualReviewMessages,
  normalizePackageReview,
  normalizeVisualReview,
  summarizePackageReviews
} from '../src/generated/review.js';

const design = generateDesign({
  template_id: 'tray_bird_feeder',
  design_id: 'review_test_feeder',
  parameters: {
    width_in: 12,
    depth_in: 8,
    side_height_in: 1.5,
    bottom_thickness_in: 0.75,
    side_thickness_in: 0.75,
    material: 'cedar_fence_picket',
    hanging: true,
    drainage_holes: true
  }
});

const planPackage = exportPlanPackage(design);
const reviewInput = buildPackageReviewInput(planPackage);
assert.equal(reviewInput.design.design_id, 'review_test_feeder');
assert.equal(reviewInput.design.physical_part_count, 5);
assert.equal(reviewInput.design.parts.some((part) => part.id.startsWith('drainage.hole') && part.physical === false), true);
assert.equal(reviewInput.portal_result.type, 'generated');
assert.equal(reviewInput.exports.has_openscad, true);

assert.equal(PACKAGE_REVIEW_ROLES.length >= 5, true);
const role = PACKAGE_REVIEW_ROLES.find((item) => item.id === 'build_planner');
const messages = buildReviewMessages(role, reviewInput);
assert.equal(messages.length, 2);
assert.match(messages[0].content, /Build Planner/);
assert.match(messages[0].content, /default ok_to_publish to true/);
assert.match(messages[1].content, /review_test_feeder/);

const normalized = normalizePackageReview('build_planner', {
  ok_to_publish: false,
  findings: [{ severity: 'loud', category: 'steps', message: 'Add a dry-fit check.' }],
  recommended_revisions: [{ target: 'assembly_steps', change: 'Add dry fit.', reason: 'Improves build flow.' }],
  missing_capabilities: [{ capability: 'assembly animation review', reason: 'Cannot inspect motion yet.' }]
});
assert.equal(normalized.role, 'build_planner');
assert.equal(normalized.ok_to_publish, false);
assert.equal(normalized.findings[0].severity, 'info');

const summary = summarizePackageReviews([
  normalized,
  normalizePackageReview('publication_reviewer', {
    role: 'Publication Reviewer',
    ok_to_publish: true,
    findings: [{ severity: 'warning', category: 'portal', message: 'Generic loader is not done.' }],
    missing_capabilities: [{ capability: 'assembly animation review', reason: 'Cannot inspect motion yet.' }]
  })
]);
assert.equal(summary.ok_to_publish, false);
assert.equal(summary.review_count, 2);
assert.equal(summary.warning_count, 1);
assert.equal(summary.missing_capabilities.length, 1);

const visualInput = buildVisualReviewInput(planPackage, {
  viewLabel: 'Drill layout screenshot',
  reviewFocus: 'Check whether the drill step clearly shows pre-assembly hole layout guidance.'
});
assert.equal(visualInput.view_label, 'Drill layout screenshot');
assert.match(buildVisualReviewInput(planPackage).review_focus, /first-time builder/);
assert.match(visualInput.review_focus, /pre-assembly hole layout/);
assert.equal(visualInput.package.design.design_id, 'review_test_feeder');
assert.equal(visualInput.visual_expectations.assembly_steps.some((step) => step.id === 'step.drill'), true);

const visualMessages = buildVisualReviewMessages(visualInput, 'data:image/png;base64,abc123');
assert.equal(visualMessages.length, 2);
assert.match(visualMessages[0].content, /first-time builder/);
assert.equal(visualMessages[1].content[1].image_url.url, 'data:image/png;base64,abc123');
assert.equal(VISUAL_REVIEW_SCHEMA.required.includes('matches_intent'), true);
assert.equal(VISUAL_REVIEW_SCHEMA.required.includes('builder_comprehension'), true);

const visualReview = normalizeVisualReview({
  view_label: 'Drill layout screenshot',
  matches_intent: false,
  confidence: 'certain',
  builder_comprehension: {
    can_identify_next_action: true,
    can_locate_relevant_parts: true,
    can_locate_holes_or_fasteners: false,
    text_matches_image: false,
    assembly_stage_is_clear: false,
    confusion_points: ['The text says drill before assembly, but the image shows the rails attached.']
  },
  findings: [{ severity: 'warning', category: 'stage', message: 'The drill view appears fully assembled.' }],
  proposed_annotations: {
    step_instructions: [{ step_id: 'step.drill', instructions: ['Show drilling before the rails are attached.'], mode: 'append' }],
    part_notes: [{ part_id: 'bottom.panel', notes: ['Mark drainage holes at least 1 in from each panel edge.'] }],
    design_notes: ['Visual review recommends clearer drill guidance.']
  },
  missing_capabilities: [{ capability: 'stage-specific screenshot capture', reason: 'The visual reviewer needs rendered pre-assembly views.', evidence: ['Screenshot shows rails attached.'] }]
}, {
  viewLabel: 'Caller supplied drill screenshot label',
  validStepIds: ['step.drill'],
  validPartIds: ['bottom.panel']
});
assert.equal(visualReview.view_label, 'Caller supplied drill screenshot label');
assert.equal(visualReview.matches_intent, false);
assert.equal(visualReview.confidence, 'low');
assert.equal(visualReview.builder_comprehension.can_identify_next_action, true);
assert.equal(visualReview.builder_comprehension.can_locate_holes_or_fasteners, false);
assert.equal(visualReview.builder_comprehension.confusion_points.length, 1);
assert.equal(visualReview.proposed_annotations.step_instructions[0].step_id, 'step.drill');
assert.equal(visualReview.proposed_annotations.part_notes[0].part_id, 'bottom.panel');
assert.equal(visualReview.missing_capabilities[0].evidence[0], 'Screenshot shows rails attached.');

const filteredVisualReview = normalizeVisualReview({
  proposed_annotations: {
    step_instructions: [
      { step_id: '2', instructions: ['Loose visible step number should be ignored.'] },
      { step_id: 'step.drill', instructions: ['Exact package step ID should survive.'] }
    ],
    part_notes: [
      { part_id: '1', notes: ['Loose visible part number should be ignored.'] },
      { part_id: 'bottom.panel', notes: ['Exact package part ID should survive.'] }
    ]
  }
}, {
  validStepIds: ['step.drill'],
  validPartIds: ['bottom.panel']
});
assert.equal(filteredVisualReview.proposed_annotations.step_instructions.length, 1);
assert.equal(filteredVisualReview.proposed_annotations.part_notes.length, 1);

const photoSet = {
  photo_set_id: 'entry_reference',
  known_measurements: [{ label: 'overall width', value_in: 18 }],
  photos: [
    { photo_id: 'front', view: 'front', path: 'front.jpg' },
    { photo_id: 'side', view: 'side', path: 'side.jpg' }
  ]
};
const photoBrief = normalizePhotoDesignBrief({
  photo_set_id: 'entry_reference',
  object_type: 'wall mail and key organizer',
  confidence: 'high',
  parts: [
    { name: 'back board', role: 'wall backer', seen_in: ['front'], component_query: 'rectangular back board panel', confidence: 'high' },
    { name: 'mail pocket', role: 'shallow envelope pocket', seen_in: ['front', 'side'], component_query: 'mail pocket shallow wall shelf', confidence: 'high' },
    { name: 'key hooks', role: 'linear hook row', seen_in: ['front'], component_query: 'key hooks linear hook array', confidence: 'high', notes: ['5 hooks visible'] }
  ],
  inferred_dimensions: [
    { label: 'overall height', estimate_in: 10, confidence: 'medium', basis: 'proportion from width' },
    { label: 'pocket depth', estimate_in: 2.5, confidence: 'medium', basis: 'side view' }
  ]
}, { photoSet });
assert.equal(photoBrief.schema_version, '0.1');
assert.equal(photoBrief.photos.length, 2);
assert.equal(photoBrief.known_measurements[0].value_in, 18);
assert.equal(photoBrief.component_searches.some((search) => /mail pocket/.test(search.query)), true);
assert.equal(summarizePhotoDesignBrief(photoBrief).part_count, 3);

const photoScenario = scenarioFromPhotoDesignBrief(photoBrief);
assert.equal(photoScenario.template_id, 'wall_panel_with_pocket_and_linear_hardware');
assert.equal(photoScenario.parameters.width_in, 18);
assert.equal(photoScenario.parameters.height_in, 10);
assert.equal(photoScenario.parameters.pocket_depth_in, 2.5);
assert.equal(photoScenario.parameters.hook_count, 5);

const photoMessages = buildPhotoBriefMessages(photoSet, ['data:image/jpeg;base64,front', 'data:image/jpeg;base64,side']);
assert.equal(photoMessages.length, 2);
assert.match(photoMessages[0].content, /Reconcile all supplied photos/);
assert.equal(photoMessages[1].content.length, 3);

console.log('generated review tests passed');
