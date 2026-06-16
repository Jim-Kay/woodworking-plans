import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { generateDesign, readJson, writeJson } from '../src/generated/sandbox.js';

export async function generateSyntheticPhotoSet(scenarioPath, outDir) {
  const scenario = await readJson(scenarioPath);
  const design = generateDesign(scenario);
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, 'source-design.json'), design);

  const views = [
    { id: 'front', label: 'front elevation' },
    { id: 'side', label: 'right side elevation' },
    { id: 'top', label: 'top view' },
    { id: 'iso', label: 'isometric perspective' }
  ];
  const photos = [];
  for (const view of views) {
    const file = join(outDir, `${view.id}.png`);
    await writeFile(file, renderDesignPng(design, view.id));
    photos.push({
      photo_id: view.id,
      view: view.label,
      path: file,
      description: `Synthetic ${view.label} rendered from a hidden canonical woodworking design.`
    });
  }

  const photoSet = {
    photo_set_id: `${design.design_id}_synthetic`,
    object_type: '',
    known_measurements: measurementsForDesign(design),
    photos,
    source: {
      type: 'synthetic',
      source_design_path: join(outDir, 'source-design.json'),
      note: 'Generated images are the only visual evidence the local vision model should use; source-design.json is the answer key for evaluation.'
    }
  };

  await writeJson(join(outDir, 'photo-set.json'), photoSet);
  return { design, photoSet };
}

export function renderDesignPng(design, view = 'iso', options = {}) {
  const canvas = new Canvas(options.width || 960, options.height || 720, [13, 18, 29, 255]);
  canvas.grid([33, 48, 70, 255], 48);
  const parts = (design.parts || []).filter((part) => part.physical !== false);
  const bounds = boundsForParts(parts);
  const projector = createProjector(view, bounds, canvas.width, canvas.height);
  if (view === 'iso') {
    for (const part of parts.toSorted((a, b) => sortKey(a) - sortKey(b))) drawIsoBox(canvas, part, projector);
  } else {
    for (const part of parts.toSorted((a, b) => depthKey(a, view) - depthKey(b, view))) drawOrthographicBox(canvas, part, projector, view);
  }
  canvas.strokeRect(18, 18, canvas.width - 36, canvas.height - 36, [79, 103, 137, 255]);
  return encodePng(canvas.width, canvas.height, canvas.data);
}

function measurementsForDesign(design) {
  const params = design.parameters || {};
  const labels = [
    ['overall width', params.width_in],
    ['overall depth', params.depth_in],
    ['overall height', params.height_in],
    ['lower step height', params.lower_step_height_in],
    ['leg width', params.leg_width_in],
    ['leg depth', params.leg_depth_in]
  ];
  return labels
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([label, value]) => ({ label, value_in: Number(value), source: 'synthetic answer-key measurement' }));
}

function drawOrthographicBox(canvas, part, project, view) {
  const range = partRange(part);
  const corners = faceCorners(range, view).map(project);
  canvas.fillPolygon(corners, colorForPart(part, 0));
  canvas.strokePolygon(corners, [31, 41, 55, 255]);
}

function drawIsoBox(canvas, part, project) {
  const r = partRange(part);
  const top = [[r.minX, r.minY, r.maxZ], [r.maxX, r.minY, r.maxZ], [r.maxX, r.maxY, r.maxZ], [r.minX, r.maxY, r.maxZ]].map(project);
  const right = [[r.maxX, r.minY, r.minZ], [r.maxX, r.maxY, r.minZ], [r.maxX, r.maxY, r.maxZ], [r.maxX, r.minY, r.maxZ]].map(project);
  const front = [[r.minX, r.minY, r.minZ], [r.maxX, r.minY, r.minZ], [r.maxX, r.minY, r.maxZ], [r.minX, r.minY, r.maxZ]].map(project);
  canvas.fillPolygon(right, colorForPart(part, -24));
  canvas.strokePolygon(right, [31, 41, 55, 255]);
  canvas.fillPolygon(front, colorForPart(part, -8));
  canvas.strokePolygon(front, [31, 41, 55, 255]);
  canvas.fillPolygon(top, colorForPart(part, 26));
  canvas.strokePolygon(top, [31, 41, 55, 255]);
}

function createProjector(view, bounds, width, height) {
  const margin = 88;
  const points = cornersForBounds(bounds).map(([x, y, z]) => rawProject(view, x, y, z));
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min((width - margin * 2) / Math.max(1, maxX - minX), (height - margin * 2) / Math.max(1, maxY - minY));
  const offsetX = (width - (minX + maxX) * scale) / 2;
  const offsetY = (height - (minY + maxY) * scale) / 2;
  return ([x, y, z]) => {
    const point = rawProject(view, x, y, z);
    return { x: point.x * scale + offsetX, y: point.y * scale + offsetY };
  };
}

function rawProject(view, x, y, z) {
  if (view === 'front') return { x, y: -z };
  if (view === 'side') return { x: y, y: -z };
  if (view === 'top') return { x, y };
  return { x: (x - y) * 0.866, y: (x + y) * 0.38 - z };
}

function faceCorners(r, view) {
  if (view === 'front') return [[r.minX, r.minY, r.minZ], [r.maxX, r.minY, r.minZ], [r.maxX, r.minY, r.maxZ], [r.minX, r.minY, r.maxZ]];
  if (view === 'side') return [[r.maxX, r.minY, r.minZ], [r.maxX, r.maxY, r.minZ], [r.maxX, r.maxY, r.maxZ], [r.maxX, r.minY, r.maxZ]];
  return [[r.minX, r.minY, r.maxZ], [r.maxX, r.minY, r.maxZ], [r.maxX, r.maxY, r.maxZ], [r.minX, r.maxY, r.maxZ]];
}

function boundsForParts(parts) {
  const ranges = parts.map(partRange);
  return {
    minX: Math.min(...ranges.map((r) => r.minX)),
    maxX: Math.max(...ranges.map((r) => r.maxX)),
    minY: Math.min(...ranges.map((r) => r.minY)),
    maxY: Math.max(...ranges.map((r) => r.maxY)),
    minZ: Math.min(...ranges.map((r) => r.minZ)),
    maxZ: Math.max(...ranges.map((r) => r.maxZ))
  };
}

function cornersForBounds(r) {
  return [
    [r.minX, r.minY, r.minZ],
    [r.maxX, r.minY, r.minZ],
    [r.minX, r.maxY, r.minZ],
    [r.maxX, r.maxY, r.minZ],
    [r.minX, r.minY, r.maxZ],
    [r.maxX, r.minY, r.maxZ],
    [r.minX, r.maxY, r.maxZ],
    [r.maxX, r.maxY, r.maxZ]
  ];
}

function partRange(part) {
  return {
    minX: part.position.x - part.size.x / 2,
    maxX: part.position.x + part.size.x / 2,
    minY: part.position.y - part.size.y / 2,
    maxY: part.position.y + part.size.y / 2,
    minZ: part.position.z - part.size.z / 2,
    maxZ: part.position.z + part.size.z / 2
  };
}

function sortKey(part) {
  return part.position.x + part.position.y + part.position.z * 0.1;
}

function depthKey(part, view) {
  if (view === 'front') return part.position.y;
  if (view === 'side') return -part.position.x;
  return part.position.z;
}

function colorForPart(part, delta = 0) {
  const palette = {
    tread: [176, 126, 67],
    leg: [125, 80, 42],
    rail: [146, 91, 46]
  };
  const base = palette[part.role] || [158, 111, 60];
  return [...base.map((value) => clamp(value + delta, 0, 255)), 255];
}

class Canvas {
  constructor(width, height, bg) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i += 1) this.setPixelIndex(i, bg);
  }

  grid(color, step) {
    for (let x = 0; x < this.width; x += step) this.line(x, 0, x, this.height - 1, color);
    for (let y = 0; y < this.height; y += step) this.line(0, y, this.width - 1, y, color);
  }

  fillPolygon(points, color) {
    const ys = points.map((p) => p.y);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...ys)));
    for (let y = minY; y <= maxY; y += 1) {
      const xs = [];
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i += 2) {
        const start = Math.max(0, Math.floor(xs[i]));
        const end = Math.min(this.width - 1, Math.ceil(xs[i + 1]));
        for (let x = start; x <= end; x += 1) this.pixel(x, y, color);
      }
    }
  }

  strokePolygon(points, color) {
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      this.line(a.x, a.y, b.x, b.y, color);
    }
  }

  strokeRect(x, y, w, h, color) {
    this.line(x, y, x + w, y, color);
    this.line(x + w, y, x + w, y + h, color);
    this.line(x + w, y + h, x, y + h, color);
    this.line(x, y + h, x, y, color);
  }

  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      this.pixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * error;
      if (e2 >= dy) { error += dy; x0 += sx; }
      if (e2 <= dx) { error += dx; y0 += sy; }
    }
  }

  pixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.setPixelIndex(y * this.width + x, color);
  }

  setPixelIndex(index, color) {
    const offset = index * 4;
    this.data[offset] = color[0];
    this.data[offset + 1] = color[1];
    this.data[offset + 2] = color[2];
    this.data[offset + 3] = color[3];
  }
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const chunks = [
    chunk('IHDR', Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0))
  ];
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

function chunk(type, data) {
  const name = Buffer.from(type);
  return Buffer.concat([u32(data.length), name, data, u32(crc32(Buffer.concat([name, data])) >>> 0)]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [scenarioPath, outDir = 'generated/runs/synthetic-photo-set'] = process.argv.slice(2);
  if (!scenarioPath) {
    console.error([
      'Usage:',
      '  node scripts/generate-synthetic-photo-set.mjs scenario.json [out-dir]',
      '',
      'Creates deterministic front, side, top, and isometric PNG reference images plus photo-set.json.'
    ].join('\n'));
    process.exit(1);
  }
  try {
    const result = await generateSyntheticPhotoSet(scenarioPath, outDir);
    console.log([
      `design=${result.design.design_id}`,
      `template=${result.design.template_id}`,
      `out_dir=${outDir}`,
      `photos=${result.photoSet.photos.length}`,
      `photo_set=${join(outDir, 'photo-set.json')}`
    ].join('\n'));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
