export const ELEMENTS = {
  C:  { valences: [4], lonePairs: 0, color: 0x3a3a3a },
  N:  { valences: [3], lonePairs: 1, color: 0x3558d4 },
  O:  { valences: [2], lonePairs: 2, color: 0xd64a3a },
  S:  { valences: [2, 4, 6], lonePairs: 2, color: 0xd7a62a },
  P:  { valences: [3, 5], lonePairs: 1, color: 0xd67a2f },
  F:  { valences: [1], lonePairs: 3, color: 0x58a85d },
  Cl: { valences: [1], lonePairs: 3, color: 0x58a85d },
  Br: { valences: [1], lonePairs: 3, color: 0x8f3e2f },
  I:  { valences: [1], lonePairs: 3, color: 0x6c4596 },
  H:  { valences: [1], lonePairs: 0, color: 0xe7e7e7 }
};

export const KNOWN = {
  "(CH3CH2CH2)2NH": { name: "Dipropylamine", note: "secondary amine" },
  "CH3CH2CH2CH2OCH2CH3": { name: "1-ethoxybutane", note: "ether" },
  "CH3CH2OH": { name: "Ethanol", note: "alcohol" },
  "CH3CH(CH3)CH3": { name: "2-methylpropane", note: "branched alkane" },
  "CH3(CH2)4CH3": { name: "Hexane", note: "alkane" },
  "(CH3)2CHOH": { name: "Propan-2-ol", note: "alcohol" },
  "CH2=CHCH3": { name: "Propene", note: "alkene" },
  "CH3CH2CH2CH3": { name: "Butane", note: "alkane / Newman-ready" },
  "CH3CH2CH2CH2CH3": { name: "Pentane", note: "alkane / Newman-ready" }
};

export class Graph {
  constructor() {
    this.nodes = [];
    this.bonds = [];
  }

  addNode(el, hCount = 0) {
    const node = { id: this.nodes.length, el, hCount, charge: 0 };
    this.nodes.push(node);
    return node.id;
  }

  addBond(a, b, order = 1) {
    this.bonds.push({ id: this.bonds.length, a, b, order });
  }

  neighbors(id) {
    return this.bonds
      .filter((bond) => bond.a === id || bond.b === id)
      .map((bond) => ({
        id: bond.a === id ? bond.b : bond.a,
        order: bond.order,
        bondId: bond.id
      }));
  }

  bondOrderSum(id) {
    return this.neighbors(id).reduce((sum, neighbor) => sum + neighbor.order, 0);
  }

  capacity(id) {
    const node = this.nodes[id];
    const rule = ELEMENTS[node.el];
    if (!rule) return 0;
    const used = this.bondOrderSum(id) + node.hCount;
    return Math.max(...rule.valences) - used;
  }
}

export function cleanFormula(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/-/g, "");
}

function readAtom(str, pos) {
  const match = str.slice(pos).match(/^(Cl|Br|[CNOSPFI])/);
  if (!match) throw new Error(\`Expected an atom at “\${str.slice(pos)}”.\`);

  const el = match[1];
  let index = pos + el.length;
  let hCount = 0;

  if (str[index] === "H") {
    index += 1;
    const number = str.slice(index).match(/^\d+/);
    hCount = number ? Number(number[0]) : 1;
    if (number) index += number[0].length;
  }

  return { el, hCount, next: index, raw: str.slice(pos, index) };
}

function findMatchingParen(str, start) {
  let depth = 0;
  for (let index = start; index < str.length; index += 1) {
    if (str[index] === "(") depth += 1;
    if (str[index] === ")") depth -= 1;
    if (depth === 0) return index;
  }
  throw new Error("Unclosed parenthesis.");
}

function readMultiplier(str, pos) {
  const match = str.slice(pos).match(/^\d+/);
  return match
    ? { value: Number(match[0]), next: pos + match[0].length }
    : { value: 1, next: pos };
}

function parseLinear(str, graph, anchor = null) {
  let index = 0;
  let current = anchor;
  let first = null;
  let pendingBond = 1;

  while (index < str.length) {
    const char = str[index];

    if (char === "=") {
      pendingBond = 2;
      index += 1;
      continue;
    }

    if (char === "#") {
      pendingBond = 3;
      index += 1;
      continue;
    }

    if (char === "(") {
      if (current === null) {
        throw new Error("A parenthesized group needs an attachment point here.");
      }

      const close = findMatchingParen(str, index);
      const inner = str.slice(index + 1, close);
      const multiplier = readMultiplier(str, close + 1);
      const charsAfter = str.slice(multiplier.next);
      const cap = graph.capacity(current);

      // CH3(CH2)4CH3 means serial repetition; CH3CH(CH3)CH3 means a branch.
      const serial =
        (multiplier.value > 1 && cap < multiplier.value) ||
        (multiplier.value === 1 && cap <= 1 && charsAfter.length > 0);

      if (serial) {
        for (let copy = 0; copy < multiplier.value; copy += 1) {
          const piece = parseLinear(inner, graph, current);
          current = piece.last;
        }
      } else {
        for (let copy = 0; copy < multiplier.value; copy += 1) {
          parseLinear(inner, graph, current);
        }
      }

      index = multiplier.next;
      continue;
    }

    const atom = readAtom(str, index);
    const id = graph.addNode(atom.el, atom.hCount);

    if (first === null) first = id;
    if (current !== null) graph.addBond(current, id, pendingBond);

    current = id;
    pendingBond = 1;
    index = atom.next;
  }

  return { first, last: current };
}

export function parseFormula(input) {
  const str = cleanFormula(input);
  if (!str) throw new Error("Enter a condensed formula.");

  const graph = new Graph();

  // Handles notation such as (CH3CH2CH2)2NH where the repeated group precedes
  // the atom to which both copies attach.
  if (str[0] === "(") {
    const close = findMatchingParen(str, 0);
    const multiplier = readMultiplier(str, close + 1);
    const remainder = str.slice(multiplier.next);

    if (multiplier.value > 1 && remainder) {
      const core = parseLinear(remainder, graph, null);
      const hub = core.first;
      const groupText = str.slice(1, close);

      for (let copy = 0; copy < multiplier.value; copy += 1) {
        const piece = parseLinear(groupText, graph, null);
        const candidates = [piece.last, piece.first].filter(
          (value, idx, array) => value !== null && array.indexOf(value) === idx
        );
        const endpoint = candidates.find((id) => graph.capacity(id) > 0);

        if (endpoint === undefined) {
          throw new Error("Repeated group has no free valence for attachment.");
        }

        graph.addBond(hub, endpoint, 1);
      }
    } else {
      parseLinear(str, graph, null);
    }
  } else {
    parseLinear(str, graph, null);
  }

  if (graph.nodes.length === 0) throw new Error("No heavy atoms were parsed.");
  return { graph, condensed: str };
}

export function validateGraph(graph) {
  return graph.nodes.map((node) => {
    const used = graph.bondOrderSum(node.id) + node.hCount;
    const allowed = ELEMENTS[node.el]?.valences || [];
    const ok = allowed.includes(used);

    return {
      id: node.id,
      el: node.el,
      h: node.hCount,
      used,
      allowed,
      ok
    };
  });
}

export function atomHybridization(graph, id) {
  const node = graph.nodes[id];
  const orders = graph.neighbors(id).map((neighbor) => neighbor.order);

  if (orders.some((order) => order === 3)) return "sp";
  if (orders.some((order) => order === 2)) return "sp2";

  if (node.el === "C" || node.el === "N" || node.el === "O" || node.el === "S") {
    return "sp3";
  }

  return "—";
}

export function detectGroup(graph) {
  for (const node of graph.nodes) {
    if (node.el === "O") {
      const neighbors = graph.neighbors(node.id).map((item) => graph.nodes[item.id]);
      const carbonCount = neighbors.filter((item) => item.el === "C").length;

      if (carbonCount === 2 && node.hCount === 0) return "Ether";
      if (carbonCount === 1 && node.hCount === 1) return "Alcohol";
    }
  }

  for (const node of graph.nodes) {
    if (node.el === "N") {
      const carbonCount = graph
        .neighbors(node.id)
        .map((item) => graph.nodes[item.id])
        .filter((item) => item.el === "C").length;

      if (carbonCount === 1 && node.hCount === 2) return "Primary amine";
      if (carbonCount === 2 && node.hCount === 1) return "Secondary amine";
      if (carbonCount === 3 && node.hCount === 0) return "Tertiary amine";
    }
  }

  if (graph.bonds.some((bond) => bond.order === 3)) return "Alkyne";
  if (graph.bonds.some((bond) => bond.order === 2)) return "Alkene";
  if (graph.nodes.every((node) => node.el === "C")) return "Hydrocarbon";

  return "Organic molecule";
}

function atomSMILES(node) {
  if (node.charge) {
    const hydrogens = node.hCount
      ? "H" + (node.hCount > 1 ? node.hCount : "")
      : "";
    return \`[\${node.el}\${hydrogens}\${node.charge > 0 ? "+" : "-"}]\`;
  }
  return node.el;
}

function bondSymbol(order) {
  if (order === 2) return "=";
  if (order === 3) return "#";
  return "";
}

export function graphToSmiles(graph) {
  const terminals = graph.nodes.filter((node) => graph.neighbors(node.id).length <= 1);
  const start = (terminals[0] || graph.nodes[0]).id;
  const seen = new Set();

  function walk(id, parent) {
    seen.add(id);
    const node = graph.nodes[id];
    const next = graph
      .neighbors(id)
      .filter((neighbor) => neighbor.id !== parent && !seen.has(neighbor.id));

    if (next.length === 0) return atomSMILES(node);

    let output = atomSMILES(node);
    const main = next[0];

    for (let index = 1; index < next.length; index += 1) {
      const branch = next[index];
      output += \`(\${bondSymbol(branch.order)}\${walk(branch.id, id)})\`;
    }

    output += bondSymbol(main.order) + walk(main.id, id);
    return output;
  }

  return walk(start, null);
}

export function explicitTokens(str) {
  const out = [];
  let index = 0;

  while (index < str.length) {
    if ("()=#".includes(str[index])) {
      out.push(str[index]);
      index += 1;
      continue;
    }

    if (/\d/.test(str[index])) {
      const match = str.slice(index).match(/^\d+/)[0];
      out.push(match);
      index += match.length;
      continue;
    }

    try {
      const atom = readAtom(str, index);
      out.push(atom.raw);
      index = atom.next;
    } catch {
      out.push(str[index]);
      index += 1;
    }
  }

  return out;
}

export function functionalSentence(group) {
  const descriptions = {
    Ether: "An oxygen is bonded to two carbon groups: R–O–R′.",
    Alcohol: "An oxygen bears H and is bonded to carbon: R–OH.",
    "Primary amine": "Nitrogen is bonded to one carbon group and bears two H atoms.",
    "Secondary amine": "Nitrogen is bonded to two carbon groups and bears one H atom.",
    "Tertiary amine": "Nitrogen is bonded to three carbon groups and bears no H.",
    Alkene: "The molecular graph contains a C=C double bond.",
    Alkyne: "The molecular graph contains a C≡C triple bond.",
    Hydrocarbon: "Only carbon and hydrogen are present in the parsed structure."
  };

  return descriptions[group] || "The graph is classified from its atom connectivity.";
}

export function atomDisplay(node, includeIndex = false) {
  const h = node.hCount ? "H" + (node.hCount > 1 ? node.hCount : "") : "";
  return \`\${node.el}\${h}\${includeIndex ? " · " + (node.id + 1) : ""}\`;
}

export function eligibleNewmanBonds(graph) {
  return graph.bonds.filter((bond) => {
    if (bond.order !== 1) return false;

    const a = graph.nodes[bond.a];
    const b = graph.nodes[bond.b];

    if (a.el !== "C" || b.el !== "C") return false;
    if (atomHybridization(graph, a.id) !== "sp3") return false;
    if (atomHybridization(graph, b.id) !== "sp3") return false;

    const aSigma = graph.neighbors(a.id).length + a.hCount;
    const bSigma = graph.neighbors(b.id).length + b.hCount;

    return aSigma === 4 && bSigma === 4;
  });
}

function compactNeighborLabel(graph, nodeId, centerId) {
  const node = graph.nodes[nodeId];
  const heavyDegree = graph.neighbors(nodeId).length;

  if (node.el === "C") {
    if (node.hCount === 3 && heavyDegree === 1) return "CH3";
    if (node.hCount === 2) return "CH2…";
    if (node.hCount === 1) return "CH…";
    return "C…";
  }

  if (node.el === "O") return node.hCount ? "OH" : "O…";
  if (node.el === "N") {
    const hydrogens = node.hCount ? "H" + (node.hCount > 1 ? node.hCount : "") : "";
    return \`N\${hydrogens}…\`;
  }

  return node.el;
}

export function substituentsForNewman(graph, centerId, excludeId) {
  const heavy = graph
    .neighbors(centerId)
    .filter((neighbor) => neighbor.id !== excludeId)
    .map((neighbor) => ({
      kind: "heavy",
      atomId: neighbor.id,
      label: compactNeighborLabel(graph, neighbor.id, centerId),
      order: neighbor.order
    }));

  const hydrogens = Array.from(
    { length: graph.nodes[centerId].hCount },
    (_, index) => ({
      kind: "H",
      atomId: null,
      label: "H",
      order: 1,
      hydrogenIndex: index
    })
  );

  // Put the carbon/hetero substituent first. This makes the Newman dihedral
  // meaningful for the classic butane anti/gauche comparison.
  return [...heavy, ...hydrogens].slice(0, 3);
}

export function newmanConformation(graph, bond, dihedralDegrees) {
  const front = substituentsForNewman(graph, bond.a, bond.b);
  const back = substituentsForNewman(graph, bond.b, bond.a);
  const normalized = ((Number(dihedralDegrees) % 360) + 360) % 360;

  const hasSingleNonHEach =
    front.filter((item) => item.kind !== "H").length === 1 &&
    back.filter((item) => item.kind !== "H").length === 1;

  const distance = (target) => {
    const raw = Math.abs(normalized - target) % 360;
    return Math.min(raw, 360 - raw);
  };

  let label = "rotated conformation";

  if (hasSingleNonHEach) {
    if (distance(180) <= 15) label = "anti staggered";
    else if (distance(60) <= 15 || distance(300) <= 15) label = "gauche staggered";
    else if (distance(0) <= 15 || distance(120) <= 15 || distance(240) <= 15) {
      label = "eclipsed";
    } else {
      label = "intermediate rotation";
    }
  } else if (
    distance(60) <= 15 ||
    distance(180) <= 15 ||
    distance(300) <= 15
  ) {
    label = "staggered";
  } else if (
    distance(0) <= 15 ||
    distance(120) <= 15 ||
    distance(240) <= 15
  ) {
    label = "eclipsed";
  }

  return { front, back, normalized, label };
}

export function bondLabel(graph, bond) {
  const a = graph.nodes[bond.a];
  const b = graph.nodes[bond.b];
  return \`\${a.el}\${a.id + 1}–\${b.el}\${b.id + 1}\`;
}

export function expandWithHydrogens(graph) {
  const atoms = graph.nodes.map((node) => ({
    id: node.id,
    sourceId: node.id,
    el: node.el,
    isHydrogen: false
  }));

  const bonds = graph.bonds.map((bond) => ({
    a: bond.a,
    b: bond.b,
    order: bond.order,
    sourceBondId: bond.id
  }));

  for (const node of graph.nodes) {
    for (let index = 0; index < node.hCount; index += 1) {
      const id = atoms.length;
      atoms.push({
        id,
        sourceId: node.id,
        el: "H",
        isHydrogen: true,
        hydrogenIndex: index
      });
      bonds.push({
        a: node.id,
        b: id,
        order: 1,
        sourceBondId: null
      });
    }
  }

  return { atoms, bonds };
}

export function molecularFormula(graph) {
  const counts = new Map();

  for (const node of graph.nodes) {
    counts.set(node.el, (counts.get(node.el) || 0) + 1);
    if (node.hCount) counts.set("H", (counts.get("H") || 0) + node.hCount);
  }

  const order = ["C", "H", ...[...counts.keys()].filter((el) => el !== "C" && el !== "H").sort()];
  return order
    .filter((el) => counts.has(el))
    .map((el) => el + (counts.get(el) > 1 ? counts.get(el) : ""))
    .join("");
}
