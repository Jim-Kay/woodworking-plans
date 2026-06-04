import assert from 'node:assert/strict';
import { DEFAULT_PLAN } from '../src/catalogs.js';
import { applyClipConstraints, applyMountingRules, applyOuterSize, calculatePlan, clonePlan, formatLength, getScrewLengthRange, getStageLabels, normalizeBuild, recommendedLinerWidth } from '../src/frameMath.js';
import { calculateShelfPlan } from '../src/shelfMath.js';

const base = clonePlan(DEFAULT_PLAN);
const result = calculatePlan(base);

assert.equal(result.ok, true);
assert.equal(result.innerW, 24.25);
assert.equal(result.innerH, 18.25);
assert.equal(result.outerW, 27.25);
assert.equal(result.outerH, 21.25);
assert.equal(result.parts.length, 6);
assert.equal(result.parts[0].part, 'Face - Long');
assert.equal(result.parts[0].width, base.depth + base.faceLip);
assert.equal(result.parts.at(-1).part, 'Mounting Screws');
assert.equal(result.parts.at(-1).qty, 8);
assert.equal(base.linerW, 1.625);
assert.equal(recommendedLinerWidth(base), base.reveal + base.stretcherW);
assert.deepEqual(getScrewLengthRange(base, result.linerDepth), { min: 0.875, max: 1.125, frontSafety: 0.125 });

const strainer = calculatePlan({ ...base, build: 'strainer', join: 'butt' });
assert.equal(strainer.ok, true);
assert.equal(strainer.parts[1].length, strainer.outerW - (base.face + base.rabbet) * 2);
assert.equal(strainer.parts[2].part, 'Strainer - Long');
assert.equal(strainer.supportThickness, strainer.supportDepth);
assert.ok(strainer.parts[0].notes.includes('0.125 in deep x 0 in wide rabbet'));
assert.equal(normalizeBuild('one'), 'strainer');

const deepStrainer = calculatePlan({ ...base, build: 'strainer', depth: 3, strainerDepth: 0.5 });
assert.equal(deepStrainer.ok, true);
assert.equal(deepStrainer.supportDepth, 2.25);
assert.equal(deepStrainer.supportThickness, 0.5);
assert.equal(deepStrainer.supportBottom, 1.75);
assert.deepEqual(deepStrainer.screwRange, { min: 0.875, max: 1.125, frontSafety: 0.125 });
assert.equal(deepStrainer.parts[0].width, 3 + base.faceLip);
assert.ok(deepStrainer.parts[0].notes.includes('0.125 in deep x 1.75 in wide rabbet'));

const thickerCanvasStrainer = calculatePlan({ ...base, build: 'strainer', depth: 3, canvasT: 1, strainerDepth: 0.5 });
assert.equal(thickerCanvasStrainer.supportBottom, 1.5);
assert.ok(thickerCanvasStrainer.parts[0].notes.includes('0.125 in deep x 1.5 in wide rabbet'));

const twoPieceButt = calculatePlan({ ...base, join: 'butt' });
assert.equal(twoPieceButt.ok, true);
assert.equal(twoPieceButt.parts[1].length, twoPieceButt.outerW - base.face * 2);
assert.equal(twoPieceButt.parts[3].length, twoPieceButt.innerW - base.linerW * 2);
assert.equal(twoPieceButt.parts[1].notes, 'Between face long sides');

const outerApplied = applyOuterSize(base, 30, 24);
assert.equal(outerApplied.face + outerApplied.reveal, 3);

const clipPlan = applyClipConstraints({ ...base, mountMethod: 'clips', mountClip: '0.75', linerW: 1.4 });
assert.equal(clipPlan.depth, clipPlan.canvasT + 0.75);
assert.equal(clipPlan.linerW, base.reveal + base.stretcherW - 0.5);

const screwPlan = applyMountingRules({ ...base, mountMethod: 'screws', linerW: 0.75 });
assert.equal(screwPlan.linerW, base.reveal + base.stretcherW);

assert.equal(formatLength(1.5, 'in'), '1.5 in');
assert.equal(formatLength(1, 'mm'), '25.4 mm');
assert.ok(getStageLabels('two').includes('Liner: Bottom'));
assert.equal(getStageLabels('one').includes('Liner: Bottom'), false);
assert.ok(getStageLabels('strainer').includes('Strainer: Bottom'));

const shelves = calculateShelfPlan({
  shelfW: 96,
  shelfH: 72,
  shelfD: 24,
  shelfLevels: 4,
  shelfBays: 3,
  shelfSlats: 5,
  shelfPost: 3.5,
  shelfRail: 3.5,
  shelfDeck: 3.5
});
assert.equal(shelves.ok, true);
assert.deepEqual(shelves.warnings, []);
assert.equal(shelves.slatLength, 96);
assert.equal(shelves.assembly.parts.find((part) => part.id === 'post.front.0').position.x, -46.25);
assert.equal(shelves.assembly.parts.find((part) => part.id === 'rail.side.level0.post0').position.x, -47.25);
assert.equal(shelves.assembly.connections.some((connection) => connection.type === 'fastenedBy'), true);

const toteRack = calculateShelfPlan({
  build: 'tote-rack',
  toteW: 20.5,
  toteD: 30.5,
  toteH: 14.25,
  toteColumns: 3,
  toteRows: 3,
  toteSideClearance: 1.5,
  toteVerticalClearance: 3,
  toteRailInset: 1.25,
  shelfPost: 3.5,
  shelfRail: 3.5
});
assert.equal(toteRack.ok, true);
assert.equal(toteRack.capacity, 9);
assert.equal(toteRack.shelfW, 69.5);
assert.equal(toteRack.shelfD, 36);
assert.equal(toteRack.assembly.parts.filter((part) => part.material === 'tote').length, 9);
assert.equal(toteRack.assembly.parts.filter((part) => part.id.startsWith('rail.runner.')).length, 18);
assert.equal(toteRack.assembly.parts.filter((part) => part.meta?.kind === 'caster').length, 4);
assert.deepEqual(toteRack.assembly.parts.find((part) => part.id === 'post.front.0').size, { x: 1.5, y: 51, z: 3.5 });
assert.deepEqual(toteRack.assembly.parts.find((part) => part.id === 'rail.frame.front.top').size, { x: 69.5, y: 1.5, z: 3.5 });
assert.equal(toteRack.assembly.parts.find((part) => part.id === 'post.front.0').position.y, 28.5);
assert.equal(toteRack.assembly.parts.find((part) => part.id === 'rail.runner.row0.bay0.left').position.x, -32.5);
assert.equal(toteRack.assembly.parts.filter((part) => part.id.startsWith('rail.tie.bottom.')).length, 8);
assert.equal(toteRack.assembly.parts.find((part) => part.id === 'rail.tie.bottom.0.post0').position.x, -33);
assert.equal(toteRack.assembly.parts.find((part) => part.id === 'rail.tie.bottom.0.post3').position.x, 33);
assert.equal(toteRack.validation.componentOverlaps.count, 0);

const customToteRack = calculateShelfPlan({
  build: 'tote-rack',
  toteW: 22,
  toteD: 30.5,
  toteH: 14.25,
  toteColumns: 2,
  toteRows: 4,
  toteSideClearance: 1.5,
  toteVerticalClearance: 3,
  toteRailInset: 1.25,
  shelfPost: 3.5,
  shelfRail: 3.5
});
assert.equal(customToteRack.capacity, 8);
assert.equal(customToteRack.shelfW, 50.5);

console.log('frameMath tests passed');
