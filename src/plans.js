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
    buildSteps: [
      { title: 'Mill and cut the parts', stage: 0, instructions: ['Mill the face and liner stock square and to the listed thicknesses.', 'Cut all face and liner pieces from the cut list, keeping long-point miter measurements grouped by part.', 'Sand inside faces before assembly because they become harder to reach later.'] },
      { title: 'Build the support liner', stage: 4, instructions: ['Dry fit the liner rails into a flat rectangle that matches the inner opening.', 'Glue and clamp the liner assembly, checking diagonals until the frame is square.', 'Keep the front faces flush so the canvas support plane stays even.'] },
      { title: 'Add the outer frame face', stage: 8, instructions: ['Dry fit the face pieces around the liner assembly and confirm the reveal is even on all sides.', 'Glue and clamp the face pieces to the liner, using cauls or spacer blocks to protect the show face.', 'Clean squeeze-out from the inside corner before it hardens.'] },
      { title: 'Set the reveal and canvas', stage: 10, instructions: ['Use spacer blocks to hold the canvas evenly inside the opening.', 'Confirm the canvas face sits at the intended depth and the reveal looks consistent.', 'Make any finish touch-ups before permanently fastening the artwork.'] },
      { title: 'Install mounting hardware', stage: 12, instructions: ['For screws, predrill through the liner into the canvas stretcher and stay within the recommended screw length range.', 'For Z-clips, confirm the selected clip offset matches the support depth before fastening.', 'After mounting, inspect the front reveal one last time before hanging.'] }
    ],
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
    buildSteps: [
      { title: 'Mill the rabbeted frame stock', stage: 1, instructions: ['Mill the frame stock square and cut the rabbet along the inside back edge before cutting final miters.', 'Use a table saw, dado setup, or router table to remove the highlighted rabbet area consistently.', 'Label the inside/back edge of each board so the rabbet orientation stays correct.'] },
      { title: 'Cut and dry fit the frame', stage: 6, instructions: ['Cut the rabbeted face pieces to the cut-list lengths, measuring miters to the long points.', 'Dry fit the outer frame and check that the rabbet ledge forms a continuous support shelf.', 'Fix any twist or mismatched rabbet depth before glue-up.'] },
      { title: 'Seat the strainer rails', stage: 5, instructions: ['Cut the strainer rails and dry fit them on the rabbet ledge.', 'Glue or fasten the strainer rails so they sit flat and do not rock on the ledge.', 'Keep the strainer inner edge aligned to preserve the planned canvas reveal.'] },
      { title: 'Assemble the frame body', stage: 9, instructions: ['Glue and clamp the face frame with the strainer seated in place or ready to drop in after glue-up.', 'Check diagonals and use the canvas or spacer blocks only as a sizing reference, not as a clamp surface.', 'Sand and finish the frame before final artwork mounting.'] },
      { title: 'Mount the canvas', stage: 13, instructions: ['Place spacer blocks around the canvas to hold the reveal.', 'Predrill for screws or install matching Z-clips according to the selected mounting method.', 'Confirm the canvas clears the rabbeted frame face and sits flat against the support.'] }
    ],
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
    buildSteps: [
      { title: 'Cut posts, rails, and shelf slats', stage: 0, instructions: ['Cut all repeated parts from the cut list and sort them by role.', 'Mark shelf level heights on every post as a batch so the shelves line up.', 'Pre-sand slats or sheet decking before installation if the shelf will be hard to reach later.'] },
      { title: 'Stand and brace the posts', stage: 1, instructions: ['Lay out the front and back post lines and stand the posts in their final bay positions.', 'Temporarily clamp or brace the posts plumb before adding rails.', 'Check the full footprint for square before driving structural screws.'] },
      { title: 'Install rails at each level', stage: 2, instructions: ['Fasten front and back rails first, then add the side depth rails at the same height.', 'Use the level marks on the posts to keep each shelf plane consistent.', 'For wide bays, check that the rails do not sag before adding decking.'] },
      { title: 'Add shelf slats or decking', stage: 3, instructions: ['Place shelf slats evenly across each level or install sheet decking as planned.', 'Fasten each slat to the supporting rails so the shelf surface acts as a tied assembly.', 'Leave practical gaps for dust and airflow if using individual slats.'] },
      { title: 'Final fasteners and anchoring', stage: 4, instructions: ['Add remaining screws at rail-to-post joints and check for racking.', 'Install wall anchors or anti-tip hardware if the shelf will carry tall or heavy loads.', 'Load the shelf gradually and recheck fasteners after the first use.'] }
    ],
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
    buildSteps: [
      { title: 'Cut and sort the short-stock parts', stage: 0, instructions: ['Cut lower posts, upper posts, splice plates, top sister plates, caster blocks, rails, braces, and shelf planks from 4 ft stock.', 'Keep each corner post bundle together so the lower, upper, splice, top plate, and caster block parts stay paired.', 'Drill pocket holes in the rails before assembly where the cut list notes call for them.'] },
      { title: 'Build the four corner post assemblies', stage: 1, instructions: ['Join each lower and upper post with its sister splice plate, keeping the post faces flush and straight.', 'Add the top rail sister plate and lower caster mounting block to each corner post assembly.', 'Clamp the doubled sections tightly before driving structural screws.'] },
      { title: 'Connect the shelf rails', stage: 2, instructions: ['Stand the four corner assemblies and connect them with front, back, and side rails at each shelf level.', 'Use pocket-hole screws from the inside faces where possible so exposed sides stay cleaner.', 'Check the frame for square after each level, not just at the end.'] },
      { title: 'Install shelf planks and center supports', stage: 3, instructions: ['Add center supports at each level before installing the planks.', 'Install the front and back end planks, then fill the middle planks across the shelf depth.', 'Fasten planks to side rails and center supports so each level stiffens the rolling frame.'] },
      { title: 'Add gussets, casters, and final fasteners', stage: 4, instructions: ['Install diagonal gusset braces to reduce racking before the shelf is moved.', 'Mount locking casters at the front and non-locking casters at the rear using the doubled caster blocks.', 'Set the shelf upright, lock the front wheels, and test roll it empty before loading.'] }
    ],
    tags: ['storage', 'rolling', 'casters', '48 in cuts'],
    thumbnail: 'rolling-shelves'
  },
  {
    id: 'tote-rack-27',
    title: '27 Gallon Tote Rack',
    family: 'Storage',
    status: 'ready',
    build: 'tote-rack',
    defaults: { build: 'tote-rack', toteW: 20.5, toteLipWidth: 1.25, toteD: 30.5, toteH: 14.25, toteColumns: 3, toteRows: 3, toteSideClearance: 1.5, toteVerticalClearance: 3, toteRailInset: 1.25, shelfPost: 3.5, shelfRail: 3.5, shelfDeck: 1.5 },
    summary: 'A slide-in rack sized for common 27 gallon totes, with adjustable tote dimensions and clearances.',
    materials: '2x4 posts and rails, screws, optional anti-tip anchors',
    details: {
      description: 'A garage or basement rack for black-and-yellow 27 gallon storage totes. The default tote size matches a common published 30.5 in L x 20.5 in W x 14.25 in H bin, but the rack recalculates from the actual tote length, width, height, and lid lip width entered by the user.',
      materials: ['2x4 posts and horizontal rails', 'Structural screws or lag screws', 'Actual 27 gallon totes for test fitting', 'Optional wall anchors or anti-tip straps'],
      tools: ['Miter saw or circular saw', 'Drill/driver', 'Tape measure and square', 'Clamps', 'Level'],
      notes: ['Measure the tote at the widest lid/lip, not just the tapered base.', 'Measure the horizontal lip width separately; the post spacing follows the full tote width while the runner spacing follows the narrower body under the lip.', 'Leave enough vertical clearance to lift the front lip slightly as the tote slides in and out.', 'Heavy totes should be tested gradually; add wall anchoring for tall racks.']
    },
    buildSteps: [
      { title: 'Measure one real tote', stage: 0, instructions: ['Measure the tote length, width, and height at its largest outside dimensions, usually across the lid lip.', 'Measure how far the lip projects inward from each side; enter that as the tote lip width so the runners support the lip while clearing the tapered body.', 'Enter those dimensions in the Tote Size controls before cutting rack parts.', 'Confirm the row and column count fits the wall space and ceiling height.'] },
      { title: 'Cut posts and rails', stage: 1, instructions: ['Cut the vertical posts and horizontal tote support rails from the generated cut list.', 'Mark every rail height on the posts as a batch so matching rails line up front-to-back.', 'Keep rails for each row grouped together.'] },
      { title: 'Build the side frames', stage: 2, instructions: ['Lay out left and right side frames with matching post spacing and row heights.', 'Fasten the depth rails to the posts, keeping the rail tops level from front to back.', 'Check both side frames for square before standing them up.'] },
      { title: 'Connect the rack width', stage: 3, instructions: ['Stand the side frames and connect them with front and back rails for each tote bay.', 'Use the tote width plus side clearance to maintain consistent bay spacing.', 'Anchor or brace the rack if it racks side-to-side.'] },
      { title: 'Test fit totes and anchor', stage: 4, instructions: ['Slide an empty tote into each row and confirm the lip clears the rails.', 'Adjust rail inset or clearance if your tote shape binds.', 'Anchor tall racks to the wall before loading heavy totes.'] }
    ],
    tags: ['storage', 'totes', '27 gallon', 'adjustable'],
    thumbnail: 'tote-rack'
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
  if (build === 'tote-rack') return 'tote-rack-27';
  if (build === 'rolling-shelves') return 'rolling-storage-shelf';
  if (build === 'shelves') return 'basement-shelves';
  return build === 'strainer' ? 'frame-strainer' : 'frame-liner';
}
