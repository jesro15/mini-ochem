import assert from 'node:assert/strict';
import * as OCL from 'openchemlib';
import { dimethylcyclopropanes, namedIsomerFamily, isomersForStructure, structureKey } from '../isomers.js';
OCL.Resources.registerFromNodejs();
const items = namedIsomerFamily('dimethylcyclopropane').candidates;
assert.equal(items.length,4);
assert.equal(new Set(items.map(i=>structureKey(i.smiles))).size,4);
assert.equal(namedIsomerFamily('1,2-dimethylcyclopropane').candidates.length,3);
assert.equal(namedIsomerFamily('cis-1,2-dimethylcyclopropane'),null,'specific stereo name should keep its exact identity');
assert.equal(namedIsomerFamily('dimethyl cyclopropane').candidates.length,4);
assert.equal(isomersForStructure('CC1(C)CC1').items.length,4,'CID/SMILES route discovers the positional family too');
assert.equal(isomersForStructure('CC(O)CC').items.length,2);
assert.equal(isomersForStructure('C[C@H](O)CC').items.length,2,'include alternative to already specified stereo');
assert.equal(isomersForStructure('CC=CC').items.length,2);
assert.equal(isomersForStructure('CC').items.length,1);
assert.equal(isomersForStructure('OC(=O)C(O)C(O)C(=O)O').items.length,3,'deduplicate meso configurations');
const skeletons = new Set();
for(const item of dimethylcyclopropanes()) {
 const m=OCL.Molecule.fromSmiles(item.smiles); m.ensureHelperArrays(OCL.Molecule.cHelperCIP);
 assert.equal(m.getMolecularFormula().formula,'C5H10');
 skeletons.add(OCL.CanonizerUtil.getIDCode(m,OCL.CanonizerUtil.NOSTEREO));
 const cip=Array.from({length:m.getAllAtoms()},(_,a)=>m.getAtomCIPParity(a)).filter(Boolean).sort();
 if(item.title.includes('cis-')) assert.deepEqual(cip,[1,2]);
 if(item.title.includes('(1R,2R)')) assert.deepEqual(cip,[1,1]);
 if(item.title.includes('(1S,2S)')) assert.deepEqual(cip,[2,2]);
 const g=new OCL.ConformerGenerator(42).getOneConformerAsMolecule(m.getCompactCopy());
 assert.ok(g); assert.equal(OCL.Molecule.fromMolfile(g.toMolfileV3()).getIDCode(),m.getIDCode());
 if(item.position==='1,2') {
   g.ensureHelperArrays(OCL.Molecule.cHelperRings);
   const ring=Array.from({length:g.getAtoms()},(_,i)=>i).filter(i=>g.isRingAtom(i));
   const xyz=i=>[g.getAtomX(i),g.getAtomY(i),g.getAtomZ(i)];
   const sub=(a,b)=>a.map((x,i)=>x-b[i]);
   const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
   const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
   const normal=cross(sub(xyz(ring[1]),xyz(ring[0])),sub(xyz(ring[2]),xyz(ring[0])));
   const methyl=Array.from({length:g.getAtoms()},(_,i)=>i).filter(i=>g.getAtomicNo(i)===6&&!g.isRingAtom(i));
   const side=methyl.map(i=>dot(sub(xyz(i),xyz(g.getConnAtom(i,0))),normal));
   assert.equal(side[0]*side[1]>0,item.title.startsWith('cis-'),'cis/trans methyl groups are on correct ring faces');
 }
}
assert.equal(skeletons.size,2);
console.log('Isomer family, meso deduplication, R/S and 3D cis/trans tests passed.');
