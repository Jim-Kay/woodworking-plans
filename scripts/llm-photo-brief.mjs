import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  PHOTO_DESIGN_BRIEF_SCHEMA,
  buildPhotoBriefMessages,
  normalizePhotoDesignBrief,
  summarizePhotoDesignBrief
} from '../src/generated/photoBrief.js';

const baseUrl = (process.env.LLM_VISION_BASE_URL || process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, '');
const model = process.env.LLM_VISION_MODEL || process.env.LLM_MODEL || '';
const numCtx = Number(process.env.LLM_VISION_NUM_CTX || process.env.LLM_NUM_CTX || 0);
const [photoSetPath, outPath = 'generated/photo-design-brief.json'] = process.argv.slice(2);

if (!photoSetPath || !model) {
  console.error([
    'Usage:',
    '  $env:LLM_VISION_MODEL="qwen2.5vl:7b"; node scripts/llm-photo-brief.mjs photo-set.json [brief.json]',
    '',
    'photo-set.json should include photo_set_id, optional known_measurements, and photos with path/url plus view labels.'
  ].join('\n'));
  process.exit(1);
}

const photoSet = JSON.parse(await readFile(photoSetPath, 'utf8'));
const imageDataUrls = await Promise.all((photoSet.photos || []).map(photoToDataUrl));
const raw = await runPhotoBrief(photoSet, imageDataUrls);
const brief = normalizePhotoDesignBrief(raw, { photoSet });
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(brief, null, 2)}\n`, 'utf8');
console.log(summaryText(brief));

async function runPhotoBrief(photoSetValue, imageUrls) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LLM_API_KEY || 'ollama'}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      ...(numCtx ? { options: { num_ctx: numCtx } } : {}),
      messages: buildPhotoBriefMessages(photoSetValue, imageUrls),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'photo_design_brief',
          strict: true,
          schema: PHOTO_DESIGN_BRIEF_SCHEMA
        }
      }
    })
  });
  if (!response.ok) throw new Error(`Photo brief failed with HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseJson(data.choices?.[0]?.message?.content || '');
}

async function photoToDataUrl(photo) {
  if (photo.data_url) return photo.data_url;
  if (photo.url && /^https?:\/\//i.test(photo.url)) return photo.url;
  const path = photo.path || photo.url;
  if (!path) throw new Error(`Photo ${photo.photo_id || photo.id || '(unknown)'} is missing path/url.`);
  const bytes = await readFile(path);
  return `data:${mimeType(path)};base64,${bytes.toString('base64')}`;
}

function mimeType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Photo brief response was not parseable JSON.');
    return JSON.parse(match[0]);
  }
}

function summaryText(brief) {
  const summary = summarizePhotoDesignBrief(brief);
  return [
    `model=${model}`,
    `photo_set=${summary.photo_set_id}`,
    `object_type=${summary.object_type}`,
    `confidence=${summary.confidence}`,
    `photos=${summary.photo_count}`,
    `parts=${summary.part_count}`,
    `component_searches=${summary.component_search_count}`,
    `uncertainties=${summary.uncertainty_count}`,
    `missing_capabilities=${summary.missing_capability_count}`
  ].join('\n');
}
