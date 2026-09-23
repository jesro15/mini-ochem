import assert from 'node:assert/strict';
import { chapterOne } from '../chapter-one-data.js';
import { structureSvg } from '../chapter-one-structures.js';
const assigned=[...Array.from({length:19},(_,i)=>i+4),24,37,38,39,42,43,44,45,48,49,50,51,52];
assert.deepEqual(chapterOne.map(p=>p.number),assigned.map(n=>`1.${n}`));
// Source audit: textbook subpart counts, including the supplied 1.18 context forms.
const counts=[6,2,6,6,7,7,7,8,0,0,1,0,5,5,4,7,3,4,5,1,5,6,4,3,2,1,2,4,12,4,4,0];
assert.deepEqual(chapterOne.map(p=>p.parts.length),counts);
for(const p of chapterOne){
 assert.equal(p.pdfPage,p.page+40);
 for(const part of p.parts)for(const g of part.forms||[part.diagram].filter(Boolean)){
  for(const [i,j,order]of g.bonds){assert.ok(g.atoms[i]&&g.atoms[j]);assert.ok([1,2,3,'wedge','hash'].includes(order));}
  assert.ok(!/NaN|undefined/.test(structureSvg(g)));
 }
}
const get=n=>chapterOne.find(p=>p.number===n);
// These exercises must not silently acquire computed answers or corrected valences.
for(const n of ['1.10','1.48','1.49','1.50','1.51'])
 for(const {diagram} of get(n).parts)assert.ok(diagram.atoms.every(a=>!a.charge),`${n} must leave formal charges unanswered`);
for(const {diagram} of get('1.19').parts)assert.ok(diagram.atoms.every(a=>!a.pairs), '1.19 asks students to add pairs');
assert.equal(get('1.19').parts[3].diagram.atoms[0].label,'CH3');
assert.deepEqual(get('1.38').parts[0].diagram.bonds.map(b=>b[2]),[1,2]);
assert.deepEqual(get('1.38').parts[1].diagram.bonds.map(b=>b[2]),[1,1,2]);
assert.equal(get('1.49').parts[7].diagram.bonds.length,4);
assert.equal(get('1.50').parts[1].diagram.atoms[3].pairs.length,2);
console.log('Chapter 1 assignment coverage, source annotations, and diagrams passed.');
