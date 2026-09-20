# Organic Structure Builder

A deliberately small browser-only teaching tool for turning condensed organic formulas into visual molecular structures.

## Why this exists

The goal is not merely to show the final skeletal formula. The app exposes the intermediate representation:

1. tokenize the condensed formula,
2. expand branches and repeated parenthetical groups,
3. build a heavy-atom molecular graph,
4. check common neutral valences,
5. identify a basic functional group,
6. convert the graph to SMILES,
7. render a conventional 2D structure with OpenChemLib.

The interface is intended for early organic chemistry work where the useful question is often “how do I systematically build this?” rather than “what is the final picture?”

## Stack

- one \`index.html\`
- vanilla JavaScript
- inline CSS
- SVG for the teaching/connectivity diagram
- OpenChemLib loaded as an ESM module from a CDN for the final 2D depiction
- no React, no framework, no backend, no build step

## Run locally

From the repo directory:

\`\`\`bash
python3 -m http.server 8000
\`\`\`

Then open:

\`\`\`
http://localhost:8000
\`\`\`

You can also use:

\`\`\`bash
npx serve .
\`\`\`

A local HTTP server is preferable to double-clicking \`index.html\` because the page imports OpenChemLib as an ES module.

## Initial examples

- \`(CH3CH2CH2)2NH\` — dipropylamine
- \`CH3CH2CH2CH2OCH2CH3\` — 1-ethoxybutane
- \`CH3CH2OH\` — ethanol
- \`CH3CH(CH3)CH3\` — 2-methylpropane
- \`CH3(CH2)4CH3\` — hexane
- \`(CH3)2CHOH\` — propan-2-ol
- \`CH2=CHCH3\` — propene

## Current parser scope

The parser is intentionally constrained instead of pretending to understand arbitrary chemical notation.

Supported today:

- common acyclic condensed formulas,
- C, N, O, S, P, F, Cl, Br, I,
- H counts attached to an atom token,
- common branches,
- repeated parenthetical groups,
- single, double, and triple bonds,
- common neutral valence checks.

Good next additions:

- formal charge notation,
- carbonyl-focused condensed shorthand such as \`CO2H\` / \`CHO\` with explicit disambiguation,
- rings,
- stereochemistry,
- resonance-mode overlays,
- electron-pushing arrows,
- curated exercise data with expected graph + explanation,
- a second Lewis-structure mode with all hydrogens and lone pairs explicitly placed,
- test fixtures for hundreds of textbook condensed formulas.

## Design principle

Keep chemistry truth and visual storytelling separate.

The parser owns the graph. OpenChemLib owns chemistry-grade 2D depiction. The custom SVG layer owns the explanatory animation. That makes it possible to make the interface more playful without allowing animation code to invent chemistry.
