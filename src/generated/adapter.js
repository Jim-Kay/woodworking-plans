export function canonicalToPortalResult(design, validation = design.validation) {
  const assemblyParts = design.parts || [];
  return {
    type: 'generated',
    ok: validation?.ok !== false,
    errors: validation?.errors || [],
    warnings: validation?.warnings || [],
    parts: (design.cut_list || []).map((item) => ({
      part: item.name,
      qty: item.qty,
      length: item.length_in,
      width: item.width_in,
      thickness: item.thickness_in,
      notes: item.material
    })),
    assembly: {
      type: 'generated',
      units: design.units || 'in',
      parts: assemblyParts.map((part) => ({
        id: part.id,
        role: part.name || part.role,
        material: part.physical === false ? 'guide' : 'wood',
        size: { ...part.size },
        position: { ...part.position },
        rotation: { ...(part.rotation || { x: 0, y: 0, z: 0 }) },
        meta: { group: part.physical === false ? 'references' : `${part.role}s`, canonical_role: part.role, physical: part.physical !== false }
      })),
      connections: (design.joints || []).map((joint) => ({
        id: joint.id,
        type: joint.type === 'fastened' ? 'fastenedBy' : 'contact',
        from: joint.part_ids?.[0],
        to: joint.part_ids?.[1],
        label: joint.label
      }))
    },
    buildSteps: (design.assembly_steps || []).map((step, index) => ({
      title: step.title,
      stage: index,
      instructions: step.instructions || [],
      partIds: step.part_ids || []
    })),
    estimates: design.estimates || {}
  };
}
