export function partBounds(part) {
  const [x = 0, y = 0, z = 0] = vectorValues(part.position_in || part.position);
  const [w = 0, h = 0, d = 0] = vectorValues(part.size_in || part.size);

  return {
    min: [x - w / 2, y - h / 2, z - d / 2],
    max: [x + w / 2, y + h / 2, z + d / 2]
  };
}

export function boundsOverlap(a, b, tolerance = 0.001) {
  const aBounds = partBounds(a);
  const bBounds = partBounds(b);

  return [0, 1, 2].every((axis) =>
    aBounds.min[axis] < bBounds.max[axis] - tolerance &&
    aBounds.max[axis] > bBounds.min[axis] + tolerance
  );
}

export function findComponentOverlaps(assembly, options = {}) {
  const tolerance = options.tolerance ?? 0.001;
  const limit = options.limit ?? 50;
  const parts = (assembly?.parts || []).filter((part) => !isFastenerPart(part));
  const overlaps = [];

  for (let i = 0; i < parts.length; i += 1) {
    for (let j = i + 1; j < parts.length; j += 1) {
      const first = parts[i];
      const second = parts[j];
      const depth = overlapDepth(partBounds(first), partBounds(second));
      if (!depth || depth.some((value) => value <= tolerance)) continue;

      overlaps.push({
        type: 'overlap',
        severity: 'warning',
        partIds: [partId(first), partId(second)],
        partNames: [partName(first), partName(second)],
        groups: [partGroup(first), partGroup(second)],
        depth,
        volume: depth[0] * depth[1] * depth[2],
        message: `${partName(first)} overlaps ${partName(second)}.`
      });
    }
  }

  return {
    count: overlaps.length,
    items: overlaps.slice(0, limit),
    hidden: Math.max(0, overlaps.length - limit)
  };
}

export function groupParts(parts = []) {
  return parts.reduce((groups, part) => {
    const key = part.group || part.role || 'parts';
    if (!groups[key]) groups[key] = [];
    groups[key].push(part);
    return groups;
  }, {});
}

export function validateAssembly(assembly, options = {}) {
  const warnings = [];
  const componentOverlaps = findComponentOverlaps(assembly, options);
  warnings.push(...componentOverlaps.items);

  return warnings;
}

export function isFastenerPart(part) {
  const group = partGroup(part);
  return part?.material === 'fastener' || group === 'fastener' || group === 'fasteners';
}

function vectorValues(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value.x, value.y, value.z];
  return [0, 0, 0];
}

function overlapDepth(aBounds, bBounds) {
  const depth = [0, 1, 2].map((axis) => Math.min(aBounds.max[axis], bBounds.max[axis]) - Math.max(aBounds.min[axis], bBounds.min[axis]));
  return depth.every((value) => value > 0) ? depth : null;
}

function partId(part) {
  return part?.part_id || part?.id || part?.role || 'part';
}

function partName(part) {
  return part?.name || part?.role || partId(part);
}

function partGroup(part) {
  return part?.group || part?.meta?.group || part?.role || 'parts';
}

export function nudgeOpenScadFastenerHeads(scad, clearance = 0.015) {
  return scad.replace(
    /translate\(\[pos\[0\], pos\[1\], pos\[2\] ([+-]) head_h \/ 2\]\)(\s*\n\s*cylinder\(h = head_h, d = head_d, center = true\);)/g,
    `translate([pos[0], pos[1], pos[2] - ${clearance} - head_h / 2])$2`
  );
}

export function addCustomizerPartLabels(scad) {
  const lines = scad.split('\n');
  const output = [];
  let pendingLabel = null;

  for (const line of lines) {
    output.push(line);

    const jsonMatch = line.match(/^\s*\{"part_id":"([^"]+)".*"position_in":\[(.*?)\]/);
    if (jsonMatch) {
      pendingLabel = {
        id: jsonMatch[1],
        pos: jsonMatch[2]
      };
      continue;
    }

    if (pendingLabel && line.trim().endsWith(');')) {
      output.push(`part_label("${pendingLabel.id}", [${pendingLabel.pos}]);`);
      pendingLabel = null;
    }
  }

  return output.join('\n');
}
