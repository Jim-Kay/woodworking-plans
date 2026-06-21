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
    thumbnail: 'frame-liner',
    media: {
      thumbnail: { type: 'capture' },
      overallAnimation: { type: 'frame-stage-sequence' },
      stepAnimation: { type: 'frame-stage-sequence' }
    }
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
    thumbnail: 'frame-strainer',
    media: {
      thumbnail: { type: 'capture' },
      overallAnimation: { type: 'frame-stage-sequence' },
      stepAnimation: { type: 'frame-stage-sequence' }
    }
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
      description: 'A fixed storage shelf plan for garages, basements, or utility spaces. The design uses repeated bays, vertical posts, continuous front/back rails, shorter side rails, and shelf slats to produce a straightforward cut list for common construction lumber.',
      materials: ['2x lumber for posts and rails', 'Shelf slats or sheet-good decking', 'Structural screws', 'Optional wall anchors or anti-tip hardware'],
      tools: ['Circular saw or miter saw', 'Drill/driver', 'Tape measure and square', 'Clamps'],
      notes: ['Best for full-length stock where long shelf slats and continuous front/back rails are practical.', 'Increase bay count or rail size when spans get wide or loads are heavy.']
    },
    buildSteps: [
      { title: 'Cut and mark the parts', stage: 0, image: 'cut-layout', instructions: ['Cut posts, full-width front rails, full-width back rails, shorter side depth rails, and shelf slats from the generated cut list.', 'Sort parts by shelf level and rail direction so the bottom shelf parts are easy to grab first.', 'Mark every shelf height on the posts as a batch before assembly; matching marks are easier to keep level than measuring each rail one at a time.'] },
      { title: 'Build the bottom shelf frame flat on the floor', stage: 2, image: { type: 'animation-still', animation: 'shelf-base-frame', progress: 0.92 }, animation: { type: 'shelf-base-frame' }, instructions: ['Lay the bottom-most continuous back rail, continuous front rail, and left/right side depth rails on the ground in their final footprint.', 'Square the rectangle by checking diagonals before fastening the corners.', 'Fasten the bottom shelf rails together while the assembly is still flat and easy to clamp.'] },
      { title: 'Install the bottom shelf slats', stage: 3, image: { type: 'animation-still', animation: 'shelf-bottom-slats', progress: 0.92 }, animation: { type: 'shelf-bottom-slats' }, instructions: ['Place the bottom shelf slats or decking on the completed bottom rail frame.', 'Fasten each slat to the supporting rails so the bottom shelf becomes a rigid platform.', 'Re-check that the base is square before using it to locate the posts.'] },
      { title: 'Attach the corner posts to the base', stage: 1, image: { type: 'animation-still', animation: 'shelf-corner-posts', progress: 0.92 }, animation: { type: 'shelf-corner-posts' }, instructions: ['Stand the four corner posts on the outside corners of the bottom shelf frame.', 'Clamp or hold each corner post plumb, then fasten it to the bottom front/back rails and side depth rails.', 'Use the completed bottom shelf as the layout reference instead of trying to clamp all posts in free space.'] },
      { title: 'Start the second shelf level', stage: 2, image: { type: 'animation-still', animation: 'shelf-second-frame', progress: 0.92 }, animation: { type: 'shelf-second-frame' }, instructions: ['At the next shelf-height marks, install the side depth rails that connect the outer corner posts first.', 'Install the continuous front and back rails for the same shelf level, using the side rails to keep the corner posts held at the correct depth.', 'Add the non-corner front and back posts against the rail locations, then install the remaining side depth rails for that level.'] },
      { title: 'Deck the second shelf level', stage: 3, image: { type: 'animation-still', animation: 'shelf-second-slats', progress: 0.92 }, animation: { type: 'shelf-second-slats' }, instructions: ['Place the second shelf slats after the second-level rails and intermediate posts are fastened.', 'Fasten the slats to the front/back rails and side depth rails so the shelf level locks the frame square.', 'Check the posts for plumb and the shelf for level before building higher.'] },
      { title: 'Repeat shelf-by-shelf upward', stage: 3, image: { type: 'animation-still', animation: 'shelf-repeat-upward', progress: 0.92 }, animation: { type: 'shelf-repeat-upward' }, instructions: ['For each remaining shelf, repeat the same order: side depth rails at the corner posts, continuous front/back rails, non-corner posts, remaining side depth rails, then shelf slats.', 'Work one shelf level at a time so each completed shelf stiffens the assembly before the next level is added.', 'Keep checking level, plumb, and square as the shelf gets taller.'] },
      { title: 'Final fasteners and anchoring', stage: 4, image: { type: 'animation-still', animation: 'shelf-final-fasteners', progress: 0.92 }, animation: { type: 'shelf-final-fasteners' }, instructions: ['Add any remaining screws at rail-to-post and slat-to-rail joints.', 'Install wall anchors or anti-tip hardware if the shelf will carry tall or heavy loads.', 'Load the shelf gradually from the bottom up and recheck fasteners after the first use.'] }
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
      { title: 'Build the four corner post assemblies', stage: 1, animation: { type: 'rolling-post-assemblies' }, instructions: ['Join each lower and upper post with its sister splice plate, keeping the post faces flush and straight.', 'Add the top rail sister plate and lower caster mounting block to each corner post assembly.', 'Clamp the doubled sections tightly before driving structural screws.'] },
      { title: 'Connect the shelf rails', stage: 2, animation: { type: 'rolling-rails' }, instructions: ['Stand the four corner assemblies and connect them with front, back, and side rails at each shelf level.', 'Use pocket-hole screws from the inside faces where possible so exposed sides stay cleaner.', 'Check the frame for square after each level, not just at the end.'] },
      { title: 'Install shelf planks and center supports', stage: 3, animation: { type: 'rolling-deck' }, instructions: ['Add center supports at each level before installing the planks.', 'Install the front and back end planks, then fill the middle planks across the shelf depth.', 'Fasten planks to side rails and center supports so each level stiffens the rolling frame.'] },
      { title: 'Add gussets, casters, and final fasteners', stage: 4, animation: { type: 'rolling-finish' }, instructions: ['Install diagonal gusset braces to reduce racking before the shelf is moved.', 'Mount locking casters at the front and non-locking casters at the rear using the doubled caster blocks.', 'Set the shelf upright, lock the front wheels, and test roll it empty before loading.'] }
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
    defaults: { build: 'tote-rack', toteW: 20.5, toteLipWidth: 1.5, toteD: 30.5, toteH: 14.25, toteColumns: 3, toteRows: 3, toteSideClearance: 0.25, toteVerticalClearance: 3, toteRailInset: 1.25, shelfPost: 3.5, shelfRail: 3.5, shelfDeck: 1.5 },
    summary: 'A slide-in rack sized for common 27 gallon totes, with adjustable tote dimensions and clearances.',
    materials: '2x4 posts and rails, screws, optional anti-tip anchors',
    details: {
      description: 'A garage or basement rack for black-and-yellow 27 gallon storage totes. The default tote size matches a common published 30.5 in L x 20.5 in W x 14.25 in H bin, but the rack recalculates from the actual tote length, width, height, and lid lip width entered by the user.',
      materials: ['2x4 posts and horizontal rails', 'Structural screws or lag screws', 'Actual 27 gallon totes for test fitting', 'Optional wall anchors or anti-tip straps'],
      tools: ['Miter saw or circular saw', 'Drill/driver', 'Tape measure and square', 'Clamps', 'Level'],
      notes: ['Measure the tote at the widest lid/lip, not just the tapered base.', 'Measure the horizontal lip width separately; the post spacing follows the full tote width while the runner spacing follows the narrower body under the lip.', 'The default side gap leaves 1/4 in between the lid edge and each post, plus about 1/4 in between the tote neck and each runner when the lip is 1-1/2 in wide.', 'Leave enough vertical clearance to lift the front lip slightly as the tote slides in and out.', 'Heavy totes should be tested gradually; add wall anchoring for tall racks.']
    },
    buildSteps: [
      { title: 'Measure a real tote and set clearances', stage: 0, dimensionContext: 'overall', instructions: ['Measure the tote length, width, and height at the widest outside dimensions, usually across the lid lip.', 'Measure the lip width separately; this controls neck clearance and how much lip bears on the runner rails.', 'Enter the measurements, row count, column count, and lid side gap before cutting anything.', 'Confirm the summary shows at least 1/4 in neck clearance and about 1 in of lip bearing on each runner.'] },
      { title: 'Cut and label the parts', stage: 2, image: 'cut-layout', instructions: ['Cut the vertical posts, full-width top and bottom frame rails, end depth tie rails, tote runner rails, and any generated back diagonal braces from the generated cut list.', 'Label front and back posts by column position so each runner row lines up across the rack.', 'Mark every runner height on all posts before assembly; matching marks are easier to keep square than measuring each rail one at a time.', 'Pre-drill screw locations near rail ends to reduce splitting.'] },
      { title: 'Assemble the front and back frames', stage: 1, dimensionContext: 'post', images: [{ type: 'front-frame', phase: 1 }, { type: 'front-frame', phase: 2 }, { type: 'front-frame', phase: 3 }], animation: { type: 'front-frame' }, instructions: ['Build the front frame flat on the floor with {postCountPerFrame} posts standing on the first bottom frame rail.', 'Use {frameRailLength} top and bottom frame rails, with {postClearWidth} clear between each pair of posts.', 'Screw through the first bottom rail into each post, then screw down through the top rail into each post.', 'After those joints are fastened, add the second bottom rail under the first and screw upward through it into the first rail.', 'Build the back frame the same way, then connect the left and right ends with the doubled end depth ties before checking the rack for square.'] },
      { title: 'Install runner rails row by row', stage: 2, dimensionContext: 'runner', animation: { type: 'runner-rails' }, instructions: ['Install two front-to-back runner rails for each tote bay; do not share one runner between neighboring totes.', 'Place each runner directly against its post so the inside clear width follows the calculated tote neck clearance.', 'Work from the bottom row upward, checking that matching left and right runners are level front-to-back.', 'Drive screws diagonally from opposite sides where rails meet posts so fasteners do not collide.', 'The runner rails provide the intermediate front-to-back rigidity, so no interior bottom depth ties are needed.'] },
      { title: 'Test fit empty totes', stage: 5, dimensionContext: 'runner', animation: { type: 'tote-fit' }, instructions: ['Slide an empty tote into every bay before loading the rack.', 'The lid lip should sit on both runners, while the tapered neck below the lip clears the runner rails.', 'Push the tote gently left and right; it should not be able to drop between the runner rails.', 'If a tote binds, re-check lip width, lid side gap, and runner clear width before adding more fasteners.'] },
      { title: 'Add back bracing', stage: 3, instructions: ['For wide racks, square the rack and fasten the generated 1x4 diagonal braces across the back face.', 'Cut mitered brace ends so the two center ends meet cleanly and the outside ends line up with the outside frame edges.', 'Fasten each brace end directly into a back post, keeping the brace clear of tote openings and runner screws.'] },
      { title: 'Add casters or anchors', stage: 4, animation: { type: 'casters' }, instructions: ['If the rack needs to roll, mount locking casters at the front and non-locking casters at the back under the doubled bottom frame rails.', 'On 4-column and wider racks, add the generated front-center and back-center casters to support the long base rails near midspan.', 'Keep caster plates fully supported by the doubled base and use all mounting holes.', 'If the rack will be stationary or tall, skip casters and anchor the rack to wall framing with anti-tip hardware.', 'Test movement or anchoring while the rack is empty.'] },
      { title: 'Final load and inspection', stage: 999, animation: { type: 'final-load' }, instructions: ['Load totes gradually, starting with the lower rows and heaviest totes near the bottom.', 'Confirm the rack does not rack side-to-side after loading each row.', 'Keep total weight within the capacity of the lumber, screws, casters, and floor surface.', 'Re-check screws after the first few uses, especially if the rack is rolled while loaded.'] }
    ],
    tags: ['storage', 'totes', '27 gallon', 'adjustable'],
    thumbnail: 'tote-rack'
  },
  {
    id: 'generated-tray-bird-feeder',
    title: 'Generated Tray Bird Feeder',
    family: 'Generated Plans',
    status: 'ready',
    build: 'generated-tray-bird-feeder',
    defaults: { build: 'generated-tray-bird-feeder', feederW: 12, feederD: 8, feederSideH: 1.5, feederBottomT: 0.75, feederSideT: 0.75, feederMaterial: 'cedar_fence_picket', feederHanging: true, feederDrainage: true },
    summary: 'A simple cedar tray feeder with low sides, drainage holes, and corner holes for hanging cord or chain.',
    materials: 'Cedar or outdoor-friendly stock, screws, cord or chain',
    details: {
      description: 'A beginner-friendly outdoor tray feeder sized for small birds and quick weekend assembly. The open tray holds seed, the low rails help keep feed contained, drainage holes let rainwater escape, and four rim holes provide locations for cord or chain if you want to hang it.',
      materials: ['Cedar fence picket or other outdoor-friendly stock', 'Exterior screws or brads', 'Cord, chain, or hanging wire', 'Exterior-safe finish if desired'],
      tools: ['Saw', 'Drill/driver', 'Clamps', 'Sander'],
      notes: ['The blue guide marks in the 3D view are drill locations, not screws.', 'Drainage holes are recommended for outdoor use.', 'Use exterior-rated fasteners and hang from cord, light chain, or wire sized for the loaded feeder.']
    },
    tags: ['bird feeder', 'outdoor', 'cedar', 'weekend build'],
    thumbnail: 'bird-feeder'
  },
  {
    id: 'generated-wall-key-rack',
    title: 'Generated Wall Key Rack',
    family: 'Generated Plans',
    status: 'ready',
    build: 'generated-wall-key-rack',
    defaults: { build: 'generated-wall-key-rack', rackW: 18, rackH: 4, rackT: 0.75, rackHookCount: 5, rackHookSpacing: 3, rackEndInset: 1.5, rackMaterial: 'pine_1x4', rackHardware: 'screw_hook', rackMountingHoles: true },
    summary: 'A simple wall-mounted key rack composed from reusable panel, hook array, mounting-hole, spacing, and build-step components.',
    materials: 'Pine 1x4 back board, screw hooks, wall screws or anchors',
    details: {
      description: 'A beginner-friendly wall key rack generated from the reusable board-with-linear-hardware composition. One flat back board carries a centered row of hooks plus two wall mounting holes, with layout and drilling steps kept separate so the builder can mark everything before installing hardware.',
      materials: ['Pine 1x4 or similar flat board', 'Five screw hooks or small pegs', 'Wall screws and anchors appropriate for the wall', 'Finish if desired'],
      tools: ['Saw', 'Drill/driver', 'Tape measure', 'Square', 'Sander'],
      notes: ['This plan uses the generic board-with-linear-hardware template, not a one-off key rack generator.', 'Mark hook locations from the centerline before drilling pilot holes.', 'Mount into wall framing where possible, or use anchors rated for the expected load.']
    },
    tags: ['generated', 'key rack', 'hooks', 'component composition'],
    thumbnail: 'key-rack'
  },
  {
    id: 'generated-wall-mail-organizer',
    title: 'Generated Wall Mail Organizer',
    family: 'Generated Plans',
    status: 'ready',
    build: 'generated-wall-mail-organizer',
    defaults: {
      build: 'generated-wall-mail-organizer',
      organizerW: 18,
      organizerH: 10,
      organizerBoardT: 0.75,
      organizerPocketD: 2.5,
      organizerPocketH: 4,
      organizerPocketLipH: 1.5,
      organizerPocketStockT: 0.5,
      organizerHookCount: 5,
      organizerHookSpacing: 3,
      organizerEndInset: 1.5,
      organizerMountingHoles: true,
      organizerMountHoleD: 0.1875,
      organizerPilotHoleD: 0.125,
      organizerHookProjection: 1.25,
      organizerMaterial: 'pine_1x6',
      organizerPocketMaterial: 'thin_plywood',
      organizerHardware: 'screw_hook'
    },
    summary: 'A wall-mounted organizer with a shallow mail pocket, hook row, and wall-mount layout generated from reusable pocket and hardware components.',
    materials: 'Pine 1x6 back board, thin plywood pocket parts, screw hooks, wall screws or anchors',
    details: {
      description: 'A generated entry organizer that combines a flat back board, a shallow front mail pocket, a lower hook row, and mounting-hole layout into one compact wall project. The pocket assembly, hook spacing, and drill guidance are driven by reusable generated-design components rather than a one-off bespoke plan.',
      materials: ['Pine 1x6 or similar flat back board', 'Thin plywood or similar stock for the pocket bottom, cheeks, and lip', 'Five screw hooks or pegs', 'Wall screws and anchors appropriate for the wall', 'Finish if desired'],
      tools: ['Saw', 'Drill/driver', 'Tape measure', 'Square', 'Sander'],
      notes: ['Assemble the shallow pocket before installing hooks so the hook line stays clear of pocket fasteners.', 'Mount into wall framing where possible, or use anchors rated for the expected load.', 'Deep pockets may need stronger fastening than the default light-duty organizer use case.']
    },
    tags: ['generated', 'entry organizer', 'mail pocket', 'hooks', 'component composition'],
    thumbnail: 'generated-wall-mail-organizer',
    media: {
      thumbnail: { type: 'capture' }
    }
  },
  {
    id: 'generated-two-step-stool',
    title: 'Generated Two-Step Stool',
    family: 'Generated Plans',
    status: 'ready',
    build: 'generated-two-step-stool',
    defaults: {
      build: 'generated-two-step-stool',
      stoolW: 16,
      stoolD: 16,
      stoolH: 16,
      stoolLowerStepH: 8,
      stoolLowerStepD: 8,
      stoolUpperStepD: 8,
      stoolTreadT: 0.75,
      stoolLegW: 1.5,
      stoolLegD: 1.5,
      stoolRailH: 1.5,
      stoolRailT: 0.75,
      stoolMaterial: 'pine'
    },
    summary: 'A compact two-step stool generated from reusable tread, leg-post, rail, and load-safety components.',
    materials: 'Pine or hardwood stock, glue, structural screws or joinery selected by the builder',
    details: {
      description: 'A generated two-step stool plan based on the reusable stool template created from multi-image reference testing. It produces a dimensional cut list, staged build views, and explicit load-safety warnings, but it is not a certified standing platform until the material, joinery, and fasteners are reviewed by a qualified person.',
      materials: ['Pine or hardwood treads', 'Square leg stock', 'Apron and stretcher rail stock', 'Wood glue', 'Structural screws, dowels, or other suitable joinery'],
      tools: ['Saw', 'Drill/driver', 'Square', 'Clamps', 'Sander'],
      notes: ['This plan uses the generic two-step-stool template, not a one-off coded product copy.', 'Generated step stools are dimensional aids only and are not load-certified.', 'Confirm joinery, fasteners, anti-slip treatment, and real weight capacity before standing on the build.']
    },
    tags: ['generated', 'step stool', 'treads', 'component composition'],
    thumbnail: 'asset:assets/thumbnails/two-step-stool-variant.png'
  },
  {
    id: 'generated-extension-leaf-table',
    title: 'Generated Extension Leaf Table',
    family: 'Generated Plans',
    status: 'ready',
    build: 'generated-extension-leaf-table',
    defaults: {
      build: 'generated-extension-leaf-table',
      tableOverallL: 75.5,
      tableCenterL: 51.5,
      tableLeafD: 12,
      tableLeafCount: 2,
      tableW: 40,
      tableTopT: 1.75,
      tableH: 30.5,
      tableLegSize: 3.75,
      tableBaseClearL: 64.25,
      tableApronH: 3.5,
      tableApronT: 1.5,
      tableSupportArmCount: 2,
      tableSupportArmExt: 16.5,
      tableSlideTravel: 12,
      tableSupportArmW: 1.5,
      tableSupportArmH: 1.5,
      tableTopMaterial: 'oak_tabletop_stock',
      tableBaseMaterial: 'oak_leg_and_apron_stock',
      tableFinish: 'clear_or_dark_table_finish'
    },
    summary: 'A photo-derived dining or work table concept with a fixed center top, two 12 in end leaves, and retractable slide-out support arms.',
    materials: 'Hardwood tabletop stock, leg and apron stock, rated table-leaf slides or heavy slide hardware, tabletop fasteners',
    details: {
      description: 'An advanced generated plan for an extension-leaf table similar to the photographed build: a fixed center tabletop on a leg-and-apron base, removable end leaves, and pull-out support arms that deploy under each leaf. It is useful for studying the mechanism and producing a dimensional cut list, but it requires human review of slide ratings, joinery, and load capacity before real use.',
      materials: ['Hardwood or furniture-grade tabletop stock', 'Square leg stock and apron rail stock', 'Rated table-leaf slide hardware or engineered heavy-duty slide supports', 'Tabletop fasteners or elongated screw holes for wood movement', 'Alignment pins, stops, latches, and finish as selected by the builder'],
      tools: ['Table saw or track saw', 'Miter saw', 'Drill/driver', 'Router or dado tools for joinery as selected', 'Clamps', 'Square', 'Level'],
      notes: ['This is a draft generated concept from multi-photo reference, not a certified structural plan.', 'Drawer slides are not automatically rated for vertical leaf loads; use rated hardware or add mechanical support legs/brackets.', 'Test the slide path empty before fitting leaves, then test leaves gradually while checking for sag, binding, and fastener movement.']
    },
    tags: ['generated', 'table', 'extension leaf', 'slides', 'advanced'],
    thumbnail: 'generated-extension-leaf-table',
    media: {
      thumbnail: { type: 'capture' }
    }
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
  if (build === 'generated-tray-bird-feeder') return 'generated-tray-bird-feeder';
  if (build === 'generated-wall-key-rack') return 'generated-wall-key-rack';
  if (build === 'generated-wall-mail-organizer') return 'generated-wall-mail-organizer';
  if (build === 'generated-two-step-stool') return 'generated-two-step-stool';
  if (build === 'generated-extension-leaf-table') return 'generated-extension-leaf-table';
  if (build === 'tote-rack') return 'tote-rack-27';
  if (build === 'rolling-shelves') return 'rolling-storage-shelf';
  if (build === 'shelves') return 'basement-shelves';
  return build === 'strainer' ? 'frame-strainer' : 'frame-liner';
}
