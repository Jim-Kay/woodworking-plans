const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
const INCH_TO_METER = 0.0254;
const MIN_SIZE = 0.001;
const CONTACT_TOLERANCE = 0.08;

let rapierPromise;

export async function runPhysicsDiagnostic(plan, result, options = {}) {
  if (!result?.assembly?.parts?.length) {
    return {
      ok: false,
      summary: 'No assembly model is available for this plan yet.',
      details: ['The physics check needs the shared parts-and-connections model.']
    };
  }

  const RAPIER = await loadRapier();
  const gravityKey = options.gravity || '-y';
  const world = new RAPIER.World(scaleGravity(gravityVector(gravityKey)));
  if (world.integrationParameters) {
    world.integrationParameters.numSolverIterations = Math.max(world.integrationParameters.numSolverIterations || 0, 24);
    world.integrationParameters.numAdditionalFrictionIterations = Math.max(world.integrationParameters.numAdditionalFrictionIterations || 0, 8);
  }
  const assembly = result.assembly;
  const physicalParts = assembly.parts.filter(isPhysicalPart);
  const bounds = assemblyBounds(physicalParts);
  const bodies = new Map();
  const partMap = new Map(assembly.parts.map((part) => [part.id, part]));

  physicalParts.forEach((part) => {
    const fixed = touchesGravityFloor(part, bounds, gravityKey);
    const bodyDesc = fixed ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
    const position = scalePoint(part.position);
    bodyDesc.setTranslation(position.x, position.y, position.z);

    const body = world.createRigidBody(bodyDesc);
    const size = vectorObject(part.size);
    const collider = RAPIER.ColliderDesc.cuboid(
      Math.max(MIN_SIZE, size.x) * INCH_TO_METER / 2,
      Math.max(MIN_SIZE, size.y) * INCH_TO_METER / 2,
      Math.max(MIN_SIZE, size.z) * INCH_TO_METER / 2
    );
    if (part.meta?.intentionalOverlap) collider.setSensor(true);
    world.createCollider(collider, body);
    bodies.set(part.id, { body, fixed, part, start: position });
  });

  addFloor(world, RAPIER, bounds, gravityKey);

  const fastenerLinks = linkPartsByFasteners(assembly);
  const contactLinks = linkPartsByContacts(assembly);
  let jointsCreated = 0;
  fastenerLinks.forEach((link) => {
    const partIds = link.partIds.filter((partId) => bodies.has(partId));
    if (partIds.length < 2) return;
    const anchor = bodies.get(partIds[0]);
    partIds.slice(1).forEach((partId) => {
      const target = bodies.get(partId);
      if (!target || (anchor.fixed && target.fixed)) return;
      const jointAnchor = jointAnchorForLink(link, anchor.part, target.part, partMap);
      try {
        world.createImpulseJoint(
          RAPIER.JointData.fixed(
            localAnchor(jointAnchor, anchor.part),
            { x: 0, y: 0, z: 0, w: 1 },
            localAnchor(jointAnchor, target.part),
            { x: 0, y: 0, z: 0, w: 1 }
          ),
          anchor.body,
          target.body,
          true
        );
        jointsCreated += 1;
      } catch {
        // If a Rapier version changes the fixed-joint signature, the overlap report is still useful.
      }
    });
  });

  for (let step = 0; step < 160; step += 1) world.step();

  const moved = [];
  bodies.forEach(({ body, fixed, part, start }) => {
    if (fixed) return;
    const now = body.translation();
    const distance = Math.hypot(now.x - start.x, now.y - start.y, now.z - start.z) / INCH_TO_METER;
    if (distance > 0.25) {
      moved.push({
        id: part.id,
        name: part.name || part.role || part.id,
        group: part.group || part.role || 'part',
        distance
      });
    }
  });

  const weakFasteners = fastenerLinks.filter((link) => link.partIds.length < 2);
  const looseContacts = contactLinks.filter((link) => link.partIds.length < 2);
  const fastenedPairs = fastenerPairSet(fastenerLinks);
  const unfastenedContacts = contactLinks.filter((link) => link.partIds.length >= 2 && !linkHasFastenedPair(link, fastenedPairs));
  const ok = moved.length === 0 && weakFasteners.length === 0 && looseContacts.length === 0 && unfastenedContacts.length === 0;

  return {
    ok,
    summary: ok
      ? 'The assembly stayed together in this first-pass physics check.'
      : 'The physics check found parts or fasteners that need attention.',
    stats: {
      bodies: bodies.size,
      anchored: Array.from(bodies.values()).filter((item) => item.fixed).length,
      fasteners: fastenerLinks.length,
      contacts: contactLinks.length,
      joints: jointsCreated
    },
    moved,
    weakFasteners,
    looseContacts,
    unfastenedContacts,
    fastenerLinks
  };
}

function fastenerPairSet(fastenerLinks) {
  const pairs = new Set();
  fastenerLinks.forEach((link) => {
    const ids = unique(link.partIds);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        pairs.add(pairKey(ids[i], ids[j]));
      }
    }
  });
  return pairs;
}

function linkHasFastenedPair(link, fastenedPairs) {
  const ids = unique(link.partIds);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      if (fastenedPairs.has(pairKey(ids[i], ids[j]))) return true;
    }
  }
  return false;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pairKey(a, b) {
  return [a, b].sort().join('::');
}

async function loadRapier() {
  if (!rapierPromise) {
    rapierPromise = import(RAPIER_URL).then(async (module) => {
      const RAPIER = module.default || module;
      await RAPIER.init();
      return RAPIER;
    });
  }
  return rapierPromise;
}

function isPhysicalPart(part) {
  const group = part.group || part.meta?.group || part.role || '';
  return part.material !== 'fastener' &&
    part.material !== 'tote' &&
    group !== 'guide' &&
    group !== 'guides' &&
    group !== 'fastener' &&
    group !== 'fasteners';
}

function isFastenerPart(part) {
  const group = part.group || part.meta?.group || part.role || '';
  return part.material === 'fastener' || group === 'fastener' || group === 'fasteners';
}

function linkPartsByFasteners(assembly) {
  const parts = assembly.parts || [];
  const byId = new Map(parts.map((part) => [part.id, part]));
  const explicit = (assembly.connections || [])
    .filter((connection) => connection.type === 'fastenedBy')
    .map((connection) => {
      const partIds = [connection.from, connection.to].filter((id) => byId.has(id));
      return {
        id: connection.fastener || connection.id,
        name: connection.label || connection.fastener || connection.id,
        partIds
      };
    });

  const solids = parts.filter(isPhysicalPart);
  const geometric = parts
    .filter(isFastenerPart)
    .map((fastener) => ({
      id: fastener.id,
      name: fastener.name || fastener.id,
      partIds: solids
        .filter((part) => boundsOverlap(inflatedBounds(partBounds(fastener), CONTACT_TOLERANCE), partBounds(part)))
        .map((part) => part.id)
    }));
  const geometricById = new Map(geometric.map((link) => [link.id, link]));
  const mergedExplicit = explicit.map((link) => link.partIds.length >= 2 ? link : (geometricById.get(link.id) || link));
  const explicitIds = new Set(mergedExplicit.map((link) => link.id));
  return [...mergedExplicit, ...geometric.filter((link) => !explicitIds.has(link.id))];
}

function linkPartsByContacts(assembly) {
  const byId = new Map((assembly.parts || []).map((part) => [part.id, part]));
  return (assembly.connections || [])
    .filter((connection) => connection.type === 'contact')
    .map((connection) => ({
      id: connection.id,
      name: connection.label || connection.id,
      partIds: [connection.from, connection.to].filter((id) => byId.has(id))
    }));
}

function jointAnchorForLink(link, first, second, partMap) {
  const fastener = partMap.get(link.id);
  if (fastener && isFastenerPart(fastener)) return vectorObject(fastener.position || fastener.position_in);
  return closestSharedPoint(partBounds(first), partBounds(second));
}

function closestSharedPoint(first, second) {
  return {
    x: sharedAxisPoint(first, second, 'x'),
    y: sharedAxisPoint(first, second, 'y'),
    z: sharedAxisPoint(first, second, 'z')
  };
}

function sharedAxisPoint(first, second, axis) {
  const overlapMin = Math.max(first.min[axis], second.min[axis]);
  const overlapMax = Math.min(first.max[axis], second.max[axis]);
  if (overlapMin <= overlapMax) return (overlapMin + overlapMax) / 2;
  const firstFace = first.max[axis] < second.min[axis] ? first.max[axis] : first.min[axis];
  const secondFace = first.max[axis] < second.min[axis] ? second.min[axis] : second.max[axis];
  return (firstFace + secondFace) / 2;
}

function localAnchor(worldPointIn, part) {
  const center = vectorObject(part.position || part.position_in);
  return {
    x: (worldPointIn.x - center.x) * INCH_TO_METER,
    y: (worldPointIn.y - center.y) * INCH_TO_METER,
    z: (worldPointIn.z - center.z) * INCH_TO_METER
  };
}

function addFloor(world, RAPIER, bounds, gravityKey) {
  const axis = gravityKey.slice(1);
  const sign = gravityKey.startsWith('-') ? -1 : 1;
  const center = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2
  };
  const size = {
    x: Math.max(12, bounds.max.x - bounds.min.x + 24),
    y: Math.max(12, bounds.max.y - bounds.min.y + 24),
    z: Math.max(12, bounds.max.z - bounds.min.z + 24)
  };
  center[axis] = sign < 0 ? bounds.min[axis] - 0.51 : bounds.max[axis] + 0.51;
  size[axis] = 1;

  const bodyDesc = RAPIER.RigidBodyDesc.fixed();
  bodyDesc.setTranslation(
    center.x * INCH_TO_METER,
    center.y * INCH_TO_METER,
    center.z * INCH_TO_METER
  );
  const body = world.createRigidBody(bodyDesc);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size.x * INCH_TO_METER / 2, size.y * INCH_TO_METER / 2, size.z * INCH_TO_METER / 2),
    body
  );
}

function touchesGravityFloor(part, bounds, gravityKey) {
  const axis = gravityKey.slice(1);
  const sign = gravityKey.startsWith('-') ? -1 : 1;
  const partBox = partBounds(part);
  const partFace = sign < 0 ? partBox.min[axis] : partBox.max[axis];
  const floorFace = sign < 0 ? bounds.min[axis] : bounds.max[axis];
  return Math.abs(partFace - floorFace) <= CONTACT_TOLERANCE;
}

function assemblyBounds(parts) {
  return parts.reduce((box, part) => {
    const next = partBounds(part);
    ['x', 'y', 'z'].forEach((axis) => {
      box.min[axis] = Math.min(box.min[axis], next.min[axis]);
      box.max[axis] = Math.max(box.max[axis], next.max[axis]);
    });
    return box;
  }, {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity }
  });
}

function partBounds(part) {
  const position = vectorObject(part.position || part.position_in);
  const size = vectorObject(part.size || part.size_in);
  return {
    min: {
      x: position.x - size.x / 2,
      y: position.y - size.y / 2,
      z: position.z - size.z / 2
    },
    max: {
      x: position.x + size.x / 2,
      y: position.y + size.y / 2,
      z: position.z + size.z / 2
    }
  };
}

function boundsOverlap(a, b) {
  return ['x', 'y', 'z'].every((axis) => a.min[axis] < b.max[axis] && a.max[axis] > b.min[axis]);
}

function inflatedBounds(bounds, amount) {
  return {
    min: {
      x: bounds.min.x - amount,
      y: bounds.min.y - amount,
      z: bounds.min.z - amount
    },
    max: {
      x: bounds.max.x + amount,
      y: bounds.max.y + amount,
      z: bounds.max.z + amount
    }
  };
}

function vectorObject(value = {}) {
  if (Array.isArray(value)) return { x: value[0] || 0, y: value[1] || 0, z: value[2] || 0 };
  return {
    x: Number(value.x) || 0,
    y: Number(value.y) || 0,
    z: Number(value.z) || 0
  };
}

function scalePoint(value) {
  const vector = vectorObject(value);
  return {
    x: vector.x * INCH_TO_METER,
    y: vector.y * INCH_TO_METER,
    z: vector.z * INCH_TO_METER
  };
}

function gravityVector(key) {
  const sign = key.startsWith('-') ? -1 : 1;
  const axis = key.slice(1);
  return {
    x: axis === 'x' ? sign : 0,
    y: axis === 'y' ? sign : 0,
    z: axis === 'z' ? sign : 0
  };
}

function scaleGravity(vector) {
  return {
    x: vector.x * 9.81,
    y: vector.y * 9.81,
    z: vector.z * 9.81
  };
}
