import * as OCL from "openchemlib";
import { Graph, molecularFormula } from "./chem-core.js";

export function graphFromOCL(molecule) {
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);
  const graph = new Graph();
  const map = new Map();
  const atomCount = molecule.getAllAtoms();

  for (let atom = 0; atom < atomCount; atom += 1) {
    if (molecule.getAtomicNo(atom) === 1) continue;

    const id = graph.addNode(
      molecule.getAtomLabel(atom),
      molecule.getAllHydrogens(atom)
    );

    const cip = molecule.getAtomCIPParity(atom);
    graph.nodes[id].cip = cip === OCL.Molecule.cAtomCIPParityRorM ? "R" : cip === OCL.Molecule.cAtomCIPParitySorP ? "S" : "";
    graph.nodes[id].charge = molecule.getAtomCharge(atom);
    graph.nodes[id].sourceAtomIndex = atom;
    graph.nodes[id].aromatic =
      typeof molecule.isAromaticAtom === "function"
        ? molecule.isAromaticAtom(atom)
        : false;

    map.set(atom, id);
  }

  const bondCount = molecule.getAllBonds();
  for (let bond = 0; bond < bondCount; bond += 1) {
    const aOld = molecule.getBondAtom(0, bond);
    const bOld = molecule.getBondAtom(1, bond);

    if (!map.has(aOld) || !map.has(bOld)) continue;

    let order = molecule.getBondOrder(bond);
    if (!Number.isFinite(order) || order < 1) order = 1;

    graph.addBond(map.get(aOld), map.get(bOld), order);
    graph.bonds[graph.bonds.length - 1].sourceBondIndex = bond;
  }

  return graph;
}

export function geometryFromMolecule(molecule, graph, source) {
  if (!molecule || !graph) return null;

  const atomPositions = graph.nodes.map(function (node) {
    const atom = node.sourceAtomIndex;
    if (!Number.isInteger(atom)) return null;

    const x = molecule.getAtomX(atom);
    const y = molecule.getAtomY(atom);
    const z = molecule.getAtomZ(atom);

    if (![x, y, z].every(Number.isFinite)) return null;
    return [x, y, z];
  });

  if (atomPositions.some(function (point) { return !point; })) return null;

  const hydrogenPositions = graph.nodes.map(function (node) {
    const attached = [];
    const center = node.sourceAtomIndex;

    for (let bond = 0; bond < molecule.getAllBonds(); bond += 1) {
      const a = molecule.getBondAtom(0, bond);
      const b = molecule.getBondAtom(1, bond);
      let h = null;

      if (a === center && molecule.getAtomicNo(b) === 1) h = b;
      if (b === center && molecule.getAtomicNo(a) === 1) h = a;

      if (h !== null) {
        attached.push([
          molecule.getAtomX(h),
          molecule.getAtomY(h),
          molecule.getAtomZ(h)
        ]);
      }
    }

    return attached;
  });

  return {
    kind: "computed",
    source: source || "PubChem 3D conformer",
    atomPositions: atomPositions,
    hydrogenPositions: hydrogenPositions
  };
}


// OCL's stereo-aware molecule is authoritative. Graph and geometry are derived
// together so atom indices never come from a different structure or conformer.
export function structureResult(source, conformer = null, options = {}) {
  const molecule = source.getCompactCopy();
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);
  const graph = graphFromOCL(molecule);
  const smiles = source.toIsomericSmiles();
  return {
    query: options.query || "SMILES:" + smiles,
    inputType: options.inputType || "Edited structure",
    molecule,
    graph,
    smiles,
    geometry: conformer ? geometryFromMolecule(conformer, graph,
      options.geometrySource || "OpenChemLib computed 3D conformer") : null,
    metadata: { title: "Custom molecule", molecularFormula: molecularFormula(graph),
      cid: null, inchi: "", inchiKey: "", ...options.metadata }
  };
}

export function validateStructure(molecule) {
  if (!molecule.getAllAtoms()) throw new Error("Draw a molecule before applying changes.");
  if (molecule.getAllAtoms() > 80) throw new Error("Please use a molecule with at most 80 atoms in this teaching editor.");
  try { molecule.validate(); } catch (error) {
    // OCL flags isolated ions as unbalanced; charged molecules are supported.
    if (!String(error.message).endsWith("unbalanced atom charge")) throw error;
  }
  if (molecule.getFragments().length !== 1) throw new Error("Use one connected molecule; disconnected fragments are not supported by the teaching views.");
  if (molecule.isFragment()) throw new Error("Query structures are not supported. Draw a specific molecule.");
}

export async function resolveStructure(molecule, options = {}) {
  validateStructure(molecule);
  const molfile = molecule.toMolfileV3();
  const conformer = await new Promise((resolve) => {
    const worker = new Worker(new URL("./structure-worker.js", import.meta.url), { type: "module" });
    const finish = (value) => { clearTimeout(timer); worker.terminate(); resolve(value); };
    const timer = setTimeout(() => finish(null), 15000);
    worker.onmessage = (event) => finish(event.data.molfile || null);
    worker.onerror = () => finish(null);
    worker.postMessage({ molfile });
  });
  return structureResult(molecule, conformer ? OCL.Molecule.fromMolfile(conformer) : null, options);
}
