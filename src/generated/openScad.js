export function generateCanonicalOpenScad(design) {
  const physicalParts = (design.parts || []).filter((part) => part.physical !== false);
  const referenceParts = (design.parts || []).filter((part) => part.physical === false);
  return [
    '// Generated OpenSCAD model from canonical design',
    `// design_json: ${JSON.stringify({ design_id: design.design_id, template_id: design.template_id, units: design.units, part_count: physicalParts.length })}`,
    '// Units are inches. OpenSCAD axes are X = width, Y = depth, Z = height.',
    '',
    '$fn = 32;',
    'inch = 25.4;',
    'show_references = true;',
    '',
    'module board(size, pos, color_value) {',
    '  color(color_value) translate(pos) cube(size, center = true);',
    '}',
    '',
    'module reference_cylinder(size, pos) {',
    '  if (show_references)',
    '    color([0.1, 0.35, 0.85, 0.35]) translate(pos) cylinder(h = size[2], d = max(size[0], size[1]), center = true);',
    '}',
    '',
    'module generated_model() {',
    ...physicalParts.flatMap((part) => partToScad(part)),
    ...referenceParts.flatMap((part) => referenceToScad(part)),
    '}',
    '',
    'scale([inch, inch, inch]) generated_model();',
    ''
  ].join('\n');
}

function partToScad(part) {
  const meta = {
    part_id: part.id,
    role: part.role,
    material: part.material,
    size_in: [part.size.x, part.size.y, part.size.z],
    position_in: [part.position.x, part.position.y, part.position.z]
  };
  return [
    `  // part_json: ${JSON.stringify(meta)}`,
    `  board(${vector(part.size)}, ${vector(part.position)}, ${colorForPart(part)});`
  ];
}

function referenceToScad(part) {
  const meta = {
    part_id: part.id,
    role: part.role,
    exported_as: 'machining reference',
    size_in: [part.size.x, part.size.y, part.size.z],
    position_in: [part.position.x, part.position.y, part.position.z]
  };
  return [
    `  // reference_json: ${JSON.stringify(meta)}`,
    `  reference_cylinder(${vector(part.size)}, ${vector(part.position)});`
  ];
}

function vector(value) {
  return `[${[value.x, value.y, value.z].map(scadNumber).join(', ')}]`;
}

function scadNumber(value) {
  return Number(value).toFixed(4).replace(/\.?0+$/, '');
}

function colorForPart(part) {
  if (part.role === 'panel') return '[0.72, 0.55, 0.32, 1]';
  if (part.role === 'rail') return '[0.56, 0.36, 0.18, 1]';
  return '[0.68, 0.48, 0.28, 1]';
}
