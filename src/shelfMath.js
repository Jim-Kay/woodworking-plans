import { findComponentOverlaps } from './assembly.js';

export function calculateShelfPlan(plan) {
  if (plan.build === 'tote-rack') return calculateToteRackPlan(plan);
  if (plan.build === 'rolling-shelves') return calculateRollingShelfPlan(plan);

  const errors = [];
  const warnings = [];
  const width = positive(plan.shelfW, 'Shelf width', errors);
  const height = positive(plan.shelfH, 'Shelf height', errors);
  const depth = positive(plan.shelfD, 'Shelf depth', errors);
  const levels = integerAtLeast(plan.shelfLevels, 1, 'Shelf levels', errors);
  const bays = integerAtLeast(plan.shelfBays, 1, 'Shelf bays', errors);
  const slats = integerAtLeast(plan.shelfSlats, 1, 'Slats per shelf', errors);
  const post = positive(plan.shelfPost, 'Post face width', errors);
  const stock = 1.5;
  const rail = positive(plan.shelfRail, 'Rail height', errors);
  const deck = positive(plan.shelfDeck, 'Deck board width', errors);
  const ok = errors.length === 0;
  if (!ok) return { type: 'shelves', ok: false, errors, warnings, parts: [], boardFeet: 0 };

  const uprightQty = (bays + 1) * 2;
  const frontBackRailQty = levels * bays * 2;
  const sideRailQty = levels * (bays + 1);
  const slatQty = levels * slats;
  const screwQty = levels * bays * 8;
  const bayStep = Math.max(stock, (width - stock) / bays);
  const bayWidth = Math.max(0, bayStep - post);
  const railLength = Math.max(stock, bayStep - stock);
  const depthRailLength = Math.max(stock, depth - stock * 2);
  const slatLength = Math.max(stock, width);
  const shelfSpacing = levels > 1 ? (height - rail) / (levels - 1) : height;
  if (shelfSpacing < 12) warnings.push('Shelf spacing is under 12 in; check stored item height.');
  if (bayWidth > 48) warnings.push('Bay width is over 48 in; consider adding more bays or heavier front/back rails.');

  const parts = [
    { part: 'Vertical posts', qty: uprightQty, length: height, width: post, thickness: stock, notes: 'Use 2x4-style posts; wide face runs left/right, 1.5 in edge runs front/back.' },
    { part: 'Front/back shelf rails', qty: frontBackRailQty, length: railLength, width: rail, thickness: stock, notes: 'One front and one back rail per bay; each segment stops at the side-rail faces.' },
    { part: 'Side depth rails', qty: sideRailQty, length: depthRailLength, width: rail, thickness: stock, notes: 'Depth rails run between front/back post faces.' },
    { part: 'Shelf slats', qty: slatQty, length: slatLength, width: deck, thickness: stock, notes: `${slats} slats per shelf; cut to the outside width so the ends align with the side rails.` },
    { part: 'Structural screws', qty: screwQty, length: 2.5, width: NaN, thickness: NaN, notes: 'Two screws where each front/back rail crosses a post.' }
  ];
  const boardFeet = parts.reduce((sum, p) => {
    const boardFeetForPart = (p.qty * p.length * p.width * p.thickness) / 144;
    return Number.isFinite(boardFeetForPart) ? sum + boardFeetForPart : sum;
  }, 0);
  const model = { width, height, depth, levels, bays, slats, post, stock, rail, deck, bayStep, bayWidth, railLength, depthRailLength, slatLength };
  const assembly = buildShelfAssembly(model);
  const validation = validateShelfConstruction(assembly, warnings);
  return {
    type: 'shelves',
    ok,
    errors,
    warnings,
    parts,
    boardFeet,
    shelfW: width,
    shelfH: height,
    shelfD: depth,
    levels,
    bays,
    slats,
    post,
    stock,
    rail,
    deck,
    railLength,
    depthRailLength,
    slatLength,
    bayStep,
    bayWidth,
    shelfSpacing,
    assembly,
    validation
  };
}

function calculateToteRackPlan(plan) {
  const errors = [];
  const warnings = [];
  const toteW = positive(plan.toteW, 'Tote width', errors);
  const toteLipWidth = nonnegative(plan.toteLipWidth, 'Tote lip width', errors);
  const toteD = positive(plan.toteD, 'Tote length', errors);
  const toteH = positive(plan.toteH, 'Tote height', errors);
  const columns = integerAtLeast(plan.toteColumns, 1, 'Tote columns', errors);
  const rows = integerAtLeast(plan.toteRows, 1, 'Tote rows', errors);
  const sideClearance = nonnegative(plan.toteSideClearance, 'Side clearance', errors);
  const verticalClearance = nonnegative(plan.toteVerticalClearance, 'Vertical clearance', errors);
  const railInset = nonnegative(plan.toteRailInset, 'Rail inset', errors);
  const post = positive(plan.shelfPost, 'Post face width', errors);
  const rail = positive(plan.shelfRail, 'Rail height', errors);
  const stock = 1.5;
  const casterHeight = 4.21;
  const toteLipThickness = 0.75;
  const minimumNeckClearance = 0.25;
  const minimumLipBearing = 1;
  const baseStackHeight = stock * 2;
  if (Number.isFinite(toteW) && Number.isFinite(toteLipWidth) && toteLipWidth * 2 >= toteW) {
    errors.push('Tote lip width must leave a positive body width between the runner rails.');
  }
  const ok = errors.length === 0;
  if (!ok) return { type: 'shelves', style: 'tote-rack', ok: false, errors, warnings, parts: [], boardFeet: 0 };

  const postStep = toteW + sideClearance * 2 + stock;
  const bayWidth = postStep;
  const width = columns * postStep + stock;
  const depth = toteD + railInset * 2;
  const rowPitch = toteH + verticalClearance;
  const runnerY = (row) => baseStackHeight + toteH - toteLipThickness - rail / 2 + row * rowPitch;
  const postLength = runnerY(rows - 1) + rail / 2 + verticalClearance - baseStackHeight;
  const height = baseStackHeight + postLength + stock;
  const toteNeckWidth = Math.max(0, toteW - toteLipWidth * 2);
  const runnerClearWidth = Math.max(0, postStep - stock * 3);
  const toteNeckClearance = (runnerClearWidth - toteNeckWidth) / 2;
  const lipBearing = toteLipWidth - sideClearance - toteNeckClearance;
  const runnerCenterSpacing = runnerClearWidth + stock;
  const railLength = Math.max(stock, postStep - stock);
  const depthRailLength = depth;
  const frameRailLength = width;
  const tieRailLength = Math.max(stock, depth - post * 2);
  const supportRailLength = depthRailLength;
  const totalHeight = height + casterHeight;
  const capacity = columns * rows;
  if (verticalClearance < 2) warnings.push('Vertical clearance is under 2 in; totes may be hard to lift over the support rails.');
  if (sideClearance < 0.125) warnings.push('Lid side gap is under 1/8 in; leave room for tote variation and rack assembly tolerance.');
  if (toteNeckClearance < minimumNeckClearance - 0.001) warnings.push('Tote neck clearance is under 1/4 in; increase lid side gap or use a tote with a wider lip.');
  if (lipBearing < minimumLipBearing - 0.001) warnings.push('Runner contact under the lip is under 1 in; reduce lid side gap or use a tote with a wider lip so the tote cannot shift off the rails.');
  if (toteD > 36) warnings.push('Tote length is over 36 in; check rack depth and wall clearance.');

  const parts = [
    { part: 'Vertical posts', qty: (columns + 1) * 2, length: postLength, width: post, thickness: stock, notes: 'Front and back posts sit on the doubled bottom rails; mark every row height before assembly.' },
    { part: 'Top frame rails', qty: 2, length: frameRailLength, width: rail, thickness: stock, notes: 'Full-width front and back top rails laid flat on top of the posts.' },
    { part: 'Doubled bottom frame rails', qty: 4, length: frameRailLength, width: rail, thickness: stock, notes: 'Two stacked full-width rails across the front and back create a stronger caster-bearing base.' },
    { part: 'Tote runner rails', qty: rows * columns * 2, length: supportRailLength, width: rail, thickness: stock, notes: 'Two front-to-back runners for each tote bay; runners touch the posts directly and leave a controlled neck clearance under the tote lip.' },
    { part: 'Doubled bottom depth tie rails', qty: (columns + 1) * 2, length: tieRailLength, width: rail, thickness: stock, notes: 'Two stacked bottom depth ties; outer rails are inset so their outside faces align with the post outside faces.' },
    { part: 'Swivel casters', qty: 4, length: casterHeight, width: 3.62, thickness: 2.44, notes: 'Mount to the doubled bottom frame rails if the rack needs to roll.' },
    { part: 'Structural screws', qty: rows * columns * 8 + (columns + 1) * 8, length: 2.5, width: NaN, thickness: NaN, notes: 'Fasten runner and tie rail ends into posts; add wall anchors for tall racks.' }
  ];
  const boardFeet = parts.reduce((sum, p) => {
    const boardFeetForPart = (p.qty * p.length * p.width * p.thickness) / 144;
    return Number.isFinite(boardFeetForPart) ? sum + boardFeetForPart : sum;
  }, 0);
  const model = { width, height, totalHeight, depth, rows, columns, toteW, toteLipWidth, toteNeckWidth, toteNeckClearance, lipBearing, minimumNeckClearance, minimumLipBearing, toteD, toteH, sideClearance, verticalClearance, railInset, post, postLength, stock, rail, bayWidth, postStep, railLength, depthRailLength, frameRailLength, tieRailLength, supportRailLength, rowPitch, casterHeight, toteLipThickness, baseStackHeight, runnerClearWidth, runnerCenterSpacing };
  const assembly = buildToteRackAssembly(model);
  const validation = validateShelfConstruction(assembly, warnings);
  return {
    type: 'shelves',
    style: 'tote-rack',
    ok,
    errors,
    warnings,
    parts,
    boardFeet,
    shelfW: width,
    shelfH: totalHeight,
    shelfD: depth,
    levels: rows,
    bays: columns,
    slats: 0,
    post,
    stock,
    rail,
    deck: stock,
    railLength,
    depthRailLength,
    frameRailLength,
    tieRailLength,
    supportRailLength,
    slatLength: 0,
    bayStep: bayWidth,
    bayWidth,
    shelfSpacing: rowPitch,
    toteW,
    toteLipWidth,
    toteD,
    toteH,
    rows,
    columns,
    sideClearance,
    verticalClearance,
    railInset,
    toteNeckWidth,
    toteNeckClearance,
    lipBearing,
    runnerClearWidth,
    runnerCenterSpacing,
    casterHeight,
    frameHeight: height,
    capacity,
    assembly,
    validation
  };
}

function calculateRollingShelfPlan(plan) {
  const errors = [];
  const warnings = [];
  const width = positive(plan.shelfW, 'Shelf width', errors);
  const totalHeight = positive(plan.shelfH, 'Overall height', errors);
  const depth = positive(plan.shelfD, 'Shelf depth', errors);
  const levels = integerAtLeast(plan.shelfLevels, 2, 'Shelf levels', errors);
  const post = positive(plan.shelfPost, 'Post face width', errors);
  const stock = 1.5;
  const rail = positive(plan.shelfRail, 'Rail height', errors);
  const requestedDeck = positive(plan.shelfDeck, 'Shelf deck plank width', errors);
  const plankWidth = requestedDeck <= 1.5 ? 3.5 : requestedDeck;
  const plankThickness = 0.75;
  const slats = integerAtLeast(plan.shelfSlats, 2, 'Shelf planks per level', errors);
  const casterHeight = 4.21;
  const maxCutLength = 48;
  const frameHeight = Math.max(12, totalHeight - casterHeight);
  const ok = errors.length === 0;
  if (!ok) return { type: 'shelves', style: 'rolling', ok: false, errors, warnings, parts: [], boardFeet: 0 };

  if (totalHeight > 77) warnings.push('Overall rolling shelf height is over 6 ft 5 in; reduce height or caster size.');
  if (width > 48) warnings.push('Shelf width is over 48 in; reduce width to keep shelf planks and rails within 4 ft stock.');

  const postJointHeight = Math.ceil(frameHeight / 2);
  const lowerPostLength = Math.min(maxCutLength, postJointHeight);
  const upperPostLength = Math.min(maxCutLength, frameHeight - lowerPostLength);
  const splicePlateLength = Math.min(maxCutLength, Math.max(18, Math.min(30, Math.round(frameHeight / 3))));
  const spliceTop = postJointHeight + splicePlateLength / 2;
  const topSplicePlateLength = Math.min(maxCutLength, Math.max(10, frameHeight - spliceTop));
  const spliceBottom = postJointHeight - splicePlateLength / 2;
  const casterBlockLength = Math.min(maxCutLength, Math.max(8, spliceBottom));
  const frontBackRailLength = Math.max(stock, width - post * 2);
  const sideRailLength = Math.max(stock, depth - stock * 2);
  const endPlankLength = Math.min(Math.max(stock, width - post * 2), maxCutLength);
  const centerPlankLength = Math.min(width, maxCutLength);
  const centerSupportLength = Math.max(stock, depth);
  const gussetLeg = Math.min(12, Math.max(6, depth * 0.35));
  const braceLength = Math.hypot(gussetLeg, gussetLeg);

  const parts = [
    { part: 'Lower main post sections', qty: 4, length: lowerPostLength, width: post, thickness: stock, notes: `${maxCutLength} in max; lower half of each corner post.` },
    { part: 'Upper main post sections', qty: 4, length: upperPostLength, width: post, thickness: stock, notes: `${maxCutLength} in max; upper half of each corner post.` },
    { part: 'Sister splice plates', qty: 4, length: splicePlateLength, width: post, thickness: stock, notes: 'Outside plates bridge the upper/lower post joint so no single vertical piece exceeds 48 in.' },
    { part: 'Top rail sister plates', qty: 4, length: topSplicePlateLength, width: post, thickness: stock, notes: 'Outside plates continue down to meet the top of the sister splice plates.' },
    { part: 'Lower caster mounting sister blocks', qty: 4, length: casterBlockLength, width: post, thickness: stock, notes: 'Outside-face 2x4 blocks double the caster footprint and extend up to meet the sister splice plates.' },
    { part: 'Front/back shelf rails', qty: levels * 2, length: frontBackRailLength, width: rail, thickness: stock, notes: 'One front and one back rail at each shelf level; shifted outward so each end butts into a sister plate.' },
    { part: 'Side depth rails', qty: levels * 2, length: sideRailLength, width: rail, thickness: stock, notes: 'One left and one right rail at each shelf level; outside face aligns with the overall shelf side, and each end butts into a post section.' },
    { part: 'Center shelf supports', qty: levels, length: centerSupportLength, width: rail, thickness: stock, notes: 'Runs front-to-back between the front and back rails to support the middle of the shelf planks.' },
    { part: 'Lower end shelf planks', qty: Math.max(0, levels - 1) * 2, length: endPlankLength, width: plankWidth, thickness: plankThickness, notes: 'Front and back 1x planks on lower shelves fit between the corner posts and bear on the front/back rails.' },
    { part: 'Top end shelf planks', qty: 2, length: centerPlankLength, width: plankWidth, thickness: plankThickness, notes: 'Top front and back planks can run full width because they are not blocked by posts.' },
    { part: 'Middle shelf planks', qty: levels * Math.max(0, slats - 2), length: centerPlankLength, width: plankWidth, thickness: plankThickness, notes: 'Middle 1x planks can run full width because they sit away from the posts and bear on side rails plus center support.' },
    { part: 'Diagonal gusset braces', qty: 8, length: braceLength, width: rail, thickness: stock, notes: 'Cut from 2x stock for anti-racking corner braces.' },
    { part: 'Front locking swivel casters', qty: 2, length: casterHeight, width: 3.62, thickness: 2.44, notes: 'ASHGOOB 3 in brake plate caster, orange PU wheel. Front pair locks for parking the shelf.' },
    { part: 'Rear non-locking swivel casters', qty: 2, length: casterHeight, width: 3.62, thickness: 2.44, notes: 'ASHGOOB 3 in non-brake plate caster, orange PU wheel. Rear pair rolls freely.' },
    { part: 'Caster mounting screws', qty: 16, length: 1.25, width: NaN, thickness: NaN, notes: 'Four screws per caster plate; size to suit the plate holes and bottom rails.' },
    { part: 'Pocket-hole screws', qty: levels * 16, length: 2.5, width: NaN, thickness: NaN, notes: 'For rail-to-post joints; drill pockets from the inside faces of the rails so the pocket openings stay inside the shelf.' },
    { part: 'Structural screws', qty: levels * (4 + slats * 3) + 56, length: 2.5, width: NaN, thickness: NaN, notes: 'Fasten shelf planks to supports, center supports, sister splice plates, top rail sister plates, caster mounting blocks, and gussets.' }
  ];
  parts.forEach((part) => {
    if (Number.isFinite(part.length) && part.length > maxCutLength + 0.001) warnings.push(`${part.part} is longer than 48 in; adjust dimensions.`);
  });
  if (upperPostLength < 12) warnings.push('Upper post section is under 12 in; increase total height or use a different post splice layout.');

  const boardFeet = parts.reduce((sum, p) => {
    const boardFeetForPart = (p.qty * p.length * p.width * p.thickness) / 144;
    return Number.isFinite(boardFeetForPart) ? sum + boardFeetForPart : sum;
  }, 0);
  const shelfSpacing = levels > 1 ? (frameHeight - rail) / (levels - 1) : frameHeight;
  const model = { width, height: frameHeight, totalHeight, depth, levels, slats, post, stock, rail, plankWidth, plankThickness, casterHeight, lowerPostLength, upperPostLength, postJointHeight, splicePlateLength, topSplicePlateLength, casterBlockLength, frontBackRailLength, sideRailLength, endPlankLength, centerPlankLength, centerSupportLength, gussetLeg, braceLength };
  const assembly = buildRollingShelfAssembly(model);
  const validation = validateShelfConstruction(assembly, warnings);

  return {
    type: 'shelves',
    style: 'rolling',
    ok,
    errors,
    warnings,
    parts,
    boardFeet,
    shelfW: width,
    shelfH: totalHeight,
    shelfD: depth,
    levels,
    bays: 1,
    slats,
    post,
    stock,
    rail,
    deck: plankWidth,
    railLength: frontBackRailLength,
    depthRailLength: sideRailLength,
    slatLength: centerPlankLength,
    bayStep: width,
    bayWidth: frontBackRailLength,
    shelfSpacing,
    casterHeight,
    maxCutLength,
    assembly,
    validation
  };
}

function buildRollingShelfAssembly(model) {
  const parts = [];
  const connections = [];
  const zFront = -model.depth / 2 + model.stock / 2;
  const zBack = model.depth / 2 - model.stock / 2;
  const zFrontRail = zFront - model.stock;
  const zBackRail = zBack + model.stock;
  const xLeft = -model.width / 2 + model.post / 2;
  const xRight = model.width / 2 - model.post / 2;
  const xSideLeft = -model.width / 2 + model.stock / 2;
  const xSideRight = model.width / 2 - model.stock / 2;
  const yForLevel = (level) => model.levels === 1 ? model.rail / 2 : model.rail / 2 + level * ((model.height - model.rail) / (model.levels - 1));
  const landingSectionForLevel = (y) => {
    const spliceBottomY = model.postJointHeight - model.splicePlateLength / 2;
    const spliceTopY = model.postJointHeight + model.splicePlateLength / 2;
    if (y >= spliceBottomY - model.rail / 2 && y <= spliceTopY + model.rail / 2) return 'splice';
    if (y >= model.height - model.topSplicePlateLength) return 'topSplice';
    if (y <= model.casterBlockLength) return 'casterBlock';
    return y <= model.lowerPostLength ? 'lower' : 'upper';
  };
  const cornerPositions = [
    ['front.left', xLeft, zFront],
    ['front.right', xRight, zFront],
    ['back.left', xLeft, zBack],
    ['back.right', xRight, zBack]
  ];

  cornerPositions.forEach(([corner, x, z]) => {
    const lowerId = `post.${corner}.lower`;
    const upperId = `post.${corner}.upper`;
    const spliceId = `post.${corner}.splice`;
    const topSpliceId = `post.${corner}.topSplice`;
    const casterBlockId = `post.${corner}.casterBlock`;
    const isFront = corner.startsWith('front');
    const outwardSign = isFront ? -1 : 1;
    const lowerY = model.lowerPostLength / 2;
    const upperY = model.lowerPostLength + model.upperPostLength / 2;
    const spliceY = model.postJointHeight;
    const spliceZ = z + outwardSign * model.stock;
    const topSpliceY = model.height - model.topSplicePlateLength / 2;
    const topSpliceZ = z + outwardSign * model.stock;
    const casterBlockY = model.casterBlockLength / 2;
    const casterBlockZ = z + outwardSign * model.stock;
    parts.push(assemblyPart(lowerId, 'lower main post section', 'wood', { x: model.post, y: model.lowerPostLength, z: model.stock }, { x, y: lowerY, z }, { group: 'posts', corner, section: 'lower' }));
    parts.push(assemblyPart(upperId, 'upper main post section', 'wood', { x: model.post, y: model.upperPostLength, z: model.stock }, { x, y: upperY, z }, { group: 'posts', corner, section: 'upper' }));
    parts.push(assemblyPart(spliceId, 'sister splice plate', 'wood', { x: model.post, y: model.splicePlateLength, z: model.stock }, { x, y: spliceY, z: spliceZ }, { group: 'posts', corner, section: 'splice', intentionalOverlap: true }));
    parts.push(assemblyPart(topSpliceId, 'top rail sister plate', 'wood', { x: model.post, y: model.topSplicePlateLength, z: model.stock }, { x, y: topSpliceY, z: topSpliceZ }, { group: 'posts', corner, section: 'top-splice', intentionalOverlap: true }));
    parts.push(assemblyPart(casterBlockId, 'lower caster mounting sister block', 'wood', { x: model.post, y: model.casterBlockLength, z: model.stock }, { x, y: casterBlockY, z: casterBlockZ }, { group: 'posts', corner, section: 'caster-block', intentionalOverlap: true }));
    connections.push(contactConnection(`contact.${spliceId}.${lowerId}`, spliceId, lowerId, 'sister splice plate bridges lower post'));
    connections.push(contactConnection(`contact.${spliceId}.${upperId}`, spliceId, upperId, 'sister splice plate bridges upper post'));
    connections.push(contactConnection(`contact.${topSpliceId}.${upperId}`, topSpliceId, upperId, 'top rail sister plate bears on upper post'));
    connections.push(contactConnection(`contact.${casterBlockId}.${lowerId}`, casterBlockId, lowerId, 'lower caster sister block doubles caster mounting footprint'));
    connections.push(contactConnection(`contact.${casterBlockId}.${spliceId}`, casterBlockId, spliceId, 'lower caster sister block meets sister splice plate'));
    addRollingPostSpliceFasteners(model, parts, connections, { corner, x, z, lowerId, upperId, spliceId, outwardSign });
    addRollingTopSpliceFasteners(model, parts, connections, { corner, x, z, upperId, topSpliceId, outwardSign });
    addRollingCasterBlockFasteners(model, parts, connections, { corner, x, casterBlockZ, lowerId, casterBlockId, outwardSign });
  });

  for (let level = 0; level < model.levels; level += 1) {
    const y = yForLevel(level);
    const postSection = y <= model.lowerPostLength ? 'lower' : 'upper';
    const frontBackLandingSection = landingSectionForLevel(y);
    const frontId = `rail.front.level${level}`;
    const backId = `rail.back.level${level}`;
    const leftId = `rail.left.level${level}`;
    const rightId = `rail.right.level${level}`;
    const centerSupportId = `rail.center.level${level}`;
    parts.push(assemblyPart(frontId, 'front rail', 'wood', { x: model.frontBackRailLength, y: model.rail, z: model.stock }, { x: 0, y, z: zFrontRail }, { group: 'rails', level, side: 'front', intentionalOverlap: true }));
    parts.push(assemblyPart(backId, 'back rail', 'wood', { x: model.frontBackRailLength, y: model.rail, z: model.stock }, { x: 0, y, z: zBackRail }, { group: 'rails', level, side: 'back', intentionalOverlap: true }));
    parts.push(assemblyPart(leftId, 'side depth rail', 'wood', { x: model.stock, y: model.rail, z: model.sideRailLength }, { x: xSideLeft, y, z: 0 }, { group: 'rails', level, side: 'left', intentionalOverlap: true }));
    parts.push(assemblyPart(rightId, 'side depth rail', 'wood', { x: model.stock, y: model.rail, z: model.sideRailLength }, { x: xSideRight, y, z: 0 }, { group: 'rails', level, side: 'right', intentionalOverlap: true }));
    parts.push(assemblyPart(centerSupportId, 'center shelf support', 'wood', { x: model.stock, y: model.rail, z: model.centerSupportLength }, { x: 0, y, z: 0 }, { group: 'rails', level, side: 'center' }));
    [
      [frontId, `post.front.left.${frontBackLandingSection}`],
      [frontId, `post.front.right.${frontBackLandingSection}`],
      [backId, `post.back.left.${frontBackLandingSection}`],
      [backId, `post.back.right.${frontBackLandingSection}`],
      [leftId, `post.front.left.${postSection}`],
      [leftId, `post.back.left.${postSection}`],
      [rightId, `post.front.right.${postSection}`],
      [rightId, `post.back.right.${postSection}`]
    ].forEach(([from, to]) => connections.push(contactConnection(`contact.${from}.${to}.level${level}`, from, to, 'rail bears on corner post')));
    connections.push(contactConnection(`contact.${centerSupportId}.${frontId}.level${level}`, centerSupportId, frontId, 'center shelf support bears on front rail'));
    connections.push(contactConnection(`contact.${centerSupportId}.${backId}.level${level}`, centerSupportId, backId, 'center shelf support bears on back rail'));
    const slatIds = [];
    const slatTopY = y + model.rail / 2 + model.plankThickness / 2;
    const zMin = zFrontRail - model.stock / 2 + model.plankWidth / 2;
    const zMax = zBackRail + model.stock / 2 - model.plankWidth / 2;
    const zStep = model.slats === 1 ? 0 : (zMax - zMin) / (model.slats - 1);
    for (let slatIndex = 0; slatIndex < model.slats; slatIndex += 1) {
      const isEndSlat = slatIndex === 0 || slatIndex === model.slats - 1;
      const isTopLevel = level === model.levels - 1;
      const slatId = `slat.level${level}.${slatIndex}`;
      const z = zMin + zStep * slatIndex;
      const length = isEndSlat && !isTopLevel ? model.endPlankLength : model.centerPlankLength;
      const role = isEndSlat ? 'end shelf plank' : 'middle shelf plank';
      parts.push(assemblyPart(slatId, role, 'wood', { x: length, y: model.plankThickness, z: model.plankWidth }, { x: 0, y: slatTopY, z }, { group: 'slats', level, index: slatIndex }));
      slatIds.push(slatId);
      if (isEndSlat) {
        const railId = slatIndex === 0 ? frontId : backId;
        connections.push(contactConnection(`contact.${slatId}.${railId}`, slatId, railId, 'end shelf plank bears on end rail'));
      } else {
        connections.push(contactConnection(`contact.${slatId}.${leftId}`, slatId, leftId, 'middle shelf plank bears on left side rail'));
        connections.push(contactConnection(`contact.${slatId}.${rightId}`, slatId, rightId, 'middle shelf plank bears on right side rail'));
        connections.push(contactConnection(`contact.${slatId}.${centerSupportId}`, slatId, centerSupportId, 'middle shelf plank bears on center support'));
      }
    }
    addRollingLevelFasteners(model, parts, connections, {
      level,
      y,
      postSection,
      frontId,
      backId,
      leftId,
      rightId,
      centerSupportId,
      slatIds,
      xSideLeft,
      xSideRight,
      zFront,
      zBack,
      zFrontRail,
      zBackRail,
      frontBackLandingSection
    });
  }

  addRollingHardware(model, parts, connections, cornerPositions);
  return { type: 'shelves', style: 'rolling', units: 'in', parts, connections };
}

function addRollingLevelFasteners(model, parts, connections, context) {
  const {
    level,
    y,
    postSection,
    frontId,
    backId,
    leftId,
    rightId,
    centerSupportId,
    slatIds,
    xSideLeft,
    xSideRight,
    zFront,
    zBack,
    zFrontRail = zFront,
    zBackRail = zBack,
    frontBackLandingSection = postSection
  } = context;
  const radius = 0.08;
  const railScrewLength = 2.5;
  const railEndInset = 0.85;
  const frontBackStartX = model.frontBackRailLength / 2 - railEndInset;
  const sideStartZ = model.sideRailLength / 2 - railEndInset;
  const railOffsets = [model.rail * 0.08, model.rail * 0.22];
  const sideOffsets = [-model.rail * 0.12, model.rail * 0.38];

  [
    [frontId, `post.front.left.${frontBackLandingSection}`, -frontBackStartX, -1, zFrontRail, 1, 'front left rail-to-sister pocket screw'],
    [frontId, `post.front.right.${frontBackLandingSection}`, frontBackStartX, 1, zFrontRail, 1, 'front right rail-to-sister pocket screw'],
    [backId, `post.back.left.${frontBackLandingSection}`, -frontBackStartX, -1, zBackRail, -1, 'back left rail-to-sister pocket screw'],
    [backId, `post.back.right.${frontBackLandingSection}`, frontBackStartX, 1, zBackRail, -1, 'back right rail-to-sister pocket screw']
  ].forEach(([railId, postId, x, direction, z, insideSign, label], jointIndex) => {
    railOffsets.forEach((dy, screwIndex) => {
      const screwId = `screw.rolling.level${level}.x${jointIndex}.${screwIndex}`;
      parts.push(screwPart(screwId, label, { x, y: y + dy, z }, 'x', direction, railScrewLength, radius, {
        group: 'fasteners',
        level,
        jointIndex,
        screwIndex,
        fastenerKind: 'pocket-hole',
        pocket: {
          faceAxis: 'z',
          faceDirection: insideSign,
          position: { x, y: y + dy, z: z + insideSign * model.stock / 2 },
          size: { major: 0.52, minor: 0.24 },
          angleDeg: 15 * direction
        }
      }));
      connections.push(fastenerConnection(`fasten.${screwId}`, railId, postId, screwId, label));
    });
  });

  [
    [leftId, `post.front.left.${postSection}`, xSideLeft, -sideStartZ, -1, 'left front side-rail pocket screw'],
    [leftId, `post.back.left.${postSection}`, xSideLeft, sideStartZ, 1, 'left back side-rail pocket screw'],
    [rightId, `post.front.right.${postSection}`, xSideRight, -sideStartZ, -1, 'right front side-rail pocket screw'],
    [rightId, `post.back.right.${postSection}`, xSideRight, sideStartZ, 1, 'right back side-rail pocket screw']
  ].forEach(([railId, postId, x, z, direction, label], jointIndex) => {
    sideOffsets.forEach((dy, screwIndex) => {
      const screwId = `screw.rolling.level${level}.z${jointIndex}.${screwIndex}`;
      parts.push(screwPart(screwId, label, { x, y: y + dy, z }, 'z', direction, railScrewLength, radius, {
        group: 'fasteners',
        level,
        jointIndex,
        screwIndex,
        fastenerKind: 'pocket-hole',
        pocket: {
          faceAxis: 'z',
          faceDirection: direction,
          position: { x, y: y + dy, z: z + direction * model.stock * 0.25 },
          size: { major: 0.52, minor: 0.24 },
          angleDeg: -15 * direction
        }
      }));
      connections.push(fastenerConnection(`fasten.${screwId}`, railId, postId, screwId, label));
    });
  });

  const centerSupportStartZ = model.centerSupportLength / 2 - railEndInset;
  [
    [frontId, centerSupportId, -centerSupportStartZ, -1, 'front rail to center support screw'],
    [backId, centerSupportId, centerSupportStartZ, 1, 'back rail to center support screw']
  ].forEach(([railId, supportId, z, direction, label], jointIndex) => {
    sideOffsets.forEach((dy, screwIndex) => {
      const screwId = `screw.rolling.level${level}.centerSupport${jointIndex}.${screwIndex}`;
      const x = screwIndex === 0 ? -model.stock * 0.28 : model.stock * 0.28;
      parts.push(screwPart(screwId, label, { x, y: y + dy, z }, 'z', direction, railScrewLength, radius, { group: 'fasteners', level, jointIndex, screwIndex }));
      connections.push(fastenerConnection(`fasten.${screwId}`, railId, supportId, screwId, label));
    });
  });

  const plankScrewLength = model.plankThickness + 1.25;
  const plankTopY = y + model.rail / 2 + model.plankThickness + 0.04;
  slatIds.forEach((slatId, index) => {
    const slat = parts.find((part) => part.id === slatId);
    if (!slat) return;
    const isEndSlat = index === 0 || index === slatIds.length - 1;
    const supportPoints = isEndSlat
      ? [
          [-Math.min(slat.size.x, model.centerPlankLength) * 0.28, index === 0 ? zFrontRail : zBackRail, index === 0 ? frontId : backId],
          [0, index === 0 ? zFrontRail : zBackRail, index === 0 ? frontId : backId],
          [Math.min(slat.size.x, model.centerPlankLength) * 0.28, index === 0 ? zFrontRail : zBackRail, index === 0 ? frontId : backId]
        ]
      : [
          [xSideLeft, slat.position.z, leftId],
          [0, slat.position.z, centerSupportId],
          [xSideRight, slat.position.z, rightId]
        ];
    supportPoints.forEach(([x, z, supportId], supportIndex) => {
      const screwId = `screw.rolling.level${level}.slat${index}.${supportIndex}`;
      parts.push(screwPart(screwId, 'shelf plank screw', { x, y: plankTopY, z }, 'y', -1, plankScrewLength, radius, { group: 'fasteners', level, index, supportIndex }));
      connections.push(fastenerConnection(`fasten.${screwId}`, slatId, supportId, screwId, 'shelf plank screw'));
    });
  });
}

function addRollingPostSpliceFasteners(model, parts, connections, context) {
  const { corner, x, z, lowerId, upperId, spliceId, outwardSign } = context;
  const direction = -outwardSign;
  const startZ = z + outwardSign * model.stock * 1.5;
  const screwLength = model.stock * 1.8;
  const radius = 0.08;
  const xOffsets = [-model.post * 0.24, model.post * 0.24];
  [
    [lowerId, model.postJointHeight - model.splicePlateLength * 0.22, 'lower post splice screw'],
    [upperId, model.postJointHeight + model.splicePlateLength * 0.22, 'upper post splice screw']
  ].forEach(([postId, y, label], rowIndex) => {
    xOffsets.forEach((dx, screwIndex) => {
      const screwId = `screw.splice.${corner}.${rowIndex}.${screwIndex}`;
      parts.push(screwPart(screwId, label, { x: x + dx, y, z: startZ }, 'z', direction, screwLength, radius, { group: 'fasteners', corner, rowIndex, screwIndex }));
      connections.push(fastenerConnection(`fasten.${screwId}`, spliceId, postId, screwId, label));
    });
  });
}

function addRollingTopSpliceFasteners(model, parts, connections, context) {
  const { corner, x, z, upperId, topSpliceId, outwardSign } = context;
  const direction = -outwardSign;
  const startZ = z + outwardSign * model.stock * 1.5;
  const screwLength = model.stock * 1.8;
  const radius = 0.08;
  const xOffsets = [-model.post * 0.24, model.post * 0.24];
  const yOffsets = [
    model.height - model.topSplicePlateLength * 0.72,
    model.height - model.topSplicePlateLength * 0.34
  ];
  yOffsets.forEach((y, rowIndex) => {
    xOffsets.forEach((dx, screwIndex) => {
      const screwId = `screw.topSplice.${corner}.${rowIndex}.${screwIndex}`;
      parts.push(screwPart(screwId, 'top rail sister plate screw', { x: x + dx, y, z: startZ }, 'z', direction, screwLength, radius, { group: 'fasteners', corner, rowIndex, screwIndex }));
      connections.push(fastenerConnection(`fasten.${screwId}`, topSpliceId, upperId, screwId, 'top rail sister plate screw'));
    });
  });
}

function addRollingCasterBlockFasteners(model, parts, connections, context) {
  const { corner, x, casterBlockZ, lowerId, casterBlockId, outwardSign } = context;
  const radius = 0.08;
  const screwLength = model.stock * 1.8;
  const startZ = casterBlockZ + outwardSign * model.stock / 2;
  const direction = -outwardSign;
  const xOffsets = [-model.post * 0.24, model.post * 0.24];
  const yOffsets = [model.casterBlockLength * 0.18, model.casterBlockLength * 0.48, model.casterBlockLength * 0.78];
  yOffsets.forEach((y, rowIndex) => {
    xOffsets.forEach((dx, screwIndex) => {
      const screwId = `screw.casterBlock.${corner}.${rowIndex}.${screwIndex}`;
      parts.push(screwPart(screwId, 'caster block sister screw', { x: x + dx, y, z: startZ }, 'z', direction, screwLength, radius, { group: 'fasteners', corner, rowIndex, screwIndex }));
      connections.push(fastenerConnection(`fasten.${screwId}`, casterBlockId, lowerId, screwId, 'caster block sister screw'));
    });
  });
}

function addRollingHardware(model, parts, connections, cornerPositions) {
  cornerPositions.forEach(([corner, x, z], index) => {
    const casterId = `caster.${corner}`;
    const isFront = corner.startsWith('front');
    const outwardSign = isFront ? -1 : 1;
    const casterZ = z + outwardSign * model.stock / 2;
    const casterRole = isFront ? 'locking swivel caster' : 'non-locking swivel caster';
    parts.push(assemblyPart(casterId, casterRole, 'hardware', { x: 3.62, y: model.casterHeight, z: 2.95 }, { x, y: -model.casterHeight / 2, z: casterZ }, {
      group: 'hardware',
      kind: 'caster',
      corner,
      locking: isFront,
      plate: { x: 3.62, z: 2.44 },
      wheel: { diameter: 2.95, width: 1.24 },
      height: model.casterHeight
    }));
    connections.push(contactConnection(`contact.${casterId}.block`, casterId, `post.${corner}.casterBlock`, 'caster plate mounts under doubled post foot'));
    const plateX = 3.62;
    const plateZ = 2.44;
    const screwPositions = [
      [-plateX * 0.36, -plateZ * 0.32],
      [plateX * 0.36, -plateZ * 0.32],
      [-plateX * 0.36, plateZ * 0.32],
      [plateX * 0.36, plateZ * 0.32]
    ];
    screwPositions.forEach(([dx, dz], screwIndex) => {
      const casterScrewId = `screw.caster.${index}.${screwIndex}`;
      const targetId = dz * outwardSign > 0 ? `post.${corner}.casterBlock` : `post.${corner}.lower`;
      parts.push(screwPart(casterScrewId, 'caster mounting screw', { x: x + dx, y: -0.08, z: casterZ + dz }, 'y', 1, 1.25, 0.06, { group: 'fasteners', corner, screwIndex }));
      connections.push(fastenerConnection(`fasten.${casterScrewId}`, casterId, targetId, casterScrewId, 'caster mounting screw'));
    });
  });
}

function buildToteRackAssembly(model) {
  const parts = [];
  const connections = [];
  const postXForIndex = (index) => {
    if (index === 0) return -model.width / 2 + model.stock / 2;
    if (index === model.columns) return model.width / 2 - model.stock / 2;
    return -model.width / 2 + model.stock / 2 + index * ((model.width - model.stock) / model.columns);
  };
  const bayCenterX = (bay) => (postXForIndex(bay) + postXForIndex(bay + 1)) / 2;
  const tieRailXForIndex = (index) => {
    const inset = (model.rail - model.stock) / 2;
    if (index === 0) return postXForIndex(index) + inset;
    if (index === model.columns) return postXForIndex(index) - inset;
    return postXForIndex(index);
  };
  const zFront = -model.depth / 2 + model.post / 2;
  const zBack = model.depth / 2 - model.post / 2;
  const yForRow = (row) => model.baseStackHeight + model.toteH - model.toteLipThickness - model.rail / 2 + row * model.rowPitch;
  const bottomFrameY = [model.stock / 2, model.stock * 1.5];
  const postBottomY = model.baseStackHeight;
  const postTopY = postBottomY + model.postLength;
  const topFrameY = postTopY + model.stock / 2;
  const frameRailMeta = { group: 'rails', subgroup: 'frame', stageLabel: 'Frames' };
  const tieRailMeta = { group: 'rails', subgroup: 'tie', stageLabel: 'Depth ties' };
  const runnerRailMeta = { group: 'rails', subgroup: 'runner', stageLabel: 'Runner rails' };

  for (let i = 0; i <= model.columns; i += 1) {
    const x = postXForIndex(i);
    parts.push(assemblyPart(`post.front.${i}`, 'front post', 'wood', { x: model.stock, y: model.postLength, z: model.post }, { x, y: postBottomY + model.postLength / 2, z: zFront }, { group: 'posts', index: i, side: 'front', stageLabel: 'Frames' }));
    parts.push(assemblyPart(`post.back.${i}`, 'back post', 'wood', { x: model.stock, y: model.postLength, z: model.post }, { x, y: postBottomY + model.postLength / 2, z: zBack }, { group: 'posts', index: i, side: 'back', stageLabel: 'Frames' }));
  }

  bottomFrameY.forEach((y, stackIndex) => {
    ['front', 'back'].forEach((side) => {
      const z = side === 'front' ? zFront : zBack;
      const frameRailId = `rail.frame.${side}.bottom.${stackIndex}`;
      parts.push(assemblyPart(frameRailId, `${side} doubled bottom frame rail`, 'wood', { x: model.frameRailLength, y: model.stock, z: model.rail }, { x: 0, y, z }, { ...frameRailMeta, side, level: 'bottom', stackIndex }));
      if (stackIndex === 1) {
        connections.push(contactConnection(`contact.${frameRailId}.lowerStack`, frameRailId, `rail.frame.${side}.bottom.0`, 'doubled bottom frame rails are stacked together'));
      }
      if (stackIndex === 1) {
        for (let i = 0; i <= model.columns; i += 1) {
          connections.push(contactConnection(`contact.${frameRailId}.post${i}`, frameRailId, `post.${side}.${i}`, 'post bears on bottom frame rail'));
        }
      }
    });
  });

  ['front', 'back'].forEach((side) => {
    const z = side === 'front' ? zFront : zBack;
    const frameRailId = `rail.frame.${side}.top`;
    parts.push(assemblyPart(frameRailId, `${side} top frame rail`, 'wood', { x: model.frameRailLength, y: model.stock, z: model.rail }, { x: 0, y: topFrameY, z }, { ...frameRailMeta, side, level: 'top' }));
    for (let i = 0; i <= model.columns; i += 1) {
      connections.push(contactConnection(`contact.${frameRailId}.post${i}`, frameRailId, `post.${side}.${i}`, 'top frame rail rests on post'));
    }
  });

  [
    ['bottom', model.stock / 2, 0],
    ['bottom', model.stock * 1.5, 1]
  ].forEach(([level, y, stackIndex]) => {
    for (let i = 0; i <= model.columns; i += 1) {
      const x = level === 'bottom' ? tieRailXForIndex(i) : postXForIndex(i);
      const tieRailId = `rail.tie.${level}.${stackIndex}.post${i}`;
      parts.push(assemblyPart(tieRailId, `${level} depth tie rail`, 'wood', { x: model.rail, y: model.stock, z: model.tieRailLength }, { x, y, z: 0 }, { ...tieRailMeta, level, stackIndex, postIndex: i }));
      if (stackIndex === 1) {
        connections.push(contactConnection(`contact.${tieRailId}.lowerStack`, tieRailId, `rail.tie.${level}.0.post${i}`, 'doubled bottom depth tie rails are stacked together'));
      }
      if (stackIndex === 1) {
        connections.push(contactConnection(`contact.${tieRailId}.frontPost`, tieRailId, `post.front.${i}`, 'depth tie rail bears on front post'));
        connections.push(contactConnection(`contact.${tieRailId}.backPost`, tieRailId, `post.back.${i}`, 'depth tie rail bears on back post'));
      }
    }
  });

  for (let row = 0; row < model.rows; row += 1) {
    const y = yForRow(row);
    for (let bay = 0; bay < model.columns; bay += 1) {
      const x = bayCenterX(bay);
      [-1, 1].forEach((sideSign) => {
        const sideName = sideSign < 0 ? 'left' : 'right';
        const postIndex = sideSign < 0 ? bay : bay + 1;
        const runnerX = sideSign < 0 ? postXForIndex(bay) + model.stock : postXForIndex(bay + 1) - model.stock;
        const runnerRailId = `rail.runner.row${row}.bay${bay}.${sideSign < 0 ? 'left' : 'right'}`;
        parts.push(assemblyPart(runnerRailId, 'front-to-back tote runner rail', 'wood', { x: model.stock, y: model.rail, z: model.supportRailLength }, { x: runnerX, y, z: 0 }, { ...runnerRailMeta, row, bay, side: sideName }));
        ['front', 'back'].forEach((face) => {
          const postId = `post.${face}.${postIndex}`;
          connections.push(contactConnection(`contact.${runnerRailId}.${face}Post`, runnerRailId, postId, 'runner rail bears on post'));
        });
      });
      const toteTop = y + model.rail / 2 + model.toteLipThickness;
      parts.push(assemblyPart(`tote.row${row}.bay${bay}`, '27 gallon tote with lip clearance envelope', 'tote', { x: model.toteW, y: model.toteH, z: model.toteD }, { x, y: toteTop - model.toteH / 2, z: 0 }, { group: 'totes', row, bay, intentionalOverlap: true, lipThickness: model.toteLipThickness, lipWidth: model.toteLipWidth, neckWidth: model.toteNeckWidth, neckDepth: Math.max(0, model.toteD - model.toteLipWidth * 2), bodyScale: 0.78 }));
    }
  }

  addToteRackStructuralFasteners(model, parts, connections, {
    postXForIndex,
    tieRailXForIndex,
    yForRow,
    zFront,
    zBack,
    bottomFrameY,
    topFrameY
  });
  addToteRackCasters(model, parts, connections, zFront, zBack);
  return { type: 'shelves', style: 'tote-rack', units: 'in', parts, connections };
}

function addToteRackStructuralFasteners(model, parts, connections, context) {
  const { postXForIndex, tieRailXForIndex, yForRow, zFront, zBack, bottomFrameY, topFrameY } = context;
  const radius = 0.045;
  const laminationScrew = model.stock * (2.5 / 1.5);
  const jointScrew = model.stock * 1.75;
  const faceScrewOffsets = [-model.stock * 0.28, model.stock * 0.28];
  const stackZOffsets = [-model.rail * 0.26, model.rail * 0.26];
  const runnerYOffset = model.rail * 0.24;
  const runnerZInset = model.post * 0.42;

  ['front', 'back'].forEach((side) => {
    const z = side === 'front' ? zFront : zBack;
    const bottomUpperId = `rail.frame.${side}.bottom.1`;
    const bottomLowerId = `rail.frame.${side}.bottom.0`;
    const topId = `rail.frame.${side}.top`;
    for (let i = 0; i <= model.columns; i += 1) {
      const x = postXForIndex(i);
      faceScrewOffsets.forEach((dx, screwIndex) => {
        const bottomScrewId = `screw.toteFrame.${side}.bottom.post${i}.${screwIndex}`;
        parts.push(screwPart(bottomScrewId, 'bottom frame post screw', { x: x + dx, y: bottomFrameY[1] - model.stock / 2, z }, 'y', 1, jointScrew, radius, { group: 'fasteners', subgroup: 'frame', stageLabel: 'Frames', side, postIndex: i, screwIndex }));
        connections.push(fastenerConnection(`fasten.${bottomScrewId}`, bottomUpperId, `post.${side}.${i}`, bottomScrewId, 'bottom frame post screw'));

        const topScrewId = `screw.toteFrame.${side}.top.post${i}.${screwIndex}`;
        parts.push(screwPart(topScrewId, 'top frame post screw', { x: x + dx, y: topFrameY + model.stock / 2, z }, 'y', -1, jointScrew, radius, { group: 'fasteners', subgroup: 'frame', stageLabel: 'Frames', side, postIndex: i, screwIndex }));
        connections.push(fastenerConnection(`fasten.${topScrewId}`, topId, `post.${side}.${i}`, topScrewId, 'top frame post screw'));
      });
      stackZOffsets.forEach((dz, screwIndex) => {
        const stackScrewId = `screw.toteFrame.${side}.stack.post${i}.${screwIndex}`;
        parts.push(screwPart(stackScrewId, 'doubled bottom frame screw', { x, y: bottomFrameY[0] - model.stock / 2, z: z + dz }, 'y', 1, laminationScrew, radius, { group: 'fasteners', subgroup: 'frame', stageLabel: 'Frames', side, postIndex: i, screwIndex }));
        connections.push(fastenerConnection(`fasten.${stackScrewId}`, bottomLowerId, bottomUpperId, stackScrewId, 'doubled bottom frame screw'));
      });
    }
  });

  for (let i = 0; i <= model.columns; i += 1) {
    const x = tieRailXForIndex(i);
    const upperTieId = `rail.tie.bottom.1.post${i}`;
    const lowerTieId = `rail.tie.bottom.0.post${i}`;
    [-model.rail * 0.28, model.rail * 0.28].forEach((dx, screwIndex) => {
      const stackScrewId = `screw.toteTie.stack.post${i}.${screwIndex}`;
      parts.push(screwPart(stackScrewId, 'doubled depth tie screw', { x: x + dx, y: bottomFrameY[0] - model.stock / 2, z: 0 }, 'y', 1, laminationScrew, radius, { group: 'fasteners', subgroup: 'tie', stageLabel: 'Depth ties', postIndex: i, screwIndex }));
      connections.push(fastenerConnection(`fasten.${stackScrewId}`, lowerTieId, upperTieId, stackScrewId, 'doubled depth tie screw'));
    });
    ['front', 'back'].forEach((side) => {
      const z = side === 'front' ? zFront : zBack;
      const zAttach = z + (side === 'front' ? model.post / 2 : -model.post / 2);
      faceScrewOffsets.forEach((dx, screwIndex) => {
        const tieScrewId = `screw.toteTie.${side}.post${i}.${screwIndex}`;
        parts.push(screwPart(tieScrewId, 'depth tie post screw', { x: postXForIndex(i) + dx, y: bottomFrameY[1] - model.stock / 2, z: zAttach }, 'y', 1, jointScrew, radius, { group: 'fasteners', subgroup: 'tie', stageLabel: 'Depth ties', side, postIndex: i, screwIndex }));
        connections.push(fastenerConnection(`fasten.${tieScrewId}`, upperTieId, `post.${side}.${i}`, tieScrewId, 'depth tie post screw'));
      });
    });
  }

  for (let row = 0; row < model.rows; row += 1) {
    const y = yForRow(row);
    for (let bay = 0; bay < model.columns; bay += 1) {
      [-1, 1].forEach((sideSign) => {
        const sideName = sideSign < 0 ? 'left' : 'right';
        const postIndex = sideSign < 0 ? bay : bay + 1;
        const runnerX = sideSign < 0 ? postXForIndex(bay) + model.stock : postXForIndex(bay + 1) - model.stock;
        const runnerRailId = `rail.runner.row${row}.bay${bay}.${sideName}`;
        const runnerStartX = runnerX - sideSign * model.stock / 2;
        const sideStagger = sideSign < 0 ? -model.rail * 0.16 : model.rail * 0.16;
        ['front', 'back'].forEach((face) => {
          const zEdge = face === 'front' ? zFront - model.post / 2 : zBack + model.post / 2;
          const zOffsetDirection = face === 'front' ? 1 : -1;
          [-runnerYOffset, runnerYOffset].forEach((dy, screwIndex) => {
            const runnerScrewId = `screw.toteRunner.row${row}.bay${bay}.${sideName}.${face}.${screwIndex}`;
            parts.push(screwPart(runnerScrewId, 'runner rail post screw', { x: runnerStartX, y: y + dy + sideStagger, z: zEdge + zOffsetDirection * runnerZInset }, 'x', sideSign, jointScrew, radius, { group: 'fasteners', subgroup: 'runner', stageLabel: 'Runner rails', row, bay, side: sideName, face, screwIndex }));
            connections.push(fastenerConnection(`fasten.${runnerScrewId}`, runnerRailId, `post.${face}.${postIndex}`, runnerScrewId, 'runner rail post screw'));
          });
        });
      });
    }
  }
}

function addToteRackCasters(model, parts, connections, zFront, zBack) {
  const casterInsetX = 3.62 / 2;
  const leftCasterX = -model.width / 2 + model.stock + casterInsetX;
  const rightCasterX = model.width / 2 - model.stock - casterInsetX;
  const casterPositions = [
    ['frontLeft', leftCasterX, zFront],
    ['frontRight', rightCasterX, zFront],
    ['backLeft', leftCasterX, zBack],
    ['backRight', rightCasterX, zBack]
  ];
  casterPositions.forEach(([corner, x, z], index) => {
    const isFront = corner.startsWith('front');
    const casterId = `caster.tote.${corner}`;
    parts.push(assemblyPart(casterId, isFront ? 'locking swivel caster' : 'non-locking swivel caster', 'hardware', { x: 3.62, y: model.casterHeight, z: 2.95 }, { x, y: -model.casterHeight / 2, z }, {
      group: 'hardware',
      kind: 'caster',
      corner,
      locking: isFront,
      plate: { x: 3.62, z: 2.44 },
      wheel: { diameter: 2.95, width: 1.24 },
      height: model.casterHeight
    }));
    const targetRail = `rail.frame.${isFront ? 'front' : 'back'}.bottom.0`;
    connections.push(contactConnection(`contact.${casterId}.base`, casterId, targetRail, 'caster plate mounts under doubled base rail'));
    [
      [-1.35, -0.88],
      [1.35, -0.88],
      [-1.35, 0.88],
      [1.35, 0.88]
    ].forEach(([dx, dz], screwIndex) => {
      const casterScrewId = `screw.toteCaster.${index}.${screwIndex}`;
      parts.push(screwPart(casterScrewId, 'caster mounting screw', { x: x + dx, y: -0.08, z: z + dz }, 'y', 1, 1.25, 0.06, { group: 'fasteners', corner, screwIndex }));
      connections.push(fastenerConnection(`fasten.${casterScrewId}`, casterId, targetRail, casterScrewId, 'caster mounting screw'));
    });
  });
}

export function buildShelfAssembly(model) {
  const xStart = -model.width / 2 + model.stock / 2;
  const postXForIndex = (index) => {
    if (index === 0) return -model.width / 2 + model.post / 2;
    if (index === model.bays) return model.width / 2 - model.post / 2;
    return xStart + index * model.bayStep;
  };
  const zFront = -model.depth / 2 + model.stock / 2;
  const zBack = model.depth / 2 - model.stock / 2;
  const zFrontRail = -model.depth / 2 + model.stock * 1.5;
  const zBackRail = model.depth / 2 - model.stock * 1.5;
  const yForLevel = (level) => model.levels === 1 ? model.height * 0.55 : (model.rail / 2) + level * ((model.height - model.rail) / (model.levels - 1));
  const parts = [];
  const connections = [];

  for (let i = 0; i <= model.bays; i += 1) {
    const x = postXForIndex(i);
    parts.push(assemblyPart(`post.front.${i}`, 'post', 'wood', { x: model.post, y: model.height, z: model.stock }, { x, y: model.height / 2, z: zFront }, { group: 'posts', index: i, side: 'front' }));
    parts.push(assemblyPart(`post.back.${i}`, 'post', 'wood', { x: model.post, y: model.height, z: model.stock }, { x, y: model.height / 2, z: zBack }, { group: 'posts', index: i, side: 'back' }));
  }

  for (let level = 0; level < model.levels; level += 1) {
    const y = yForLevel(level);
    for (let bay = 0; bay < model.bays; bay += 1) {
      const x = xStart + bay * model.bayStep + model.bayStep / 2;
      const frontRailId = `rail.front.level${level}.bay${bay}`;
      const backRailId = `rail.back.level${level}.bay${bay}`;
      parts.push(assemblyPart(frontRailId, 'front rail', 'wood', { x: model.railLength, y: model.rail, z: model.stock }, { x, y, z: zFrontRail }, { group: 'rails', level, bay, side: 'front' }));
      parts.push(assemblyPart(backRailId, 'back rail', 'wood', { x: model.railLength, y: model.rail, z: model.stock }, { x, y, z: zBackRail }, { group: 'rails', level, bay, side: 'back' }));
      connections.push(contactConnection(`contact.${frontRailId}.leftPost`, frontRailId, `post.front.${bay}`, 'rail end bears on front post'));
      connections.push(contactConnection(`contact.${frontRailId}.rightPost`, frontRailId, `post.front.${bay + 1}`, 'rail end bears on front post'));
      connections.push(contactConnection(`contact.${backRailId}.leftPost`, backRailId, `post.back.${bay}`, 'rail end bears on back post'));
      connections.push(contactConnection(`contact.${backRailId}.rightPost`, backRailId, `post.back.${bay + 1}`, 'rail end bears on back post'));
    }
    for (let i = 0; i <= model.bays; i += 1) {
      const x = xStart + i * model.bayStep;
      const sideRailId = `rail.side.level${level}.post${i}`;
      parts.push(assemblyPart(sideRailId, 'side depth rail', 'wood', { x: model.stock, y: model.rail, z: model.depthRailLength }, { x, y, z: 0 }, { group: 'rails', level, postIndex: i, side: 'depth' }));
      connections.push(contactConnection(`contact.${sideRailId}.frontPost`, sideRailId, `post.front.${i}`, 'side rail bears on front post'));
      connections.push(contactConnection(`contact.${sideRailId}.backPost`, sideRailId, `post.back.${i}`, 'side rail bears on back post'));
    }
  }

  const usableDepth = Math.max(model.stock, model.depth - model.stock * 4);
  const slatDepth = model.stock;
  for (let level = 0; level < model.levels; level += 1) {
    const y = yForLevel(level) + model.rail / 2 + slatDepth / 2;
    for (let s = 0; s < model.slats; s += 1) {
      const z = -usableDepth / 2 + (s + 0.5) * (usableDepth / model.slats);
      const slatId = `slat.level${level}.${s}`;
      parts.push(assemblyPart(slatId, 'shelf slat', 'wood', { x: model.slatLength, y: slatDepth, z: Math.min(model.deck, usableDepth / model.slats * 0.82) }, { x: 0, y, z }, { group: 'slats', level, index: s }));
    }
  }

  addShelfScrewParts(model, parts, connections, xStart, yForLevel);
  return { type: 'shelves', units: 'in', parts, connections };
}

function validateShelfConstruction(assembly, warnings) {
  const woodParts = assembly.parts.filter((part) => part.material === 'wood');
  const boxes = woodParts.map(partBox);
  const structuralParts = assembly.parts.filter((part) => isStructuralMaterial(part.material));
  const structuralBoxes = structuralParts.map(partBox);
  const byId = new Map(assembly.parts.map((part) => [part.id, part]));
  const validation = {
    componentOverlaps: findComponentOverlaps({ ...assembly, parts: assembly.parts.filter((part) => part.material !== 'tote' && !part.meta?.intentionalOverlap) }, { limit: 12 })
  };
  if (validation.componentOverlaps.count) {
    const shown = validation.componentOverlaps.items
      .slice(0, 3)
      .map((item) => `${item.partIds[0]} and ${item.partIds[1]}`)
      .join('; ');
    const hidden = validation.componentOverlaps.count > 3 ? `, plus ${validation.componentOverlaps.count - 3} more` : '';
    warnings.push(`Component overlap detected between ${shown}${hidden}; check dimensions or spacing.`);
  }

  const screws = assembly.parts.filter((part) => part.material === 'fastener').map(partBox);
  const screwOverlap = findFirstOverlap(screws);
  validation.screwOverlap = screwOverlap;
  if (screwOverlap) warnings.push(`Screw collision detected between ${screwOverlap.a} and ${screwOverlap.b}; stagger fasteners or reduce screw count.`);

  const fastenersWithHardware = new Set(assembly.connections
    .filter((connection) => connection.type === 'fastenedBy')
    .filter((connection) => !isStructuralMaterial(byId.get(connection.from)?.material) || !isStructuralMaterial(byId.get(connection.to)?.material))
    .map((connection) => connection.fastener));
  const badScrew = screws.find((screw) => !fastenersWithHardware.has(screw.type) && structuralBoxes.filter((board) => overlaps(screw, board, 0.0001)).length < 2);
  validation.badScrew = badScrew || null;
  if (badScrew) warnings.push(`${badScrew.type} does not pass through two structural pieces; check screw placement.`);

  const missingContact = assembly.connections.find((connection) => {
    if (connection.type !== 'contact') return false;
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    return !from || !to || !boxesTouchOrOverlap(partBox(from), partBox(to), 0.002);
  });
  validation.missingContact = missingContact || null;
  if (missingContact) warnings.push(`${missingContact.label} does not touch; check part placement.`);

  const missingFastener = assembly.connections.find((connection) => {
    if (connection.type !== 'fastenedBy') return false;
    const fastener = byId.get(connection.fastener);
    const from = byId.get(connection.from);
    const to = byId.get(connection.to);
    return !fastener || !from || !to || !overlaps(partBox(fastener), partBox(from), 0.0001) || !overlaps(partBox(fastener), partBox(to), 0.0001);
  });
  validation.missingFastener = missingFastener || null;
  if (missingFastener) warnings.push(`${missingFastener.label} is not fastened by its screw; check fastener placement.`);
  return validation;
}

function isStructuralMaterial(material) {
  return material === 'wood' || material === 'sheet';
}

function shelfBoardBoxes(model) {
  return buildShelfAssembly(model).parts.filter((part) => part.material === 'wood').map(partBox);
}

function shelfScrews(model) {
  return buildShelfAssembly(model).parts.filter((part) => part.material === 'fastener').map(partBox);
}

function addShelfScrewParts(model, parts, connections, xStart, yForLevel) {
  const shankLength = model.stock * 1.55;
  const radius = 0.09;
  const railScrewOffset = model.rail * 0.32;
  const endInset = model.stock * 0.25;
  for (let level = 0; level < model.levels; level += 1) {
    const y = yForLevel(level);
    for (let bay = 0; bay < model.bays; bay += 1) {
      const leftX = xStart + bay * model.bayStep + model.stock / 2 + endInset;
      const rightX = xStart + (bay + 1) * model.bayStep - model.stock / 2 - endInset;
      [leftX, rightX].forEach((x, endIndex) => {
        const postIndex = bay + endIndex;
        [-railScrewOffset, railScrewOffset].forEach((dy, index) => {
          const frontId = `screw.front.level${level}.bay${bay}.end${endIndex}.${index}`;
          const backId = `screw.back.level${level}.bay${bay}.end${endIndex}.${index}`;
          parts.push(screwPart(frontId, 'front rail screw', { x, y: y + dy, z: -model.depth / 2 }, 'z', 1, shankLength, radius, { group: 'fasteners', level, bay, endIndex, index, side: 'front' }));
          parts.push(screwPart(backId, 'back rail screw', { x, y: y + dy, z: model.depth / 2 }, 'z', -1, shankLength, radius, { group: 'fasteners', level, bay, endIndex, index, side: 'back' }));
          connections.push(fastenerConnection(`fasten.${frontId}`, `rail.front.level${level}.bay${bay}`, `post.front.${postIndex}`, frontId, 'front rail screw'));
          connections.push(fastenerConnection(`fasten.${backId}`, `rail.back.level${level}.bay${bay}`, `post.back.${postIndex}`, backId, 'back rail screw'));
        });
      });
    }
  }
}

function assemblyPart(id, role, material, size, position, meta = {}) {
  return {
    id,
    role,
    material,
    size,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    meta
  };
}

function screwPart(id, role, start, axis, direction, length, radius, meta = {}) {
  const size = axis === 'z'
    ? { x: radius * 2, y: radius * 2, z: length }
    : axis === 'y'
      ? { x: radius * 2, y: length, z: radius * 2 }
      : { x: length, y: radius * 2, z: radius * 2 };
  const position = axis === 'z'
    ? { x: start.x, y: start.y, z: start.z + direction * length / 2 }
    : axis === 'y'
      ? { x: start.x, y: start.y + direction * length / 2, z: start.z }
      : { x: start.x + direction * length / 2, y: start.y, z: start.z };
  return {
    id,
    role,
    material: 'fastener',
    size,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    meta: { ...meta, axis, direction, length, radius, start }
  };
}

function contactConnection(id, from, to, label) {
  return { id, type: 'contact', from, to, label };
}

function fastenerConnection(id, from, to, fastener, label) {
  return { id, type: 'fastenedBy', from, to, fastener, label };
}

function partBox(part) {
  return box(part.id, part.position.x, part.position.y, part.position.z, part.size.x, part.size.y, part.size.z);
}

function box(type, x, y, z, w, h, d) {
  return {
    type,
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y - h / 2,
    maxY: y + h / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2
  };
}

function screwBox(type, x, y, z, axis, dir, length, radius) {
  if (axis === 'z') return box(type, x, y, z + dir * length / 2, radius * 2, radius * 2, length);
  return box(type, x + dir * length / 2, y, z, length, radius * 2, radius * 2);
}

function findFirstOverlap(boxes) {
  const epsilon = 0.001;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (overlaps(boxes[i], boxes[j], epsilon)) return { a: boxes[i].type, b: boxes[j].type };
    }
  }
  return null;
}

function overlaps(a, b, epsilon) {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  return overlapX > epsilon && overlapY > epsilon && overlapZ > epsilon;
}

function boxesTouchOrOverlap(a, b, tolerance) {
  const gapX = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const gapY = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
  const gapZ = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return gapX <= tolerance && gapY <= tolerance && gapZ <= tolerance;
}

function positive(value, label, errors) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    errors.push(`${label} must be a positive number.`);
    return 0;
  }
  return number;
}

function nonnegative(value, label, errors) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${label} must be zero or a positive number.`);
    return 0;
  }
  return number;
}

function integerAtLeast(value, min, label, errors) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number) || number < min) {
    errors.push(`${label} must be at least ${min}.`);
    return min;
  }
  return number;
}
