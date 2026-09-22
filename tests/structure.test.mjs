import assert from "node:assert/strict";
import * as OCL from "openchemlib";
import { structureResult, validateStructure } from "../molecule-structure.js";
import { projectedNewmanAngles } from "../render-newman.js";
import { eligibleNewmanBonds } from "../chem-core.js";
OCL.Resources.registerFromNodejs();
function build(smiles) {
  const source = OCL.Molecule.fromSmiles(smiles);
  validateStructure(source);
  const id = source.getIDCode();
  const conformer = new OCL.ConformerGenerator(42).getOneConformerAsMolecule(source.getCompactCopy());
  assert.ok(conformer, smiles + " gets 3D coordinates");
  assert.equal(conformer.getIDCode(), id, "conformer preserves isomer identity");
  const result = structureResult(source, conformer);
  const draft = result.molecule.getCompactCopy();
  draft.removeExplicitHydrogens(); draft.inventCoordinates();
  assert.equal(draft.getIDCode(), id, "reopening editor preserves stereo");
  assert.equal(source.getIDCode(), id);
  assert.equal(OCL.Molecule.fromSmiles(result.smiles).getIDCode(), id, "isomeric export roundtrip");
  assert.equal(OCL.Molecule.fromMolfile(result.molecule.toMolfileV3()).getIDCode(), id, "editor roundtrip");
  assert.equal(result.geometry.atomPositions.length, result.graph.nodes.length);
  for (const node of result.graph.nodes) {
    assert.equal(result.geometry.hydrogenPositions[node.id].length, node.hCount);
    assert.equal(conformer.getAtomLabel(node.sourceAtomIndex), node.el);
  }
  return result;
}
const straight = build("CCCC"), branched = build("CC(C)C");
assert.equal(straight.metadata.molecularFormula, branched.metadata.molecularFormula);
assert.notEqual(straight.smiles, branched.smiles);
const r=build("C[C@H](O)CC"), s=build("C[C@@H](O)CC");
assert.notEqual(r.smiles,s.smiles);
assert.notDeepEqual(r.graph.nodes.map(n=>n.cip),s.graph.nodes.map(n=>n.cip));
const e=build("C/C=C/C"), z=build("C/C=C\\C");
assert.notEqual(e.smiles,z.smiles);
function alkeneDot(result) {
 const p=result.geometry.atomPositions;
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 const v=sub(p[2],p[1]), unit=v.map(x=>x/Math.hypot(...v));
 const side=(a,b)=>{const d=sub(a,b);const along=dot(d,unit);return d.map((x,i)=>x-along*unit[i]);};
 return dot(side(p[0],p[1]),side(p[3],p[2]));
}
assert.ok(alkeneDot(e)<0,"E groups are opposite in generated geometry");
assert.ok(alkeneDot(z)>0,"Z groups are on the same side in generated geometry");
for (const result of [r,s]) {
 const bond=eligibleNewmanBonds(result.graph).find(b=>result.graph.nodes[b.a].cip || result.graph.nodes[b.b].cip);
 const angles=projectedNewmanAngles(result.graph,bond,result.geometry,60);
 assert.ok(angles && angles.front.every(Number.isFinite));
}
build("CCCNCCC"); build("c1ccccc1"); build("C1CCCCC1"); build("C[NH2+]C");
assert.throws(()=>validateStructure(new OCL.Molecule(0,0)),/Draw/);
assert.throws(()=>validateStructure(OCL.Molecule.fromSmiles("CC.O")),/connected/);
assert.throws(()=>validateStructure(OCL.Molecule.fromSmiles("C(C)(C)(C)(C)C")));
const unknown = OCL.Molecule.fromSmiles("CC(O)CC");
const unspecified = structureResult(unknown, new OCL.ConformerGenerator(42).getOneConformerAsMolecule(unknown.getCompactCopy()));
assert.ok(!unspecified.smiles.includes("@"), "3D generation does not silently specify an unknown stereocenter");
assert.ok(unspecified.graph.nodes.every(n=>!n.cip));
console.log("Structure, stereo, conformer and roundtrip tests passed.");
