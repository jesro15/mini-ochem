import * as OCL from 'openchemlib';
import { structureKey } from './isomers.js';
import { resolveStructure } from './molecule-structure.js';
import { Molecule3DView } from './render-3d.js';
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export class ComparisonPanel {
  constructor(root, open) {
    this.root = root; this.open = open; this.items = []; this.views = []; this.version = 0; this.mode = 'skeletal'; this.cache = new Map();
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.compareMode) { this.mode = button.dataset.compareMode; this.render(); }
      if (button.hasAttribute('data-clear-compare')) { this.items = []; this.render(); }
      if (button.hasAttribute('data-remove-compare')) { this.items.splice(Number(button.dataset.removeCompare), 1); this.render(); }
      if (button.hasAttribute('data-open-compare')) this.open(this.items[Number(button.dataset.openCompare)]);
    });
    this.observer = new ResizeObserver(() => this.views.forEach(({view, stage}) => view.resize(stage.clientWidth, stage.clientHeight)));
    this.observer.observe(root);
  }
  setItems(items, description = '') {
    const unique = new Map(items.map(item => [structureKey(item.smiles), item]));
    this.items = [...unique.values()].slice(0, 4);
    this.description = description;
    this.render();
  }
  add(item) {
    const key = structureKey(item.smiles);
    if (this.items.some(existing => structureKey(existing.smiles) === key)) {
      this.root.querySelector('.compare-status').textContent = 'That structure is already in the comparison.';
      return;
    }
    if (this.items.length === 4) {
      this.root.querySelector('.compare-status').textContent = 'Four structures are selected. Remove one to add another.';
      this.root.scrollIntoView({block:'start', behavior:'smooth'}); return;
    }
    this.items.push(item); this.description = 'Compare up to four selected structures. Each 3D model rotates independently.'; this.render();
    this.root.scrollIntoView({block:'start', behavior:'smooth'});
  }
  clearViews() { this.views.forEach(({view}) => view.dispose()); this.views = []; }
  dispose() { ++this.version; this.clearViews(); this.observer.disconnect(); }
  async render() {
    const version = ++this.version;
    this.clearViews();
    this.root.hidden = !this.items.length;
    if (!this.items.length) { this.root.innerHTML = ''; return; }
    this.root.innerHTML = `<div class="comparison-heading"><h2>Compare isomers <span>(${this.items.length}/4)</span></h2>
      <div class="comparison-actions"><button data-compare-mode="skeletal" aria-pressed="${this.mode === 'skeletal'}">Skeletal comparison</button>
      <button data-compare-mode="3d" aria-pressed="${this.mode === '3d'}">3D comparison</button><button data-clear-compare>Clear comparison</button></div></div>
      <p>${esc(this.description || 'Compare selected structures side by side.')}</p>
      <p class="compare-status" role="status" aria-live="polite">${this.mode === '3d' ? 'Generating computed 3D conformers…' : 'On a phone, swipe the comparison horizontally to see every card.'}</p>
      <div class="comparison-grid">${this.items.map((item,index) => {
        const molecule = OCL.Molecule.fromSmiles(item.smiles);
        const formula = item.molecularFormula || molecule.getMolecularFormula().formula;
        return `<article class="comparison-card"><h3>${esc(item.title || 'Custom molecule')}</h3><p class="comparison-formula">${esc(formula)}</p><p class="comparison-relationship">${esc(item.relationship || '')}</p>
          <div class="comparison-drawing" ${this.mode !== 'skeletal' ? 'hidden' : ''}>${molecule.toSVG(320,260,'comparison-'+index,{autoCrop:true,autoCropMargin:35})}</div>
          <div class="comparison-stage" data-compare-stage="${index}" ${this.mode !== '3d' ? 'hidden' : ''}></div>
          <div class="comparison-card-actions"><button data-open-compare="${index}">Explore this structure</button><button data-remove-compare="${index}" aria-label="Remove ${esc(item.title || 'structure')}">Remove</button></div></article>`;
      }).join('')}</div>`;
    if (this.mode !== '3d') return;
    // Generate sequentially to bound worker memory on phones. Cached results
    // keep switching representations and removing cards inexpensive.
    for (let index=0; index<this.items.length; index++) {
      const item = this.items[index];
      const stage = this.root.querySelector(`[data-compare-stage="${index}"]`);
      try {
        const key = structureKey(item.smiles);
        let result = this.cache.get(key);
        if (!result) {
          result = await resolveStructure(OCL.Molecule.fromSmiles(item.smiles));
          if (version !== this.version) return;
          if (this.cache.size >= 16) this.cache.delete(this.cache.keys().next().value);
          this.cache.set(key,result);
        }
        if (version !== this.version) return;
        if (!result.geometry) { stage.textContent = 'A stereo-aware 3D conformer is unavailable. Use the skeletal comparison.'; continue; }
        const view = new Molecule3DView();
        this.views.push({view,stage});
        view.setGraph(result.graph,result.geometry); view.mount(stage);
      } catch (error) {
        if (version !== this.version) return;
        stage.textContent = '3D unavailable: ' + error.message;
      }
    }
    if (version === this.version) this.root.querySelector('.compare-status').textContent = 'Computed conformers, not measured structures. Drag each model to rotate; pinch or scroll to zoom.';
  }
}
