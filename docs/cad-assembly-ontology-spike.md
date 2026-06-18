# CAD Assembly Ontology Spike

## Why This Matters

The local design loop is starting to need an assembly vocabulary that is larger
than the handcrafted woodworking components in this repo. Qwen can already ask
for reusable components, but it still invents opaque names such as
`wooden_frame_001`, picks semantically mismatched components, or treats a nearby
template as valid when it is only superficially similar.

Existing CAD assembly datasets may help us avoid inventing this ontology from
scratch. The goal is not to import arbitrary mechanical CAD parts as publishable
woodworking plans. The useful layer is the language and metadata around how
parts relate to each other: joints, contacts, holes, faces, edges, motion, and
assembly graph relationships.

## Candidate Sources

### Fusion 360 Gallery Assembly Dataset

Repository: https://github.com/AutodeskAILab/Fusion360GalleryDataset

Useful docs:

- Assembly data: https://github.com/AutodeskAILab/Fusion360GalleryDataset/blob/master/docs/assembly.md
- Joint data: https://github.com/AutodeskAILab/Fusion360GalleryDataset/blob/master/docs/assembly_joint.md

Why it is promising:

- The assembly dataset describes components, bodies, occurrences, joints,
  contacts, holes, properties, and hierarchy.
- The joint dataset isolates pairs of parts with joint metadata and references
  to B-Rep faces/edges.
- The docs explicitly model joints/mates as relative relationships between
  parts, including degrees of freedom, rest pose, and motion limits.
- Mesh `.obj` files group triangles by B-Rep face, which could let us build
  contact and face-label examples without a full CAD kernel.

Fit for this repo:

- Strong source for an assembly relationship vocabulary.
- Strong source for contact/hole/joint examples.
- Probably too broad to import directly into the woodworking catalog.
- Best used as offline retrieval hints and validator test cases.

### AutoMate

Project page: https://grail.cs.washington.edu/projects/automate/

Repository: https://github.com/degravity/automate

Dataset landing page: https://datadryad.org/dataset/doi%3A10.5061/dryad.2547d7wvw

Why it is promising:

- AutoMate frames CAD assemblies as pairwise mate constraints between parts.
- Its dataset contains large-scale mate data from public Onshape documents.
- It is aimed at predicting valid mates between B-Rep entities, which is close
  to the "does this part attach here?" question we need for generated plans.

Fit for this repo:

- Useful for mate/joint terminology and relationship patterns.
- Heavier dependency story than Fusion 360 because the code references
  Parasolid/OpenCascade-oriented processing.
- Less immediately useful for local desktop import unless we start with metadata
  extracts rather than full geometry processing.

### STEP / OpenCascade Concepts

OpenCascade STEP docs:
https://dev.opencascade.org/doc/overview/html/occt_user_guides__step.html

Why it is promising:

- STEP/OpenCascade gives a mature vocabulary around assemblies, product
  structure, topology, geometry, colors, names, validation properties, GD&T,
  layers, and user-defined attributes.
- It is a likely bridge if this project eventually exports/imports neutral CAD
  formats.

Fit for this repo:

- Useful as a stable naming influence.
- Too low-level as the first ontology for Qwen.
- Best treated as a future interoperability layer, not the user-facing local
  model vocabulary.

## Proposed Internal Vocabulary

Use a small normalized relationship record that can be populated from datasets,
hand-authored components, or Qwen proposals.

```json
{
  "id": "relationship.face_contact.panel_to_rail",
  "source": "fusion360_joint_sample",
  "domain": "assembly_relationship",
  "terms": ["face contact", "rail seats on panel", "flush edge"],
  "part_a": {
    "role": "panel",
    "face_role": "top_face"
  },
  "part_b": {
    "role": "rail",
    "face_role": "bottom_face"
  },
  "relationship_type": "fixed_contact",
  "geometry_cues": {
    "contact": "coplanar_or_coincident_faces",
    "clearance": "none",
    "motion": "fixed",
    "alignment": ["parallel_faces", "edge_flush_or_inset"]
  },
  "woodworking_relevance": {
    "score": 0.9,
    "reason": "Common panel-to-rail fastening relationship."
  },
  "candidate_validators": [
    "validators.part_overlap",
    "validators.contact_face_alignment",
    "validators.edge_clearance"
  ],
  "candidate_rendering": [
    "rendering.stage_aware_reference_view",
    "rendering.exploded_assembly_sequence"
  ]
}
```

## Woodworking Relevance Filter

Before adding imported records to the local retrieval catalog, score them by
whether they map to common woodworking concepts:

- `panel`, `rail`, `stile`, `slat`, `cleat`, `post`, `leg`, `shelf`, `divider`
- `hinge`, `caster`, `hook`, `screw`, `washer`, `bolt`, `bracket`, `dowel`
- `face contact`, `edge alignment`, `through hole`, `pilot hole`, `slot`,
  `rabbet`, `lap`, `butt joint`, `miter`, `spacer`, `stop`
- fixed, sliding, rotating, folding, removable, nested, stacked

Reject or quarantine records that look like highly specific machined parts,
fluid fittings, gears, electronics housings, or abstract mechanical details
unless they introduce a reusable relationship we need.

## How This Helps Qwen

The imported ontology should not become another huge text blob in the prompt.
Instead, it should back tools that Qwen can query:

- `search_assembly_relationships(query, part_roles, relationship_type)`
- `suggest_contact_constraints(parts)`
- `review_component_semantics(proposal)`
- `rank_candidate_compositions(candidates)`
- `explain_required_capabilities(proposal)`

This turns the local model's job from "remember every component name" into
"describe the relationship it needs and let deterministic retrieval find the
closest known relationships."

## First Implementation Pass

1. Add a local `assemblyRelationshipCatalog` module with 20-40 hand-authored
   relationship records based on woodworking concepts and terms observed in
   Fusion/AutoMate docs.
2. Add `search_assembly_relationships` to the sandbox tools.
3. Update proposal review so suspicious IDs such as `wooden_frame_001` or
   `sled_base_002` are flagged and replaced with catalog relationship searches.
4. Run the advanced composition queue again and compare:
   - fewer opaque component IDs
   - fewer semantically mismatched components
   - more explicit hinge/contact/load/escalation language
5. Only after the hand-authored layer works, build a small importer for sample
   Fusion 360 joint JSON records.

## Notes

The CADKnitter paper is still useful even without public code/data because its
dataset strategy validates the same direction: text plus geometry alone is not
enough; assembly metadata and contact relationships are the missing structure.
If KnitCAD is released, we should treat it as another source feeding the same
normalized relationship catalog rather than changing the portal design format
around it.
