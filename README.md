# MiniOChem

[Open MiniOChem](https://jesro15.github.io/mini-ochem/)

An organic chemistry teaching app with an editable molecular structure shared by skeletal, 3D, Lewis, Newman, symmetry, hybridization, bond-length, and bond-angle views.

## Draw and choose isomers

1. Search by name, condensed formula, SMILES, InChI, InChIKey, CAS number, or PubChem CID. Molecular formulas show a candidate chooser when ambiguous.
2. Select **Draw / edit structure**, or start drawing without searching.
3. Change bonds, atoms, rings, or branches for constitutional isomers. Use the editor's solid/hashed wedge tools for tetrahedral stereo and double-bond substituent arrangement for E/Z stereo. The native toolbar includes undo.
4. Optionally enter **Isomeric SMILES** and select **Load SMILES into drawing**. For example, compare `C[C@H](O)CC` with `C[C@@H](O)CC`, or `C/C=C/C` with `C/C=C\C`.
5. Select **Apply structure** to update all views. **Cancel** leaves the applied molecule unchanged. Edits clear the previous compound's name/CID and computed coordinates.

Custom structures are shared in the URL as explicit `SMILES:` queries, retaining stereochemistry and avoiding ambiguous formula/name lookups. Search and related compounds still use PubChem; drawing and applying custom structures work without PubChem.

On phones the editor and controls fit the viewport, support pointer/touch drawing, and provide a text alternative for precise stereochemical input. The chemistry editor's native icon toolbar is denser than the surrounding touch controls.

## Compare isomers

Search **dimethylcyclopropane** to compare its complete four-member family immediately: 1,1-dimethylcyclopropane, the cis-1,2 meso form, and the two trans-1,2 enantiomers. Searching **1,2-dimethylcyclopropane** limits the comparison to its three stereoisomers. These are explicit structure records, not an arbitrary first PubChem name match. They work without a PubChem connection.

Use **Skeletal comparison** or **3D comparison**. Up to four cards stay side by side; on phones the row scrolls horizontally. Each computed 3D model rotates independently. All 3D views have left/up/down/right arrows for 15° rotation steps and a reset button; drag and pinch/scroll controls remain available. **Explore this structure** opens the existing teaching views without discarding the comparison.

For a loaded molecule, **Isomers / compare** enumerates tetrahedral carbon and non-ring double-bond configurations for its current connectivity, deduplicating symmetry-equivalent structures (including meso duplicates). At most six stereo elements / 64 assignments are enumerated. This is a deliberately bounded enumerator: axial, ring-double-bond, non-carbon, and other stereochemistry are not enumerated. The dimethylcyclopropane family also includes the other methyl position pattern.

**Add current to comparison**, or **Add to comparison** in formula/name/related results, builds a custom comparison. Duplicate structures are not added twice, and a fifth card requires removing one first. **Same formula** is a bounded PubChem result list, not a claim to enumerate every constitutional isomer. Multiple PubChem name matches now show a chooser instead of silently taking the first record.

`isomers.js` owns family records and bounded stereo enumeration; `comparison-panel.js` owns the comparison views, cached geometry, and renderer cleanup. Tests verify the distinct family members, meso deduplication, R/S labels, cis/trans ring-face geometry, side-by-side desktop/mobile rendering, and switching into the existing views.

## Editor choice

We evaluated [Ketcher](https://github.com/epam/ketcher) and [OpenChemLib CanvasEditor](https://cheminfo.github.io/openchemlib-js/classes/CanvasEditor.html). Ketcher offers a broader editing UI, but its standalone React/Indigo stack would add another chemistry engine and integration layer. OpenChemLib 9.25.0 is already the app's chemistry engine and includes CanvasEditor, isomeric SMILES, stereo-aware 2D coordinate invention, and [stereo-aware conformer generation](https://cheminfo.github.io/openchemlib-js/classes/ConformerGenerator.html). It therefore fits this small teaching app better. It is pinned and bundled, along with Three.js, rather than fetched from an ESM CDN at runtime.

## Structure and derived views

- `molecule-structure.js`: OCL molecule is the source of truth; derived graph, CIP labels, isomeric SMILES, geometry, and atom mappings are built together. Display code works on copies.
- `structure-worker.js`: generates a computed conformer from a V3000 molfile copy, with a 15-second limit. Generation preserves specified R/S and E/Z and runs off the UI thread.
- `molecule-resolver.js`: handles identifiers and PubChem. Requests stereo-bearing SMILES; accepts a PubChem conformer only when its stereo-aware identity matches the selected structure.
- `miniochem.js`: draft/apply/cancel workflow, skeletal wedge/hash bonds and CIP labels, teaching overlays, touch selection, related structures, and secondary views.
- `render-3d.js`: displays the current derived geometry in both 3D and symmetry views.
- `render-newman.js`: takes substituent ordering from the current conformer's coordinates so stereocenters are not reordered arbitrarily.
- `chem-core.js`: condensed formula parser, graph helpers, introductory chemistry rules.

Geometry is computed, not experimental literature data. If conformer generation fails or times out, existing idealized geometry remains available and is explicitly labeled as potentially unsuitable for stereochemistry. Unspecified stereochemistry remains unspecified; a computed conformer shows one possible arrangement.

The Newman slider rotates the back group in a bond-rotation teaching model; it does not change the 3D conformer. Symmetry is an operation explorer, not an automatic point-group assignment. Hybridization and Lewis lone-pair rules remain introductory approximations. Editing currently accepts one connected, non-query molecule with at most 80 atoms. This is not a reaction editor, conformer energy search, or full stereoisomer enumerator.

## Development and tests

Node 22.12+ is required by the build tools.

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

The dev server prints its local URL. Browser tests build the production site and start a preview on port 4173. They cover desktop and emulated phone workflows, including direct canvas drawing, R/S and E/Z edits, constitutional isomers, invalid/empty drafts, cancellation, share-link reload, overlays, 3D, Newman, and symmetry. Chemistry tests check isomer identity through molfile/SMILES/conformer roundtrips and the spatial E/Z arrangement.

To test a deployed build:

```sh
TEST_URL=https://jesro15.github.io/mini-ochem/ npm run test:browser
```

GitHub Actions installs locked dependencies and runs chemistry and browser tests. The Pages workflow deploys only the tested `dist/` build. Enable **Settings → Pages → GitHub Actions** for deployment.

The `<mini-ochem>` custom element retains `setMolecule`, `setFormula`, `setView`, `moleculechange`, and `viewchange`. Import it through the build tool; primary `view` values are `skeletal` and `3d`, with Lewis/Newman/symmetry accessible through the secondary controls.
