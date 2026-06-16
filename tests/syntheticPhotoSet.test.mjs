import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateSyntheticPhotoSet, renderDesignPng } from '../scripts/generate-synthetic-photo-set.mjs';
import { generateDesign } from '../src/generated/sandbox.js';

const outDir = join('generated', 'runs', 'test-synthetic-photo-set');
await mkdir(outDir, { recursive: true });

const scenario = {
  template_id: 'two_step_stool',
  design_id: 'synthetic_step_stool_test',
  intent: 'two-step wooden step stool',
  parameters: {
    width_in: 16,
    depth_in: 16,
    height_in: 16,
    lower_step_height_in: 8,
    material: 'pine'
  }
};
const scenarioPath = join(outDir, 'scenario.json');
await writeFile(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`, 'utf8');

const directPng = renderDesignPng(generateDesign(scenario), 'iso');
assert.deepEqual([...directPng.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(directPng.length > 1000, true);

const { design, photoSet } = await generateSyntheticPhotoSet(scenarioPath, outDir);
assert.equal(design.template_id, 'two_step_stool');
assert.equal(photoSet.object_type, '');
assert.equal(photoSet.photos.length, 4);
assert.equal(photoSet.known_measurements.some((item) => item.label === 'overall width' && item.value_in === 16), true);
assert.equal(photoSet.source.source_design_path, join(outDir, 'source-design.json'));

for (const photo of photoSet.photos) {
  const png = await readFile(photo.path);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
}

console.log('synthetic photo set tests passed');
