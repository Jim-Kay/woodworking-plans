import { addCustomizerPartLabels, nudgeOpenScadFastenerHeads } from './assembly.js';

export function generateOpenScad(plan, result) {
  if (result.type === 'generated' && result.openscad) {
    return result.openscad;
  }
  if (result.type === 'shelves' && result.assembly?.parts?.length) {
    return refineOpenScadExport(nudgeOpenScadFastenerHeads(generateShelfOpenScad(plan, result)));
  }
  if (result.ok && Number.isFinite(result.outerW) && Number.isFinite(result.outerH)) {
    return refineOpenScadExport(nudgeOpenScadFastenerHeads(generateFrameOpenScad(plan, result)));
  }
  {
    return [
      '// OpenSCAD export is currently available for assembly-backed plans.',
      '// Select a supported plan to generate CAD code.'
    ].join('\n');
  }
}

function refineOpenScadExport(scad) {
  const refined = scad
    .replace(
      'show_guides = true;',
      [
        'show_guides = true;',
        'show_part_labels = false;',
        'label_size = 0.45;'
      ].join('\n')
    )
    .replace(
      'module board(size, pos, color_value) {',
      [
        'module part_label(label, pos) {',
        '  if (show_part_labels)',
        '    color([0.05, 0.08, 0.1, 1])',
        '      translate([pos[0], pos[1], pos[2] + 0.04])',
        '        linear_extrude(height = 0.02)',
        '          text(label, size = label_size, halign = "center", valign = "center");',
        '}',
        '',
        'module board(size, pos, color_value) {'
      ].join('\n')
    );
  return addCustomizerPartLabels(refined);
}

function generateShelfOpenScad(plan, result) {
  const parts = result.assembly.parts;
  const metadata = {
    plan_id: plan.plan || 'basement-shelves',
    plan_type: result.type,
    units: result.assembly.units || 'in',
    generated_by: 'wood plan builder',
    dimensions_in: {
      width: result.shelfW,
      height: result.shelfH,
      depth: result.shelfD
    },
    part_count: parts.length,
    connection_count: result.assembly.connections.length
  };
  return [
    '// Generated OpenSCAD model',
    `// plan_json: ${JSON.stringify(metadata)}`,
    '// Units are inches. OpenSCAD axes are X = width, Y = depth, Z = height.',
    '// Scale at the bottom converts inches to millimeters for OpenSCAD preview/export.',
    '',
    '$fn = 24;',
    'inch = 25.4;',
    '',
    'module board(size, pos, color_value) {',
    '  color(color_value)',
    '    translate(pos)',
    '      cube(size, center = true);',
    '}',
    '',
    'module miter_board(size, pos, color_value, side) {',
    '  l = size[0];',
    '  w = size[1];',
    '  h = size[2];',
    '  points = side == "top" ? [[-l/2, w/2], [l/2, w/2], [l/2 - w, -w/2], [-l/2 + w, -w/2]] :',
    '    side == "bottom" ? [[-l/2, -w/2], [l/2, -w/2], [l/2 - w, w/2], [-l/2 + w, w/2]] :',
    '    side == "left" ? [[-w/2, -l/2], [-w/2, l/2], [w/2, l/2 - w], [w/2, -l/2 + w]] :',
    '    [[w/2, -l/2], [w/2, l/2], [-w/2, l/2 - w], [-w/2, -l/2 + w]];',
    '  color(color_value)',
    '    translate([pos[0], pos[1], pos[2] - h/2])',
    '      linear_extrude(height = h)',
    '        polygon(points);',
    '}',
    '',
    'module screw(size, pos) {',
    '  color([0.08, 0.09, 0.1])',
    '    translate(pos)',
    '      cube(size, center = true);',
    '}',
    '',
    'module pocket_marker(pos, major, minor, axis) {',
    '  color([0.03, 0.04, 0.05, 1])',
    '    translate(pos)',
    '      rotate(axis == "x" ? [0, 90, 0] : [90, 0, 0])',
    '        scale([major / 2, minor / 2, 0.01])',
    '          cylinder(h = 0.02, r = 1, center = true);',
    '}',
    '',
    'module shelf_model() {',
    ...parts.flatMap((part) => partToScad(part)),
    '}',
    '',
    'scale([inch, inch, inch]) shelf_model();',
    ''
  ].join('\n');
}

function partToScad(part) {
  const moduleName = part.material === 'fastener' ? 'screw' : 'board';
  const color = part.material === 'fastener'
    ? null
    : part.meta?.group === 'posts'
      ? '[0.66, 0.52, 0.32]'
      : part.meta?.group === 'slats'
        ? '[0.73, 0.58, 0.38]'
        : '[0.42, 0.25, 0.16]';
  const meta = {
    part_id: part.id,
    role: part.role,
    material: part.material,
    group: part.meta?.group,
    size_in: [part.size.x, part.size.y, part.size.z],
    position_in: [part.position.x, part.position.y, part.position.z],
    openscad_size_in: cadVector(part.size),
    openscad_position_in: cadVector(part.position)
  };
  const args = [
    vector(cadVector(part.size)),
    vector(cadVector(part.position))
  ];
  if (color) args.push(color);
  const lines = [
    `  // part_json: ${JSON.stringify(meta)}`,
    `  ${moduleName}(${args.join(', ')});`
  ];
  if (part.meta?.pocket?.position) {
    const pocket = part.meta.pocket;
    const pocketPosition = cadVector(pocket.position);
    const axis = pocket.faceAxis === 'x' ? 'x' : 'y';
    const normalOffset = 0.012 * (pocket.faceDirection || 1);
    if (axis === 'x') pocketPosition[0] += normalOffset;
    if (axis === 'y') pocketPosition[1] += normalOffset;
    lines.push(`  pocket_marker(${vector(pocketPosition)}, ${scadNumber(pocket.size?.major || 0.52)}, ${scadNumber(pocket.size?.minor || 0.24)}, "${axis}");`);
  }
  return lines;
}

function generateFrameOpenScad(plan, result) {
  const parts = result.assembly?.type === 'floating-frame' ? result.assembly.parts : buildFrameScadParts(plan, result);
  const metadata = {
    plan_id: plan.plan || (plan.build === 'strainer' ? 'floating-frame-strainer' : 'floating-frame-liner'),
    plan_type: 'floating-frame',
    build: plan.build === 'strainer' ? 'strainer' : 'liner',
    units: 'in',
    generated_by: 'wood plan builder',
    dimensions_in: {
      outer_width: result.outerW,
      outer_height: result.outerH,
      depth: plan.depth,
      face_lip: plan.faceLip || 0
    },
    part_count: parts.length
  };
  return [
    '// Generated OpenSCAD model',
    `// plan_json: ${JSON.stringify(metadata)}`,
    '// Units are inches. OpenSCAD axes are X = frame width, Y = frame height, Z = front/back depth.',
    '// Scale at the bottom converts inches to millimeters for OpenSCAD preview/export.',
    '',
    '$fn = 32;',
    'inch = 25.4;',
    'show_face = true;',
    'show_support = true;',
    'show_canvas = true;',
    'show_stretchers = true;',
    'show_spacers = true;',
    'show_hardware = true;',
    'show_guides = true;',
    '',
    'module board(size, pos, color_value) {',
    '  color(color_value)',
    '    translate(pos)',
    '      cube(size, center = true);',
    '}',
    '',
    'module miter_board(size, pos, color_value, side) {',
    '  l = size[0];',
    '  w = size[1];',
    '  h = size[2];',
    '  points = side == "top" ? [[-l/2, w/2], [l/2, w/2], [l/2 - w, -w/2], [-l/2 + w, -w/2]] :',
    '    side == "bottom" ? [[-l/2, -w/2], [l/2, -w/2], [l/2 - w, w/2], [-l/2 + w, w/2]] :',
    '    side == "left" ? [[-w/2, -l/2], [-w/2, l/2], [w/2, l/2 - w], [w/2, -l/2 + w]] :',
    '    [[w/2, -l/2], [w/2, l/2], [-w/2, l/2 - w], [-w/2, -l/2 + w]];',
    '  color(color_value)',
    '    translate([pos[0], pos[1], pos[2] - h/2])',
    '      linear_extrude(height = h)',
    '        polygon(points);',
    '}',
    '',
    'module fastener(size, pos, color_value) {',
    '  shank_d = max(size[0], size[1]);',
    '  shank_l = size[2];',
    '  head_d = shank_d * 4;',
    '  head_h = min(0.1, max(0.04, shank_l * 0.16));',
    '  head_proud = 0.01;',
    '  color(color_value) {',
    '    translate([pos[0], pos[1], pos[2] + shank_l / 2])',
    '      cylinder(h = shank_l, d = shank_d, center = true);',
    '    translate([pos[0], pos[1], pos[2] - head_proud - head_h / 2])',
    '      cylinder(h = head_h, d = head_d, center = true);',
  '  }',
    '}',
    '',
    'module frame_model() {',
    ...parts.flatMap((part) => framePartToScad(part)),
    '}',
    '',
    'scale([inch, inch, inch]) frame_model();',
    ''
  ].join('\n');
}

function buildFrameScadParts(plan, result) {
  const parts = [];
  const outerW = result.outerW;
  const outerH = result.outerH;
  const face = positiveNumber(plan.face, 0);
  const reveal = positiveNumber(plan.reveal, 0);
  const canvasW = positiveNumber(plan.canvasW, 0);
  const canvasH = positiveNumber(plan.canvasH, 0);
  const canvasT = positiveNumber(plan.canvasT, 0);
  const stretcherW = positiveNumber(plan.stretcherW, 0);
  const frameDepth = positiveNumber(plan.depth, canvasT);
  const faceLip = positiveNumber(plan.faceLip, 0);
  const faceDepth = frameDepth + faceLip;
  const innerW = result.innerW || canvasW + reveal * 2;
  const innerH = result.innerH || canvasH + reveal * 2;
  const canvasTop = frameDepth;
  const supportHeight = Math.max(0.001, frameDepth - canvasT);
  const supportTop = supportHeight;
  const supportCenterZ = supportHeight / 2;

  const mitered = plan.join !== 'butt';
  addPart(parts, 'face.top', 'Face rail - top', 'face', [outerW, face, faceDepth], [0, outerH / 2 - face / 2, faceDepth / 2], woodColor('face', 'top'), { miterSide: mitered ? 'top' : null });
  addPart(parts, 'face.bottom', 'Face rail - bottom', 'face', [outerW, face, faceDepth], [0, -outerH / 2 + face / 2, faceDepth / 2], woodColor('face', 'bottom'), { miterSide: mitered ? 'bottom' : null });
  addPart(parts, 'face.left', 'Face rail - left', 'face', [outerH, face, faceDepth], [-outerW / 2 + face / 2, 0, faceDepth / 2], woodColor('face', 'left'), { miterSide: mitered ? 'left' : null });
  addPart(parts, 'face.right', 'Face rail - right', 'face', [outerH, face, faceDepth], [outerW / 2 - face / 2, 0, faceDepth / 2], woodColor('face', 'right'), { miterSide: mitered ? 'right' : null });

  if (plan.build === 'strainer') {
    const strainerWidth = Math.max(0.001, positiveNumber(plan.stretcherW, 1.5));
    const strainerT = Math.max(0.001, positiveNumber(plan.strainerDepth, result.supportThickness || 0.5));
    const z = Math.max(strainerT / 2, supportTop - strainerT / 2);
    const rabbet = Math.max(0.001, positiveNumber(plan.rabbet, 0.125));
    const seatW = Math.max(0.001, innerW + rabbet * 2);
    const seatH = Math.max(0.001, innerH + rabbet * 2);
    const strainerOuterW = Math.max(0.001, innerW);
    const strainerOuterH = Math.max(0.001, innerH);
    addPart(parts, 'strainer.top', 'Strainer rail - top', 'support', [strainerOuterW, strainerWidth, strainerT], [0, strainerOuterH / 2 - strainerWidth / 2, z], woodColor('support', 'top'), { miterSide: mitered ? 'top' : null });
    addPart(parts, 'strainer.bottom', 'Strainer rail - bottom', 'support', [strainerOuterW, strainerWidth, strainerT], [0, -strainerOuterH / 2 + strainerWidth / 2, z], woodColor('support', 'bottom'), { miterSide: mitered ? 'bottom' : null });
    addPart(parts, 'strainer.left', 'Strainer rail - left', 'support', [strainerOuterH, strainerWidth, strainerT], [-strainerOuterW / 2 + strainerWidth / 2, 0, z], woodColor('support', 'left'), { miterSide: mitered ? 'left' : null });
    addPart(parts, 'strainer.right', 'Strainer rail - right', 'support', [strainerOuterH, strainerWidth, strainerT], [strainerOuterW / 2 - strainerWidth / 2, 0, z], woodColor('support', 'right'), { miterSide: mitered ? 'right' : null });
    addPart(parts, 'rabbet.ledge.top', 'Face rabbet ledge - top', 'guide', [seatW, rabbet, 0.035], [0, seatH / 2 - rabbet / 2, supportTop], [0.2, 0.8, 0.35, 0.28]);
    addPart(parts, 'rabbet.ledge.bottom', 'Face rabbet ledge - bottom', 'guide', [seatW, rabbet, 0.035], [0, -seatH / 2 + rabbet / 2, supportTop], [0.2, 0.8, 0.35, 0.28]);
    addPart(parts, 'rabbet.ledge.left', 'Face rabbet ledge - left', 'guide', [rabbet, innerH, 0.035], [-seatW / 2 + rabbet / 2, 0, supportTop], [0.2, 0.8, 0.35, 0.28]);
    addPart(parts, 'rabbet.ledge.right', 'Face rabbet ledge - right', 'guide', [rabbet, innerH, 0.035], [seatW / 2 - rabbet / 2, 0, supportTop], [0.2, 0.8, 0.35, 0.28]);
  } else {
    const linerW = Math.max(0.001, positiveNumber(plan.linerW, reveal + stretcherW));
    const linerLong = Math.max(0.001, innerH);
    const linerShort = mitered ? Math.max(0.001, innerW) : Math.max(0.001, innerW - linerW * 2);
    addPart(parts, 'liner.top', 'Liner rail - top', 'support', [linerShort, linerW, supportHeight], [0, innerH / 2 - linerW / 2, supportCenterZ], woodColor('support', 'top'), { miterSide: mitered ? 'top' : null });
    addPart(parts, 'liner.bottom', 'Liner rail - bottom', 'support', [linerShort, linerW, supportHeight], [0, -innerH / 2 + linerW / 2, supportCenterZ], woodColor('support', 'bottom'), { miterSide: mitered ? 'bottom' : null });
    addPart(parts, 'liner.left', 'Liner rail - left', 'support', [linerLong, linerW, supportHeight], [-innerW / 2 + linerW / 2, 0, supportCenterZ], woodColor('support', 'left'), { miterSide: mitered ? 'left' : null });
    addPart(parts, 'liner.right', 'Liner rail - right', 'support', [linerLong, linerW, supportHeight], [innerW / 2 - linerW / 2, 0, supportCenterZ], woodColor('support', 'right'), { miterSide: mitered ? 'right' : null });
  }

  addPart(parts, 'canvas.front', 'Canvas surface', 'canvas', [canvasW, canvasH, 0.06], [0, 0, canvasTop - 0.03], [0.92, 0.9, 0.84, 0.92]);
  addPart(parts, 'canvas.body', 'Canvas wrapped edge volume', 'canvas', [canvasW, canvasH, canvasT], [0, 0, canvasTop - canvasT / 2], [0.83, 0.86, 0.82, 0.45]);

  const stretcherZ = canvasTop - canvasT / 2;
  addPart(parts, 'stretcher.top', 'Canvas stretcher - top', 'stretcher', [canvasW, stretcherW, canvasT * 0.82], [0, canvasH / 2 - stretcherW / 2, stretcherZ], woodColor('stretcher', 'top'));
  addPart(parts, 'stretcher.bottom', 'Canvas stretcher - bottom', 'stretcher', [canvasW, stretcherW, canvasT * 0.82], [0, -canvasH / 2 + stretcherW / 2, stretcherZ], woodColor('stretcher', 'bottom'));
  addPart(parts, 'stretcher.left', 'Canvas stretcher - left', 'stretcher', [stretcherW, canvasH, canvasT * 0.82], [-canvasW / 2 + stretcherW / 2, 0, stretcherZ], woodColor('stretcher', 'left'));
  addPart(parts, 'stretcher.right', 'Canvas stretcher - right', 'stretcher', [stretcherW, canvasH, canvasT * 0.82], [canvasW / 2 - stretcherW / 2, 0, stretcherZ], woodColor('stretcher', 'right'));

  const spacer = Math.max(0.06, reveal);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], index) => {
    addPart(parts, `spacer.${index + 1}`, 'Reveal spacer block', 'spacer', [spacer, spacer, spacer], [sx * innerW / 2, sy * innerH / 2, supportTop + spacer / 2], [0.58, 0.7, 0.86, 0.78]);
  });

  if (plan.mountMethod !== 'none') {
    const screwTop = plan.build === 'strainer' ? Math.max(0, supportTop - strainerTForPlan(plan, result)) : 0;
    const screwLength = Math.min(Math.max(0.35, supportTop - screwTop + canvasT * 0.5), Math.max(0.35, frameDepth - screwTop));
    const screwSize = [0.12, 0.12, screwLength];
    const z = screwTop;
    const screwInset = Math.max(stretcherW / 2, reveal + stretcherW / 2);
    const positions = [
      [0, -innerH / 2 + screwInset, z],
      [0, innerH / 2 - screwInset, z],
      [-innerW / 2 + screwInset, 0, z],
      [innerW / 2 - screwInset, 0, z]
    ];
    positions.forEach((position, index) => addPart(parts, `fastener.${index + 1}`, 'Mounting fastener placeholder', 'fastener', screwSize, position, [0.08, 0.09, 0.1, 1]));
  }

  return parts;
}

function strainerTForPlan(plan, result) {
  return Math.max(0.001, positiveNumber(plan.strainerDepth, result.supportThickness || 0.5));
}

function addPart(parts, id, role, group, size, position, color, options = {}) {
  parts.push({ id, role, group, size, position, color, ...options });
}

function framePartToScad(part) {
  if (!Array.isArray(part.size)) return frameAssemblyPartToScad(part);

  const meta = {
    part_id: part.id,
    role: part.role,
    group: part.group,
    exported_as: part.group === 'guide' ? 'machining reference' : 'physical part',
    shape: part.miterSide ? `mitered ${part.miterSide} rail` : 'rectangular solid',
    size_in: part.size,
    position_in: part.position
  };
  const moduleName = part.group === 'fastener' ? 'fastener' : 'board';
  const guard = visibilityGuard(part.group);
  if (part.miterSide) {
    return [
      `  // part_json: ${JSON.stringify(meta)}`,
      `  if (${guard}) miter_board(${vector(part.size)}, ${vector(part.position)}, ${vector(part.color)}, "${part.miterSide}");`
    ];
  }
  return [
    `  // part_json: ${JSON.stringify(meta)}`,
    `  if (${guard}) ${moduleName}(${vector(part.size)}, ${vector(part.position)}, ${vector(part.color)});`
  ];
}

function frameAssemblyPartToScad(part) {
  const group = part.meta?.group || part.material;
  const miterSide = part.meta?.miterSide;
  const color = colorForAssemblyFramePart(part);
  const size = frameAssemblyScadSize(part);
  const position = part.material === 'fastener' && part.meta?.start
    ? cadVector(part.meta.start)
    : cadVector(part.position);
  const meta = {
    part_id: part.id,
    role: part.role,
    group,
    exported_as: group === 'guide' || group === 'spacer' ? 'machining/reference part' : 'physical part',
    shape: miterSide ? `mitered ${miterSide} rail` : part.material === 'fastener' ? 'fastener' : 'rectangular solid',
    size_in: [part.size.x, part.size.y, part.size.z],
    position_in: position
  };
  const moduleName = part.material === 'fastener' ? 'fastener' : miterSide ? 'miter_board' : 'board';
  const guard = visibilityGuard(group);
  const args = [vector(size), vector(position), vector(color)];
  if (miterSide) args.push(`"${miterSide}"`);
  return [
    `  // part_json: ${JSON.stringify(meta)}`,
    `  if (${guard}) ${moduleName}(${args.join(', ')});`
  ];
}

function frameAssemblyScadSize(part) {
  const side = part.meta?.miterSide;
  if (side === 'left' || side === 'right') {
    return [part.size.z, part.size.x, part.size.y];
  }
  return cadVector(part.size);
}

function colorForAssemblyFramePart(part) {
  const group = part.meta?.group || part.material;
  const side = part.meta?.side || '';
  if (group === 'canvas') {
    return part.id === 'canvas.front' ? [0.92, 0.9, 0.84, 0.92] : [0.83, 0.86, 0.82, 0.45];
  }
  if (group === 'spacer') return [0.58, 0.7, 0.86, 0.78];
  if (group === 'guide') return [0.2, 0.8, 0.35, 0.28];
  if (group === 'fastener') return [0.08, 0.09, 0.1, 1];
  return woodColor(part.meta?.colorGroup || group, side);
}

function visibilityGuard(group) {
  if (group === 'face') return 'show_face';
  if (group === 'support') return 'show_support';
  if (group === 'guide') return 'show_guides';
  if (group === 'canvas') return 'show_canvas';
  if (group === 'stretcher') return 'show_stretchers';
  if (group === 'spacer') return 'show_spacers';
  if (group === 'fastener') return 'show_hardware';
  return 'true';
}

function woodColor(group, side = '') {
  const palettes = {
    face: {
      top: [0.46, 0.27, 0.14, 1],
      bottom: [0.52, 0.32, 0.18, 1],
      left: [0.4, 0.24, 0.13, 1],
      right: [0.57, 0.35, 0.2, 1]
    },
    support: {
      top: [0.72, 0.55, 0.32, 1],
      bottom: [0.78, 0.61, 0.37, 1],
      left: [0.66, 0.5, 0.29, 1],
      right: [0.82, 0.66, 0.42, 1]
    },
    stretcher: {
      top: [0.62, 0.46, 0.27, 1],
      bottom: [0.69, 0.52, 0.31, 1],
      left: [0.56, 0.41, 0.24, 1],
      right: [0.74, 0.57, 0.35, 1]
    }
  };
  return palettes[group]?.[side] || palettes[group]?.top || [0.72, 0.56, 0.34, 1];
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function cadVector(value) {
  return [value.x, value.z, value.y];
}

function vector(values) {
  return `[${values.map(scadNumber).join(', ')}]`;
}

function scadNumber(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, '');
}
