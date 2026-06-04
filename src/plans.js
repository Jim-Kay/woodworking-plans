export const PLAN_CATALOG = [
  {
    id: 'frame-liner',
    title: 'Floating Frame: Liner Rails',
    family: 'Floating Frames',
    status: 'ready',
    build: 'liner',
    defaults: { build: 'liner', face: 1.5, depth: 1.25, reveal: 0.125 },
    summary: 'A full-depth support liner that sits behind the frame face and carries the canvas.',
    materials: 'Hardwood frame, liner stock, screws or Z-clips',
    details: {
      description: 'A floating canvas frame built with separate face pieces and full-depth liner rails behind the opening. This is the most approachable frame plan because the support rails are simple rectangular stock rather than a rabbeted profile.',
      materials: ['Hardwood or paint-grade frame stock', 'Liner rail stock', 'Canvas or panel artwork', 'Mounting screws or compatible Z-clips', 'Glue and finish'],
      tools: ['Miter saw or table saw sled for 45 degree miters', 'Drill/driver', 'Clamps', 'Sander'],
      notes: ['Best for builders who want a floating reveal without milling a rabbet.', 'Z-clip mounting requires matching the frame depth and support rail setback to the selected clip offset.']
    },
    tags: ['canvas', 'frame', 'miter', 'cut list'],
    thumbnail: 'frame-liner'
  },
  {
    id: 'frame-strainer',
    title: 'Floating Frame: Strainer on Rabbet',
    family: 'Floating Frames',
    status: 'ready',
    build: 'strainer',
    defaults: { build: 'strainer', face: 0.5, depth: 3, reveal: 0.25, strainerDepth: 0.5 },
    summary: 'A lighter floating frame with a rabbeted face and a thinner strainer seated on the ledge.',
    materials: 'Rabbeted frame stock, strainer rails, screws or Z-clips',
    details: {
      description: 'A floating canvas frame with a rabbet cut into the back of the frame face so a thinner strainer rail can sit on the ledge. It uses less support stock than the liner-rail version, but it assumes the builder can mill an accurate rabbet.',
      materials: ['Hardwood frame stock thick enough for the rabbet', 'Strainer rail stock', 'Canvas or panel artwork', 'Mounting screws or compatible Z-clips', 'Glue and finish'],
      tools: ['Table saw with dado blade or repeated passes', 'Router table with rabbet bit as an alternative', 'Miter saw or table saw sled', 'Drill/driver', 'Clamps'],
      notes: ['Choose this plan when you can safely cut a consistent rabbet before assembly.', 'Check the rabbet width and strainer depth against the canvas thickness so the support ledge remains usable.']
    },
    tags: ['canvas', 'frame', 'rabbet', 'lighter build'],
    thumbnail: 'frame-strainer'
  },
  {
    id: 'basement-shelves',
    title: 'Basement Storage Shelves',
    family: 'Storage',
    status: 'ready',
    build: 'shelves',
    defaults: { build: 'shelves', shelfW: 96, shelfH: 72, shelfD: 24, shelfLevels: 4, shelfBays: 3, shelfSlats: 5, shelfPost: 3.5, shelfRail: 3.5, shelfDeck: 3.5 },
    summary: 'Adjustable garage or basement shelving with bays, uprights, shelf levels, and board counts.',
    materials: '2x lumber, shelf slats or sheet goods, structural screws',
    details: {
      description: 'A fixed storage shelf plan for garages, basements, or utility spaces. The design uses repeated bays, vertical posts, front/back rails, side rails, and shelf slats to produce a straightforward cut list for common construction lumber.',
      materials: ['2x lumber for posts and rails', 'Shelf slats or sheet-good decking', 'Structural screws', 'Optional wall anchors or anti-tip hardware'],
      tools: ['Circular saw or miter saw', 'Drill/driver', 'Tape measure and square', 'Clamps'],
      notes: ['Best for full-length stock where long shelf slats and rails are practical.', 'Increase bay count or rail size when spans get wide or loads are heavy.']
    },
    tags: ['storage', 'shelves', '2x lumber'],
    thumbnail: 'shelves'
  },
  {
    id: 'rolling-storage-shelf',
    title: 'Rolling Storage Shelf',
    family: 'Storage',
    status: 'ready',
    build: 'rolling-shelves',
    defaults: { build: 'rolling-shelves', shelfW: 48, shelfH: 77, shelfD: 24, shelfLevels: 4, shelfBays: 1, shelfSlats: 6, shelfPost: 3.5, shelfRail: 3.5, shelfDeck: 3.5 },
    summary: 'A tall mobile shelf sized for a 6 ft 5 in height limit and 48 in maximum lumber cuts.',
    materials: '2x4 frame sections, 1x4 shelf planks, gussets, locking swivel casters',
    details: {
      description: 'A mobile storage shelf designed around short stock: no main cut is intended to exceed 48 in. The vertical posts are split into lower and upper sections with sistered splice plates, so the shelf can be built by someone limited to 4 ft 2x4 material.',
      materials: ['4 ft 2x4 sections for posts, rails, splice plates, caster blocks, and braces', '1x4 shelf planks up to 48 in long', 'Locking swivel casters for the front', 'Non-locking swivel casters for the rear', 'Pocket-hole screws and structural screws'],
      tools: ['Miter saw or circular saw', 'Pocket-hole jig', 'Drill/driver', 'Clamps', 'Square'],
      notes: ['The default height targets a 6 ft 5 in overall limit including casters.', 'The doubled caster blocks and sister splice plates are part of the short-stock strategy, not decorative parts.']
    },
    tags: ['storage', 'rolling', 'casters', '48 in cuts'],
    thumbnail: 'rolling-shelves'
  }
];

export function getPlanDefinition(id) {
  return PLAN_CATALOG.find((item) => item.id === id) || PLAN_CATALOG[0];
}

export function resolvePlanId(id) {
  return getPlanDefinition(id).id;
}

export function buildForPlanId(id) {
  return getPlanDefinition(id).build || 'liner';
}

export function planIdForBuild(build) {
  if (build === 'rolling-shelves') return 'rolling-storage-shelf';
  if (build === 'shelves') return 'basement-shelves';
  return build === 'strainer' ? 'frame-strainer' : 'frame-liner';
}
