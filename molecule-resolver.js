import * as OCL from "https://esm.sh/openchemlib@9.25.0";
import {
  Graph,
  parseFormula,
  validateGraph,
  graphToSmiles,
  molecularFormula
} from "./chem-core.js";

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPERTY_LIST = "Title,IUPACName,MolecularFormula,ConnectivitySMILES,InChI,InChIKey";

function clean(value) {
  return String(value || "").trim();
}

function looksLikeInChI(value) {
  return /^InChI=/i.test(value);
}

function looksLikeInChIKey(value) {
  return /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/i.test(value);
}

function looksLikeCAS(value) {
  return /^\d{2,7}-\d{2}-\d$/.test(value);
}

function looksLikeCID(value) {
  return /^CID\s*:?\s*\d+$/i.test(value);
}

function looksLikeMolecularFormula(value) {
  return /^(?:[A-Z][a-z]?\d*)+$/.test(value) && /\d/.test(value);
}

function looksLikeCondensed(value) {
  return (
    /H\d*/.test(value) ||
    value.startsWith("(") ||
    /[=#]/.test(value)
  ) && /^[A-Za-z0-9()=#\-–—−+\s]+$/.test(value);
}

function normalizeCondensed(value) {
  return value
    .replace(/^\s*H(\d*)C/, function (_, count) {
      return "CH" + (count || "1");
    })
    .replace(/\s+/g, "");
}

async function getJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail =
        (body && body.Fault && body.Fault.Message) ||
        (body && body.Fault && body.Fault.Details && body.Fault.Details[0]) ||
        "";
    } catch {
      detail = "";
    }
    throw new Error(detail || ("PubChem request failed (" + response.status + ")."));
  }
  return response.json();
}

function cidList(payload) {
  return payload && payload.IdentifierList && payload.IdentifierList.CID
    ? payload.IdentifierList.CID
    : [];
}

async function propertiesForCids(cids) {
  if (!cids.length) return [];
  const list = cids.slice(0, 12).join(",");
  const url =
    PUBCHEM + "/compound/cid/" + list + "/property/" + PROPERTY_LIST + "/JSON";
  const payload = await getJSON(url);
  const properties =
    payload && payload.PropertyTable && payload.PropertyTable.Properties
      ? payload.PropertyTable.Properties
      : [];

  return properties.map(function (item) {
    return {
      cid: item.CID,
      title: item.Title || item.IUPACName || ("CID " + item.CID),
      iupacName: item.IUPACName || "",
      molecularFormula: item.MolecularFormula || "",
      smiles: item.ConnectivitySMILES || "",
      inchi: item.InChI || "",
      inchiKey: item.InChIKey || ""
    };
  });
}

async function resolveCids(value, kind) {
  const encoded = encodeURIComponent(value);

  if (kind === "cid") {
    return [Number(value.replace(/\D/g, ""))];
  }

  if (kind === "inchi") {
    return cidList(await getJSON(
      PUBCHEM + "/compound/inchi/cids/JSON?inchi=" + encodeURIComponent(value)
    ));
  }

  if (kind === "inchikey") {
    return cidList(await getJSON(
      PUBCHEM + "/compound/inchikey/" + encoded + "/cids/JSON"
    ));
  }

  if (kind === "cas") {
    return cidList(await getJSON(
      PUBCHEM + "/compound/xref/RN/" + encoded + "/cids/JSON"
    ));
  }

  if (kind === "name") {
    return cidList(await getJSON(
      PUBCHEM + "/compound/name/" + encoded + "/cids/JSON"
    ));
  }

  if (kind === "formula") {
    return cidList(await getJSON(
      PUBCHEM + "/compound/fastformula/" + encoded + "/cids/JSON?MaxRecords=12"
    ));
  }

  return [];
}

function prepareMolecule(molecule) {
  if (typeof molecule.ensureHelperArrays === "function") {
    molecule.ensureHelperArrays(OCL.Molecule.cHelperNeighbours);
  }
  return molecule;
}

function moleculeFromSmiles(smiles) {
  return prepareMolecule(OCL.Molecule.fromSmiles(smiles));
}

function moleculeFromMolfile(molfile) {
  return prepareMolecule(OCL.Molecule.fromMolfile(molfile));
}

async function fetchPubChem3D(cid) {
  if (!cid) return null;

  try {
    const response = await fetch(
      PUBCHEM + "/compound/cid/" + cid + "/SDF?record_type=3d"
    );

    if (!response.ok) return null;

    const sdf = await response.text();
    const molfile = sdf.split("$$")[0].trim();
    if (!molfile) return null;

    return moleculeFromMolfile(molfile);
  } catch {
    return null;
  }
}

export function graphFromOCL(molecule) {
  const graph = new Graph();
  const map = new Map();
  const atomCount = molecule.getAllAtoms();

  for (let atom = 0; atom < atomCount; atom += 1) {
    if (molecule.getAtomicNo(atom) === 1) continue;

    const id = graph.addNode(
      molecule.getAtomLabel(atom),
      molecule.getAllHydrogens(atom)
    );

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
  }

  return graph;
}

function geometryFromMolecule(molecule, graph, source) {
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

async function enrichSmiles(smiles) {
  try {
    const url =
      PUBCHEM + "/compound/smiles/cids/JSON?smiles=" + encodeURIComponent(smiles);
    const cids = cidList(await getJSON(url));
    if (!cids.length) return null;
    const rows = await propertiesForCids([cids[0]]);
    return rows[0] || null;
  } catch {
    return null;
  }
}

function resolvedObject(options) {
  const metadata = options.metadata || {};

  return {
    query: options.query,
    inputType: options.inputType,
    molecule: options.molecule,
    graph: options.graph,
    smiles: options.smiles,
    geometry: options.geometry || null,
    metadata: {
      title: metadata.title || metadata.iupacName || options.query,
      iupacName: metadata.iupacName || "",
      molecularFormula:
        metadata.molecularFormula || molecularFormula(options.graph),
      cid: metadata.cid || null,
      inchi: metadata.inchi || "",
      inchiKey: metadata.inchiKey || ""
    }
  };
}

export async function resolveCandidate(candidate, originalQuery) {
  if (!candidate || !candidate.smiles) {
    throw new Error("That PubChem result has no usable structure.");
  }

  const molecule3d = await fetchPubChem3D(candidate.cid);
  const sourceMolecule = molecule3d || moleculeFromSmiles(candidate.smiles);
  const graph = graphFromOCL(sourceMolecule);
  const geometry = molecule3d
    ? geometryFromMolecule(molecule3d, graph, "PubChem computed 3D conformer")
    : null;

  const molecule = moleculeFromMolfile(sourceMolecule.toMolfile());

  return resolvedObject({
    query: originalQuery || candidate.title,
    inputType: "PubChem",
    molecule: molecule,
    graph: graph,
    smiles: candidate.smiles,
    geometry: geometry,
    metadata: candidate
  });
}

export async function resolveMolecule(input) {
  const query = clean(input);
  if (!query) {
    throw new Error("Enter a molecule, structure string, or identifier.");
  }

  if (looksLikeCondensed(query)) {
    try {
      const normalized = normalizeCondensed(query);
      const parsed = parseFormula(normalized);
      const validation = validateGraph(parsed.graph);

      if (validation.every(function (item) { return item.ok; })) {
        const smiles = graphToSmiles(parsed.graph);
        const metadata = await enrichSmiles(smiles);

        if (metadata && metadata.cid) {
          return resolveCandidate(
            Object.assign({}, metadata, {
              molecularFormula:
                metadata.molecularFormula || molecularFormula(parsed.graph)
            }),
            query
          );
        }

        const molecule = moleculeFromSmiles(smiles);

        return resolvedObject({
          query: query,
          inputType: "condensed formula",
          molecule: molecule,
          graph: parsed.graph,
          smiles: smiles,
          metadata: { molecularFormula: molecularFormula(parsed.graph) }
        });
      }
    } catch {
      // Continue to other resolvers.
    }
  }

  const explicitKind =
    looksLikeCID(query) ? "cid" :
    looksLikeInChI(query) ? "inchi" :
    looksLikeInChIKey(query) ? "inchikey" :
    looksLikeCAS(query) ? "cas" :
    null;

  if (explicitKind) {
    const cids = await resolveCids(query, explicitKind);
    if (!cids.length) {
      throw new Error("No PubChem compound matched that identifier.");
    }

    const rows = await propertiesForCids([cids[0]]);
    return resolveCandidate(rows[0], query);
  }

  if (looksLikeMolecularFormula(query)) {
    const cids = await resolveCids(query, "formula");
    if (!cids.length) {
      throw new Error("No PubChem compounds matched that molecular formula.");
    }

    const candidates = await propertiesForCids(cids);
    if (candidates.length === 1) {
      return resolveCandidate(candidates[0], query);
    }

    return {
      ambiguous: true,
      query: query,
      inputType: "molecular formula",
      candidates: candidates
    };
  }

  try {
    const molecule = moleculeFromSmiles(query);
    const graph = graphFromOCL(molecule);

    if (graph.nodes.length) {
      const metadata = await enrichSmiles(query);

      if (metadata && metadata.cid) {
        return resolveCandidate(metadata, query);
      }

      return resolvedObject({
        query: query,
        inputType: "SMILES",
        molecule: molecule,
        graph: graph,
        smiles: query,
        metadata: metadata || {}
      });
    }
  } catch {
    // A name or external identifier may not be SMILES.
  }

  const cids = await resolveCids(query, "name");
  if (!cids.length) {
    throw new Error(
      "I could not resolve that input as condensed notation, SMILES, InChI, " +
      "InChIKey, CAS RN, PubChem CID, molecular formula, or a chemical name."
    );
  }

  const rows = await propertiesForCids([cids[0]]);
  return resolveCandidate(rows[0], query);
}

export { OCL };
