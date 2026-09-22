import * as OCL from 'openchemlib';

const M = OCL.Molecule;
export function structureKey(smiles) { return M.fromSmiles(smiles).getIDCode(); }

function stereoLabel(molecule) {
  molecule.ensureHelperArrays(M.cHelperCIP);
  const labels = [];
  for (let a = 0; a < molecule.getAllAtoms(); a++) {
    const p = molecule.getAtomCIPParity(a);
    if (p === M.cAtomCIPParityRorM) labels.push('R');
    if (p === M.cAtomCIPParitySorP) labels.push('S');
  }
  return labels.length ? 'R/S configuration: ' + labels.join(', ') : 'No tetrahedral carbon stereocenters';
}

// This named family has two connectivities and four distinct stereoisomers.
// The cis (R,S)/(S,R) structure is meso, so it occurs only once.
export function dimethylcyclopropanes(position = '') {
  return [
    { title: '1,1-Dimethylcyclopropane', smiles: 'CC1(C)CC1', relationship: 'Positional isomer · achiral', position: '1,1' },
    { title: 'cis-1,2-Dimethylcyclopropane', smiles: 'C[C@H]1[C@@H](C)C1', relationship: 'Meso · (1R,2S) ≡ (1S,2R)', position: '1,2' },
    { title: 'trans-(1R,2R)-1,2-Dimethylcyclopropane', smiles: 'C[C@H]1[C@H](C)C1', relationship: 'Enantiomer of the (1S,2S) trans form', position: '1,2' },
    { title: 'trans-(1S,2S)-1,2-Dimethylcyclopropane', smiles: 'C[C@@H]1[C@@H](C)C1', relationship: 'Enantiomer of the (1R,2R) trans form', position: '1,2' }
  ].filter(item => !position || item.position === position).map(item => ({ ...item, molecularFormula: 'C5H10', generated: true }));
}

export function namedIsomerFamily(query) {
  const match = /^(?:(1,[12])-?)?dimethylcyclopropane$/i.exec(query.replace(/\s+/g, ''));
  if (!match) return null;
  const items = dimethylcyclopropanes(match[1]);
  return { query, candidates: items, ambiguous: true, inputType: 'isomer family', autoCompare: items.length > 1,
    description: match[1] === '1,2'
      ? 'Three stereoisomers: one cis meso form and a pair of trans enantiomers.'
      : 'Four distinct isomers in this named family: the 1,1 positional isomer, one cis-1,2 meso form, and two trans-1,2 enantiomers. Other C5H10 connectivities are available under Same formula.' };
}

export function isomersForStructure(smiles) {
  const source = M.fromSmiles(smiles);
  const connectivity = OCL.CanonizerUtil.getIDCode(source, OCL.CanonizerUtil.NOSTEREO);
  if (dimethylcyclopropanes().some(item => OCL.CanonizerUtil.getIDCode(M.fromSmiles(item.smiles), OCL.CanonizerUtil.NOSTEREO) === connectivity)) {
    return { items: dimethylcyclopropanes(), description: 'All four distinct dimethylcyclopropane isomers. The cis form is meso; the two trans forms are enantiomers.' };
  }
  source.ensureHelperArrays(M.cHelperParities);
  const atoms = [], bonds = [];
  for (let a = 0; a < source.getAllAtoms(); a++) {
    if (source.getAtomicNo(a) === 6 && source.getAtomPi(a) === 0 && source.getAtomParity(a)) atoms.push(a);
  }
  for (let b = 0; b < source.getAllBonds(); b++) {
    if (source.getBondOrder(b) === 2 && !source.isRingBond(b) && source.getBondParity(b)) bonds.push(b);
  }
  const count = atoms.length + bonds.length;
  if (count > 6) throw new Error('This structure has more than six stereo elements. Use the drawing editor to choose configurations; automatic enumeration is limited to 64 assignments.');
  const unique = new Map();
  for (let mask = 0; mask < 2 ** count; mask++) {
    const molecule = source.getCompactCopy();
    atoms.forEach((a, i) => {
      molecule.setAtomParity(a, mask & (1 << i) ? M.cAtomParity2 : M.cAtomParity1, false);
      molecule.setAtomESR(a, M.cESRTypeAbs, 0);
    });
    bonds.forEach((b, i) => molecule.setBondParity(b, mask & (1 << (atoms.length + i)) ? M.cBondParityZor2 : M.cBondParityEor1, false));
    molecule.setParitiesValid(0);
    molecule.inventCoordinates();
    molecule.setStereoBondsFromParity();
    const canonical = molecule.toIsomericSmiles();
    const reparsed = M.fromSmiles(canonical);
    unique.set(reparsed.getIDCode(), { smiles: canonical, molecularFormula: reparsed.getMolecularFormula().formula,
      relationship: stereoLabel(reparsed), generated: true });
  }
  const items = [...unique.values()].map((item, i) => ({ ...item, title: `Stereoisomer ${i + 1}` }));
  return { items, description: `${items.length} distinct structure${items.length === 1 ? '' : 's'} for this connectivity, varying tetrahedral carbon and non-ring double-bond configurations. Symmetry duplicates are removed. Other constitutional isomers require Same formula; axial, ring-double-bond and other stereochemistry are not enumerated.` };
}
