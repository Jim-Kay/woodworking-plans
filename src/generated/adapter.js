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
        meta: {
          group: part.physical === false ? 'references' : `${part.role}s`,
          canonical_role: part.role,
          physical: part.physical !== false,
          host_part_id: part.meta?.host_part_id || null,
          exported_as: part.meta?.exported_as || null
        }
      })),
      connections: (design.joints || []).map((joint) => ({
        id: joint.id,
        type: joint.type === 'fastened' ? 'fastenedBy' : 'contact',
        from: joint.part_ids?.[0],
        to: joint.part_ids?.[1],
        label: joint.label
      }))
    },
    buildSteps: (design.assembly_steps || []).map((step, index) => generatedBuildStep(step, index)),
    estimates: design.estimates || {}
  };
}

function generatedBuildStep(step, index) {
  const normalizedTitle = String(step.title || '').toLowerCase();
  const output = {
    title: step.title,
    stage: index + 1,
    instructions: step.instructions || [],
    partIds: step.part_ids || []
  };
  if (normalizedTitle.includes('cut')) {
    output.image = 'cut-layout';
    output.vis = { panels: true, rails: true, references: false };
  } else if (normalizedTitle.includes('drill')) {
    output.vis = { panels: true, rails: true, references: true };
  } else {
    output.vis = { panels: true, rails: true, references: false };
  }
  return output;
}
