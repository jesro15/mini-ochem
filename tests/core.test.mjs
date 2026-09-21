import assert from "node:assert/strict";

import {
  parseFormula,
  validateGraph,
  graphToSmiles,
  detectGroup,
  atomHybridization,
  eligibleNewmanBonds,
  molecularFormula
} from "../chem-core.js";

function build(formula) {
  const parsed = parseFormula(formula);
  const validation = validateGraph(parsed.graph);

  assert.equal(
    validation.every((item) => item.ok),
    true,
    formula + " should pass neutral valence checks"
  );

  return {
    graph: parsed.graph,
    smiles: graphToSmiles(parsed.graph),
    group: detectGroup(parsed.graph),
    formula: molecularFormula(parsed.graph)
  };
}

{
  const result = build("(CH3CH2CH2)2NH");
  assert.equal(result.formula, "C6H15N");
  assert.equal(result.smiles, "CCCNCCC");
  assert.equal(result.group, "Secondary amine");
  assert.equal(result.graph.nodes.length, 7);
}

{
  const result = build("CH3CH2CH2CH2OCH2CH3");
  assert.equal(result.formula, "C6H14O");
  assert.equal(result.smiles, "CCCCOCC");
  assert.equal(result.group, "Ether");
}

{
  const result = build("CH3(CH2)4CH3");
  assert.equal(result.formula, "C6H14");
  assert.equal(result.smiles, "CCCCCC");
}

{
  const result = build("CH3CH(CH3)CH3");
  assert.equal(result.formula, "C4H10");
  assert.equal(result.smiles, "CC(C)C");
}

{
  const result = build("CH2=CHCH3");
  assert.equal(result.formula, "C3H6");
  assert.equal(atomHybridization(result.graph, 0), "sp2");
  assert.equal(atomHybridization(result.graph, 1), "sp2");
  assert.equal(atomHybridization(result.graph, 2), "sp3");
  assert.equal(eligibleNewmanBonds(result.graph).length, 0);
}

{
  const result = build("CH3CH2CH2CH3");
  assert.equal(result.formula, "C4H10");
  assert.equal(eligibleNewmanBonds(result.graph).length, 3);
}

console.log("MiniOChem core tests passed.");
