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
