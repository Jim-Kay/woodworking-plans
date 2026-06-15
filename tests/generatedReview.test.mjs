import assert from 'node:assert/strict';
import { exportPlanPackage, generateDesign } from '../src/generated/sandbox.js';
import {
  PACKAGE_REVIEW_ROLES,
  buildPackageReviewInput,
  buildReviewMessages,
  normalizePackageReview,
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

console.log('generated review tests passed');
