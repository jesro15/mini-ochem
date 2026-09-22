import * as OCL from "openchemlib";
import { graphFromOCL, resolveStructure, structureResult } from "./molecule-structure.js";
export { graphFromOCL } from "./molecule-structure.js";
import {
  parseFormula,
  validateGraph,
  graphToSmiles,
  molecularFormula
} from "./chem-core.js";

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPERTY_LIST = "Title,IUPACName,MolecularFormula,SMILES,ConnectivitySMILES,InChI,InChIKey";
const relatedCache = new Map();

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

export async function propertiesForCids(cids) {
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
      smiles: item.SMILES || item.ConnectivitySMILES || "",
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

export async function resolveCandidate(candidate, originalQuery) {
  if (!candidate || !candidate.smiles) {
    throw new Error("That PubChem result has no usable structure.");
  }

  const authoritative = moleculeFromSmiles(candidate.smiles);
  const fetched = await fetchPubChem3D(candidate.cid);
  const molecule3d = fetched && fetched.getIDCode() === authoritative.getIDCode() ? fetched : null;
  if (!molecule3d) return resolveStructure(authoritative, { query: candidate.cid ? "CID " + candidate.cid : originalQuery || candidate.title, inputType: "PubChem", metadata: candidate });
  return structureResult(molecule3d, molecule3d, {
    query: candidate.cid ? "CID " + candidate.cid : originalQuery || candidate.title,
    inputType: "PubChem",
    geometrySource: "PubChem computed 3D conformer",
    metadata: candidate
  });
}

export async function resolveMolecule(input) {
  const query = clean(input);
  if (!query) {
    throw new Error("Enter a molecule, structure string, or identifier.");
  }

  if (/^SMILES:/i.test(query)) return resolveStructure(moleculeFromSmiles(query.slice(7)), { inputType: "SMILES" });

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

        return resolveStructure(molecule, { query, inputType: "condensed formula" });
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
      const found = await enrichSmiles(query);
      const metadata = found?.smiles && moleculeFromSmiles(found.smiles).getIDCode() === molecule.getIDCode() ? found : {};
      return resolveStructure(molecule, { inputType: "SMILES", metadata });
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


export async function getSameFormulaCandidates(formula, excludeCid) {
  const key = "formula:" + String(formula || "").trim() + ":" + (excludeCid || "");
  if (relatedCache.has(key)) return relatedCache.get(key);

  const cids = await resolveCids(formula, "formula");
  const filtered = cids.filter(function (cid) {
    return !excludeCid || Number(cid) !== Number(excludeCid);
  }).slice(0, 12);

  const rows = await propertiesForCids(filtered);
  relatedCache.set(key, rows);
  return rows;
}

export async function getSimilarCompounds(cid, options) {
  if (!cid) return [];

  const threshold =
    options && Number.isFinite(Number(options.threshold))
      ? Math.max(0, Math.min(100, Number(options.threshold)))
      : 90;

  const maxRecords =
    options && Number.isFinite(Number(options.maxRecords))
      ? Math.max(1, Math.min(24, Number(options.maxRecords)))
      : 12;

  const key =
    "similar:" + cid + ":" + threshold + ":" + maxRecords;

  if (relatedCache.has(key)) return relatedCache.get(key);

  const url =
    PUBCHEM +
    "/compound/fastsimilarity_2d/cid/" +
    encodeURIComponent(cid) +
    "/cids/JSON?Threshold=" +
    encodeURIComponent(threshold) +
    "&MaxRecords=" +
    encodeURIComponent(maxRecords + 1);

  const cids = cidList(await getJSON(url))
    .filter(function (candidateCid) {
      return Number(candidateCid) !== Number(cid);
    })
    .slice(0, maxRecords);

  const rows = await propertiesForCids(cids);
  relatedCache.set(key, rows);
  return rows;
}

export { OCL };
