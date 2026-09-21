# MiniOChem

A small browser-native organic chemistry teaching app that keeps one molecular graph and renders it in multiple representations.

## Current views

- **Build / Lewis** — parse condensed notation, check valence, infer introductory hybridization, show lone pairs/connectivity, and render a conventional 2D structure.
- **3D geometry** — expand implicit hydrogens and build an idealized local VSEPR/hybridization model that can be rotated freely.
- **Newman projection** — choose an eligible sp3 C-C single bond and rotate the back carbon through a full 360 degree dihedral.
- **Symmetry explorer** — overlay x/y/z axes, rotate the molecule against a fixed ghost reference, and display xy/xz/yz mirror planes.

The 3D model is intentionally labeled as **idealized educational geometry**, not an energy-minimized conformer.

## Architecture

```text
condensed formula
      |
      v
chem-core.js
  parser -> molecular graph -> valence / hybridization / functional group
      |
      +--> OpenChemLib -> conventional 2D SVG
      |
      +--> render-3d.js -> idealized 3D atoms + bonds -> Three.js
      |
      +--> render-newman.js -> bond-axis projection
      |
      +--> MiniOChem Web Component
```

Files:

- `chem-core.js` — reusable chemistry graph/parser logic; no browser rendering dependency.
- `render-3d.js` — idealized 3D geometry and Three.js scene.
- `render-newman.js` — Newman projection SVG renderer.
- `miniochem.js` — reusable `<mini-ochem>` Web Component.
- `miniochem.css` — component presentation.
- `index.html` — demo shell only.
- `tests/core.test.mjs` — zero-dependency parser/core smoke tests.

The separation is deliberate: **chemistry truth lives in the graph; visual storytelling lives in renderers.**

## Run in Codex or locally

Clone/open the repo and run:

```bash
npm test
npm run serve
```

Then open:

```text
http://localhost:8000
```

No npm install is required for the app itself. OpenChemLib and Three.js are loaded as pinned browser ESM modules.

## Deep links

The demo supports a formula and view in the URL:

```text
http://localhost:8000/?formula=CH3CH2CH2CH3&view=newman
```

Supported view values:

```text
build
3d
newman
symmetry
```

## Embed it in the future OChem project

Copy/import these files:

```text
chem-core.js
render-3d.js
render-newman.js
miniochem.js
miniochem.css
```

Then:

```html
<script type="module" src="./miniochem.js"></script>

<mini-ochem
  formula="CH3CH2CH2CH3"
  view="newman">
</mini-ochem>
```

From JavaScript:

```js
const viewer = document.querySelector("mini-ochem");

viewer.setFormula("CH3CH2CH2CH2OCH2CH3");
viewer.setView("3d");
```

It emits:

- `moleculechange` with condensed formula, generated SMILES, molecular formula, and broad functional-group classification.
- `viewchange` with the active representation.

This gives a future OChem/Codex project a stable interface rather than depending on the demo page.

## Examples already covered by tests

- `(CH3CH2CH2)2NH`
- `CH3CH2CH2CH2OCH2CH3`
- `CH3(CH2)4CH3`
- `CH3CH(CH3)CH3`
- `CH2=CHCH3`
- `CH3CH2CH2CH3`

## Parser scope today

Supported:

- common acyclic condensed formulas,
- C, N, O, S, P, F, Cl, Br, I,
- H counts attached to an atom token,
- common branches,
- repeated parenthetical groups,
- single, double, and triple bonds,
- common neutral valence checks.

Not yet a general chemical language:

- rings,
- stereochemical `R/S` or `E/Z`,
- charged condensed-formula grammar,
- resonance families,
- reaction/mechanism arrows,
- force-field conformer minimization,
- automatic point-group assignment.

## Next useful OChem layers

The component boundary is designed so later additions can use the same graph:

1. **Conformation coupling** — rotating a Newman dihedral should rotate the corresponding fragment in the 3D scene.
2. **Wedge/dash and chirality** — assign stereocenters and compare 2D wedge/dash drawings with 3D configurations.
3. **Cyclohexane** — chair/boat conformers, axial/equatorial positions, ring flips.
4. **Symmetry operations** — explicit Cn rotation, sigma reflection, inversion, and optional point-group classification using chemically valid coordinates.
5. **Resonance / electron pushing** — animate lone pairs and pi electrons while preserving graph/electron bookkeeping.
6. **Orbital mode** — p-orbital alignment for conjugation, sp/sp2/sp3 geometry, and sigma/pi bond decomposition.

## Rendering choices

- **OpenChemLib** is used for chemistry-aware 2D molecular depiction.
- **Three.js** is used for interactive spatial reasoning and orbit controls.
- Custom SVG is used for Newman projections and Lewis/connectivity teaching graphics.

This keeps the app small while leaving room for deeper OChem visualization later.


## GitHub Pages: one-time repository setting

The normal GitHub repository page only displays source files; it does **not** execute `index.html`.

A Pages deployment workflow is already included at:

```text
.github/workflows/pages.yml
```

For the live app, enable Pages once in the repository UI:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Then run **Actions → Deploy MiniOChem to GitHub Pages → Run workflow**, or push another commit.

The expected live URL is:

```text
https://jesro15.github.io/learn_sci/
```

Because this repository is private, GitHub Pages for it requires a GitHub plan that supports Pages on private repositories. If the Pages setting is unavailable, either make a separate public deployment repository or use the local/Codex workflow below.
