function normalizeBuild(build = 'liner') {
  if (build === 'two') return 'liner';
  if (build === 'one') return 'strainer';
  return build === 'strainer' ? 'strainer' : 'liner';
}

export function buildFrameAssembly(plan, result) {
  const buildKind = normalizeBuild(plan.build);
  const parts = [];
  const connections = [];
  const outerW = result.outerW;
  const outerH = result.outerH;
  const innerW = result.innerW || plan.canvasW + plan.reveal * 2;
  const innerH = result.innerH || plan.canvasH + plan.reveal * 2;
  const faceDepth = plan.depth + (plan.faceLip || 0);
  const supportDepth = Math.max(0.001, result.supportDepth ?? plan.depth - plan.canvasT);
  const supportThickness = Math.max(0.001, result.supportThickness ?? supportDepth);
  const supportBottom = Math.max(0, result.supportBottom ?? (buildKind === 'strainer' ? supportDepth - supportThickness : 0));
  const supportCenterY = buildKind === 'strainer' ? supportBottom + supportThickness / 2 : supportDepth / 2;
  const isMiter = plan.join !== 'butt';

  addRailSet(parts, {
    idPrefix: 'face',
    rolePrefix: 'Face rail',
    group: 'face',
    material: 'wood',
    outerW,
    outerH,
    railW: plan.face,
    depth: faceDepth,
    centerY: faceDepth / 2,
    miter: isMiter,
    colorGroup: 'face'
  });

  if (buildKind === 'strainer') {
    addRailSet(parts, {
      idPrefix: 'strainer',
      rolePrefix: 'Strainer rail',
      group: 'support',
      material: 'wood',
      outerW: innerW,
      outerH: innerH,
      railW: plan.linerW,
      depth: supportThickness,
      centerY: supportCenterY,
      miter: isMiter,
      colorGroup: 'support'
    });
    addRabbetGuides(parts, innerW, innerH, plan.rabbet || 0.125, supportBottom + supportThickness);
  } else {
    addRailSet(parts, {
      idPrefix: 'liner',
      rolePrefix: 'Liner rail',
      group: 'support',
      material: 'wood',
      outerW: innerW,
      outerH: innerH,
      railW: plan.linerW,
      depth: supportDepth,
      centerY: supportDepth / 2,
      miter: isMiter,
      colorGroup: 'support'
    });
  }

  addCanvasParts(parts, plan, supportDepth);
  addSpacerParts(parts, plan, innerW, innerH, buildKind === 'strainer' ? supportBottom + supportThickness : supportDepth);
  addFrameFasteners(parts, connections, plan, result, buildKind);

  return { type: 'floating-frame', units: 'in', parts, connections };
}

function addRailSet(parts, config) {
  const shortLength = config.miter ? config.outerW : Math.max(0.001, config.outerW - config.railW * 2);
  const longLength = config.outerH;
  const rails = [
    ['top', [shortLength, config.depth, config.railW], [0, config.centerY, config.outerH / 2 - config.railW / 2]],
    ['bottom', [shortLength, config.depth, config.railW], [0, config.centerY, -config.outerH / 2 + config.railW / 2]],
    ['left', [config.railW, config.depth, longLength], [-config.outerW / 2 + config.railW / 2, config.centerY, 0]],
    ['right', [config.railW, config.depth, longLength], [config.outerW / 2 - config.railW / 2, config.centerY, 0]]
  ];

  rails.forEach(([side, size, position]) => {
    parts.push(assemblyPart(
      `${config.idPrefix}.${side}`,
      `${config.rolePrefix} - ${side}`,
      config.material,
      size,
      position,
      { group: config.group, side, miterSide: config.miter ? side : null, colorGroup: config.colorGroup }
    ));
  });
}

function addRabbetGuides(parts, innerW, innerH, rabbet, z) {
  const seatW = innerW + rabbet * 2;
  const seatH = innerH + rabbet * 2;
  [
    ['top', [seatW, 0.035, rabbet], [0, z, seatH / 2 - rabbet / 2]],
    ['bottom', [seatW, 0.035, rabbet], [0, z, -seatH / 2 + rabbet / 2]],
    ['left', [rabbet, 0.035, innerH], [-seatW / 2 + rabbet / 2, z, 0]],
    ['right', [rabbet, 0.035, innerH], [seatW / 2 - rabbet / 2, z, 0]]
  ].forEach(([side, size, position]) => {
    parts.push(assemblyPart(`rabbet.ledge.${side}`, `Face rabbet ledge - ${side}`, 'guide', size, position, { group: 'guide', side }));
  });
}

function addCanvasParts(parts, plan, supportDepth) {
  const canvasCenterY = supportDepth + plan.canvasT / 2;
  parts.push(assemblyPart('canvas.body', 'Canvas wrapped edge volume', 'canvas', [plan.canvasW, plan.canvasT, plan.canvasH], [0, canvasCenterY, 0], { group: 'canvas' }));
  parts.push(assemblyPart('canvas.front', 'Canvas surface', 'canvas', [plan.canvasW, 0.06, plan.canvasH], [0, supportDepth + plan.canvasT - 0.03, 0], { group: 'canvas' }));

  const stretcherY = supportDepth + plan.canvasT / 2;
  const stretcherDepth = plan.canvasT * 0.82;
  [
    ['top', [plan.canvasW, stretcherDepth, plan.stretcherW], [0, stretcherY, plan.canvasH / 2 - plan.stretcherW / 2]],
    ['bottom', [plan.canvasW, stretcherDepth, plan.stretcherW], [0, stretcherY, -plan.canvasH / 2 + plan.stretcherW / 2]],
    ['left', [plan.stretcherW, stretcherDepth, plan.canvasH], [-plan.canvasW / 2 + plan.stretcherW / 2, stretcherY, 0]],
    ['right', [plan.stretcherW, stretcherDepth, plan.canvasH], [plan.canvasW / 2 - plan.stretcherW / 2, stretcherY, 0]]
  ].forEach(([side, size, position]) => {
    parts.push(assemblyPart(`stretcher.${side}`, `Canvas stretcher - ${side}`, 'wood', size, position, { group: 'stretcher', side, colorGroup: 'stretcher' }));
  });
}

function addSpacerParts(parts, plan, innerW, innerH, supportTop) {
  const spacer = Math.max(0.06, plan.reveal);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], index) => {
    parts.push(assemblyPart(
      `spacer.${index + 1}`,
      'Reveal spacer block',
      'guide',
      [spacer, spacer, spacer],
      [sx * innerW / 2, supportTop + spacer / 2, sz * innerH / 2],
      { group: 'spacer', index }
    ));
  });
}

function addFrameFasteners(parts, connections, plan, result, buildKind) {
  if (plan.mountMethod === 'none') return;
  const supportDepth = Math.max(0.001, result.supportDepth ?? plan.depth - plan.canvasT);
  const supportThickness = Math.max(0.001, result.supportThickness ?? supportDepth);
  const supportBottom = Math.max(0, result.supportBottom ?? (buildKind === 'strainer' ? supportDepth - supportThickness : 0));
  const screwStartY = buildKind === 'strainer' ? supportBottom : 0;
  const screwLength = Math.min(
    Math.max(0.35, supportDepth - screwStartY + plan.canvasT * 0.5),
    Math.max(0.35, plan.depth - screwStartY)
  );
  const screwInset = Math.max(plan.stretcherW / 2, plan.reveal + plan.stretcherW / 2);
  const innerW = result.innerW || plan.canvasW + plan.reveal * 2;
  const innerH = result.innerH || plan.canvasH + plan.reveal * 2;
  const positions = [
    [0, -innerH / 2 + screwInset],
    [0, innerH / 2 - screwInset],
    [-innerW / 2 + screwInset, 0],
    [innerW / 2 - screwInset, 0]
  ];

  positions.forEach(([x, z], index) => {
    const id = `fastener.${index + 1}`;
    parts.push(assemblyPart(
      id,
      'Mounting fastener placeholder',
      'fastener',
      [0.12, screwLength, 0.12],
      [x, screwStartY + screwLength / 2, z],
      { group: 'fastener', axis: 'y', direction: 1, length: screwLength, radius: 0.06, start: { x, y: screwStartY, z } }
    ));
    connections.push({ id: `fasten.${id}`, type: 'fastenedBy', from: buildKind === 'strainer' ? 'strainer' : 'liner', to: 'stretcher', fastener: id, label: 'mounting screw' });
  });
}

function assemblyPart(id, role, material, size, position, meta = {}) {
  return {
    id,
    role,
    material,
    size: { x: size[0], y: size[1], z: size[2] },
    position: { x: position[0], y: position[1], z: position[2] },
    rotation: { x: 0, y: 0, z: 0 },
    meta
  };
}
