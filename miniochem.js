import * as OCL from "https://esm.sh/openchemlib@9.25.0";

import {
  ELEMENTS,
  KNOWN,
  parseFormula,
  validateGraph,
  graphToSmiles,
  detectGroup,
  atomHybridization,
  explicitTokens,
  functionalSentence,
  eligibleNewmanBonds,
  bondLabel,
  molecularFormula
} from "./chem-core.js";

import { Molecule3DView } from "./render-3d.js";
import { renderNewmanSvg } from "./render-newman.js";

const CSS_URL = new URL("./miniochem.css", import.meta.url).href;

const TEMPLATE = [
  '<div class="app">',
    '<div class="toolbar">',
      '<input class="formula" aria-label="Condensed organic formula" spellcheck="false">',
      '<button class="build">Build molecule</button>',
    '</div>',
    '<div class="error"></div>',

    '<div class="tabs" role="tablist">',
      '<button class="tab active" data-view="build">Build / Lewis</button>',
      '<button class="tab" data-view="3d">3D geometry</button>',
      '<button class="tab" data-view="newman">Newman projection</button>',
      '<button class="tab" data-view="symmetry">Symmetry explorer</button>',
    '</div>',

    '<section class="panel active" data-panel="build">',
      '<div class="summary">',
        '<div><div class="eyebrow">Parsed structure</div><div class="name" id="molName">—</div></div>',
        '<div class="meta" id="meta">—</div>',
      '</div>',
      '<div class="build-grid">',
        '<div class="main-drawing" id="mol2d"></div>',
        '<div class="reasoning">',
          '<div class="eyebrow">Construction sequence</div>',
          '<div id="steps"></div>',
        '</div>',
      '</div>',
      '<div class="lewis-wrap">',
        '<div class="view-header">',
          '<div><div class="eyebrow">Lewis / connectivity map</div><h3>What is attached to what?</h3></div>',
          '<div class="note">Hydrogens stay condensed into the atom labels here; common lone pairs are shown as dots. This view is for electron bookkeeping, not molecular shape.</div>',
        '</div>',
        '<svg id="lewisSvg" viewBox="0 0 900 280" aria-label="Lewis and connectivity diagram"></svg>',
      '</div>',
    '</section>',

    '<section class="panel" data-panel="3d">',
      '<div class="view-header">',
        '<div><div class="eyebrow">Idealized local geometry</div><h3>Rotate the molecule in three dimensions</h3></div>',
        '<div class="note">Bond angles are generated from introductory VSEPR / hybridization rules. This is an educational geometry model, not an energy-minimized conformer.</div>',
      '</div>',
      '<div class="stage" id="stage3d"><div class="stage-help">drag to orbit · scroll to zoom · right-drag to pan</div></div>',
      '<div class="legend"><span><b>Carbon</b> dark</span><span><b>H</b> white</span><span><b>N</b> blue</span><span><b>O</b> red</span></div>',
    '</section>',

    '<section class="panel" data-panel="newman">',
      '<div class="view-header">',
        '<div><div class="eyebrow">Look directly down a σ bond</div><h3>Newman projection</h3></div>',
        '<div class="note">Choose an sp³ C–C single bond. The front carbon is the first atom in the selector; the back carbon is directly behind it.</div>',
      '</div>',
      '<div class="newman-layout">',
        '<div class="newman-canvas">',
          '<svg id="newmanSvg" viewBox="0 0 560 500"></svg>',
          '<div class="empty" id="newmanEmpty" hidden>This molecule does not currently contain an eligible sp³ C–C single bond.</div>',
        '</div>',
        '<div class="controls">',
          '<div class="control"><label for="newmanBond">Viewing bond</label><select id="newmanBond"></select></div>',
          '<div class="control">',
            '<label for="dihedral">Back-carbon rotation</label>',
            '<div class="range-row"><input id="dihedral" type="range" min="0" max="360" step="1" value="60"><div class="readout" id="dihedralValue">60°</div></div>',
            '<div class="presets">',
              '<button class="preset" data-angle="0">0° eclipsed</button>',
              '<button class="preset" data-angle="60">60° staggered</button>',
              '<button class="preset" data-angle="180">180° anti</button>',
              '<button class="preset" data-angle="300">300° gauche</button>',
            '</div>',
          '</div>',
          '<div class="conformation" id="conformation">—</div>',
        '</div>',
      '</div>',
    '</section>',

    '<section class="panel" data-panel="symmetry">',
      '<div class="view-header">',
        '<div><div class="eyebrow">Spatial operations</div><h3>Test rotation axes and mirror planes</h3></div>',
        '<div class="note">The pale reference stays fixed. Rotate the solid molecule about x, y, or z and ask whether every atom maps onto an indistinguishable atom.</div>',
      '</div>',
      '<div class="sym-layout">',
        '<div class="stage" id="stageSym"></div>',
        '<div class="sym-controls">',
          '<div class="control"><label for="symAxis">Rotation axis</label><select id="symAxis"><option value="x">x axis</option><option value="y">y axis</option><option value="z" selected>z axis</option></select></div>',
          '<div class="control">',
            '<label for="symAngle">Rotation operation</label>',
            '<div class="range-row"><input id="symAngle" type="range" min="0" max="360" step="1" value="180"><div class="readout" id="symAngleValue">180°</div></div>',
            '<div class="presets">',
              '<button class="preset sym-preset" data-sym-angle="90">90°</button>',
              '<button class="preset sym-preset" data-sym-angle="120">120°</button>',
              '<button class="preset sym-preset" data-sym-angle="180">180°</button>',
              '<button class="preset sym-preset" data-sym-angle="360">360°</button>',
            '</div>',
          '</div>',
          '<div class="control"><label for="mirrorPlane">Mirror-plane overlay</label><select id="mirrorPlane"><option value="none">none</option><option value="xy">xy plane</option><option value="xz">xz plane</option><option value="yz">yz plane</option></select></div>',
          '<div class="operation">A formal symmetry operation must leave the molecule indistinguishable after the operation. This explorer provides an axis/plane and a visual superposition test; it does <b>not</b> automatically assign a molecular point group.</div>',
        '</div>',
      '</div>',
    '</section>',
  '</div>'
].join("");

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function atomText(node) {
  return node.el + (node.hCount ? "H" + (node.hCount > 1 ? node.hCount : "") : "");
}

function treeLayout(graph, width, height) {
  const start = (graph.nodes.find(function (node) {
    return graph.neighbors(node.id).length <= 1;
  }) || graph.nodes[0]).id;

  const level = new Map([[start, 0]]);
  const queue = [start];

  while (queue.length) {
    const id = queue.shift();
    graph.neighbors(id).forEach(function (neighbor) {
      if (!level.has(neighbor.id)) {
        level.set(neighbor.id, level.get(id) + 1);
        queue.push(neighbor.id);
      }
    });
  }

  const maxLevel = Math.max.apply(null, Array.from(level.values()).concat([1]));
  const grouped = new Map();

  level.forEach(function (value, id) {
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(id);
  });

  const positions = [];
  grouped.forEach(function (ids, value) {
    ids.forEach(function (id, index) {
      const x = 70 + (width - 140) * (value / maxLevel);
      const y = ids.length === 1
        ? height / 2
        : 55 + (height - 110) * (index / (ids.length - 1));
      positions[id] = { x: x, y: y };
    });
  });

  return positions;
}

function renderLewisSvg(svg, graph) {
  const positions = treeLayout(graph, 900, 280);
  const parts = [];

  graph.bonds.forEach(function (bond) {
    const a = positions[bond.a];
    const b = positions[bond.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const ox = (-dy / length) * 4.5;
    const oy = (dx / length) * 4.5;

    for (let index = 0; index < bond.order; index += 1) {
      const shift = index - (bond.order - 1) / 2;
      parts.push(
        '<line x1="' + (a.x + ox * shift) +
        '" y1="' + (a.y + oy * shift) +
        '" x2="' + (b.x + ox * shift) +
        '" y2="' + (b.y + oy * shift) +
        '" stroke="#777168" stroke-width="2.2"/>'
      );
    }
  });

  graph.nodes.forEach(function (node) {
    const p = positions[node.id];
    parts.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="27" fill="#fffdf8" stroke="#171714" stroke-width="1.6"/>');
    parts.push('<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="13" font-family="ui-monospace,monospace" fill="#171714">' + esc(atomText(node)) + '</text>');
    parts.push('<text x="' + p.x + '" y="' + (p.y + 43) + '" text-anchor="middle" font-size="10" font-family="ui-sans-serif,sans-serif" fill="#777168">' + atomHybridization(graph, node.id) + '</text>');

    const lonePairs = ELEMENTS[node.el] ? ELEMENTS[node.el].lonePairs : 0;
    const pairCount = Math.min(lonePairs, 3);

    for (let pair = 0; pair < pairCount; pair += 1) {
      const angle = -Math.PI / 2 + (pair - (pairCount - 1) / 2) * 0.52;
      const cx = p.x + Math.cos(angle) * 35;
      const cy = p.y + Math.sin(angle) * 35;
      parts.push('<circle cx="' + (cx - 2.3) + '" cy="' + cy + '" r="1.7" fill="#cf523a"/>');
      parts.push('<circle cx="' + (cx + 2.3) + '" cy="' + cy + '" r="1.7" fill="#cf523a"/>');
    }
  });

  svg.innerHTML = parts.join("");
}

class MiniOChem extends HTMLElement {
  static get observedAttributes() {
    return ["formula", "view"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = '<link rel="stylesheet" href="' + CSS_URL + '">' + TEMPLATE;

    this.state = {
      parsed: null,
      graph: null,
      smiles: "",
      group: "",
      currentView: "build",
      newmanBondIndex: 0,
      dihedral: 60
    };

    this.threeView = null;
    this.resizeObserver = null;
  }

  connectedCallback() {
    this.bindUI();

    const formula = this.getAttribute("formula") || "(CH3CH2CH2)2NH";
    this.$(".formula").value = formula;
    this.build(formula);

    const view = this.getAttribute("view");
    if (view) this.setView(view);
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.threeView) this.threeView.dispose();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if (name === "formula" && newValue) {
      this.$(".formula").value = newValue;
      this.build(newValue);
    }

    if (name === "view" && newValue) {
      this.setView(newValue);
    }
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.shadowRoot.querySelectorAll(selector));
  }

  bindUI() {
    const self = this;

    this.$(".build").addEventListener("click", function () {
      self.build(self.$(".formula").value);
    });

    this.$(".formula").addEventListener("keydown", function (event) {
      if (event.key === "Enter") self.build(self.$(".formula").value);
    });

    this.$$(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        self.setView(tab.dataset.view);
      });
    });

    this.$("#newmanBond").addEventListener("change", function (event) {
      self.state.newmanBondIndex = Number(event.target.value);
      self.renderNewman();
    });

    this.$("#dihedral").addEventListener("input", function (event) {
      self.state.dihedral = Number(event.target.value);
      self.$("#dihedralValue").textContent = self.state.dihedral + "°";
      self.renderNewman();
    });

    this.$$(".preset[data-angle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const value = Number(button.dataset.angle);
        self.state.dihedral = value;
        self.$("#dihedral").value = value;
        self.$("#dihedralValue").textContent = value + "°";
        self.renderNewman();
      });
    });

    this.$("#symAxis").addEventListener("change", function () { self.updateSymmetry(); });
    this.$("#symAngle").addEventListener("input", function () {
      self.$("#symAngleValue").textContent = self.$("#symAngle").value + "°";
      self.updateSymmetry();
    });
    this.$("#mirrorPlane").addEventListener("change", function () { self.updateSymmetry(); });

    this.$$(".sym-preset").forEach(function (button) {
      button.addEventListener("click", function () {
        self.$("#symAngle").value = button.dataset.symAngle;
        self.$("#symAngleValue").textContent = button.dataset.symAngle + "°";
        self.updateSymmetry();
      });
    });
  }

  build(value) {
    const error = this.$(".error");
    error.style.display = "none";
    error.textContent = "";

    try {
      const parsed = parseFormula(value);
      const validations = validateGraph(parsed.graph);
      const invalid = validations.filter(function (item) { return !item.ok; });

      if (invalid.length) {
        const message = invalid.map(function (item) {
          return item.el + (item.id + 1) + ": " + item.used +
            " valence units, expected " + item.allowed.join(" or ");
        }).join("; ");
        throw new Error("Valence check failed — " + message + ".");
      }

      const smiles = graphToSmiles(parsed.graph);
      const group = detectGroup(parsed.graph);

      this.state.parsed = parsed;
      this.state.graph = parsed.graph;
      this.state.smiles = smiles;
      this.state.group = group;
      this.state.newmanBondIndex = 0;

      if (this.getAttribute("formula") !== parsed.condensed) {
        this.setAttribute("formula", parsed.condensed);
      }

      this.renderBuild(validations);
      this.ensureThree();
      this.threeView.setGraph(parsed.graph);
      this.setupNewman();
      this.updateSymmetry();

      this.dispatchEvent(new CustomEvent("moleculechange", {
        detail: {
          condensed: parsed.condensed,
          smiles: smiles,
          molecularFormula: molecularFormula(parsed.graph),
          functionalGroup: group
        },
        bubbles: true,
        composed: true
      }));
    } catch (err) {
      error.textContent = err && err.message ? err.message : String(err);
      error.style.display = "block";
    }
  }

  renderBuild(validations) {
    const parsed = this.state.parsed;
    const graph = this.state.graph;
    const smiles = this.state.smiles;
    const group = this.state.group;
    const known = KNOWN[parsed.condensed];

    this.$("#molName").textContent = known ? known.name : molecularFormula(graph);
    this.$("#meta").innerHTML = [
      esc(known ? known.note : group),
      esc(molecularFormula(graph)) + " · " + graph.nodes.length + " heavy atoms",
      'SMILES: <span style="font-family:ui-monospace,monospace">' + esc(smiles) + "</span>"
    ].join("<br>");

    const molecule = OCL.Molecule.fromSmiles(smiles);
    if (typeof molecule.inventCoordinates === "function") molecule.inventCoordinates();
    this.$("#mol2d").innerHTML = molecule.toSVG(
      760,
      420,
      "molecule",
      { autoCrop: true, autoCropMargin: 18, factorTextSize: 1.08 }
    );

    const tokens = explicitTokens(parsed.condensed);
    const hybridText = graph.nodes.map(function (node) {
      return atomText(node) + (node.id + 1) + ": " + atomHybridization(graph, node.id);
    }).join(" · ");

    const steps = [
      {
        title: "Parse the condensed notation",
        text: "Treat each atom/H-count unit as a token. Parentheses create a branch or repeated group.",
        extra: '<div class="tokens">' + tokens.map(function (token) {
          return '<span class="token">' + esc(token) + "</span>";
        }).join("") + "</div>"
      },
      {
        title: "Build connectivity before geometry",
        text: "The parser creates " + graph.nodes.length + " heavy-atom nodes and " +
          graph.bonds.length + " heavy-atom bonds. No wedge/dash or 3D shape is assumed yet.",
        extra: ""
      },
      {
        title: "Check valence and electron bookkeeping",
        text: "Declared H counts plus bond orders must satisfy a common neutral valence before the molecule is rendered.",
        extra: '<div class="badges">' + validations.map(function (item) {
          return '<span class="badge good">' + esc(item.el + (item.id + 1)) +
            " · " + item.used + "/" + esc(item.allowed.join("|")) + "</span>";
        }).join("") + "</div>"
      },
      {
        title: "Infer local geometry",
        text: hybridText + ". Hybridization is inferred from local bond order for this introductory model.",
        extra: ""
      },
      {
        title: "Recognize the functional pattern",
        text: group + ". " + functionalSentence(group),
        extra: ""
      },
      {
        title: "Render the same graph in multiple representations",
        text: "SMILES " + smiles + " drives the 2D depiction. 3D, Newman, and symmetry views reuse the same atom/bond graph.",
        extra: ""
      }
    ];

    this.$("#steps").innerHTML = steps.map(function (step, index) {
      return '<section class="step"><div class="step-num">0' + (index + 1) +
        "</div><h4>" + esc(step.title) + "</h4><p>" + esc(step.text) +
        "</p>" + step.extra + "</section>";
    }).join("");

    this.$$(".step").forEach(function (step, index) {
      setTimeout(function () { step.classList.add("show"); }, 85 * index);
    });

    renderLewisSvg(this.$("#lewisSvg"), graph);
  }

  ensureThree() {
    if (this.threeView) return;

    this.threeView = new Molecule3DView();
    const self = this;

    this.resizeObserver = new ResizeObserver(function () {
      if (!self.threeView) return;
      const canvas = self.threeView.renderer.domElement;
      const host = canvas.parentElement;
      if (host) self.threeView.resize(host.clientWidth, host.clientHeight || 520);
    });

    this.resizeObserver.observe(this);
  }

  mountThree(target, symmetryMode) {
    this.ensureThree();
    this.threeView.mount(target);

    if (symmetryMode) {
      this.updateSymmetry();
    } else {
      this.threeView.setNormalMode();
    }

    const self = this;
    requestAnimationFrame(function () {
      self.threeView.resize(target.clientWidth, target.clientHeight || 520);
    });
  }

  setupNewman() {
    const bonds = eligibleNewmanBonds(this.state.graph);
    const selector = this.$("#newmanBond");

    selector.innerHTML = bonds.map(function (bond, index) {
      return '<option value="' + index + '">' + esc(bondLabel(this.state.graph, bond)) + "</option>";
    }, this).join("");

    selector.disabled = bonds.length === 0;
    this.$("#newmanEmpty").hidden = bonds.length !== 0;
    this.$("#newmanSvg").style.display = bonds.length ? "block" : "none";

    this.renderNewman();
  }

  renderNewman() {
    if (!this.state.graph) return;

    const bonds = eligibleNewmanBonds(this.state.graph);
    if (!bonds.length) {
      this.$("#conformation").textContent = "No eligible sp³ C–C single bond.";
      return;
    }

    const index = Math.min(this.state.newmanBondIndex, bonds.length - 1);
    const bond = bonds[index];
    const result = renderNewmanSvg(
      this.$("#newmanSvg"),
      this.state.graph,
      bond,
      this.state.dihedral
    );

    const frontLabel = result.front.map(function (item) { return item.label; }).join(", ");
    const backLabel = result.back.map(function (item) { return item.label; }).join(", ");

    this.$("#conformation").innerHTML =
      "<b>" + esc(result.label) + "</b><br>" +
      '<span style="color:var(--muted)">front: ' + esc(frontLabel) +
      "<br>back: " + esc(backLabel) + "</span>";
  }

  updateSymmetry() {
    if (!this.threeView || !this.state.graph) return;

    this.threeView.setSymmetryMode(
      this.$("#symAxis").value,
      Number(this.$("#symAngle").value),
      this.$("#mirrorPlane").value
    );
  }

  setView(view) {
    const allowed = ["build", "3d", "newman", "symmetry"];
    const normalized = allowed.includes(view) ? view : "build";
    this.state.currentView = normalized;

    this.$$(".tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.dataset.view === normalized);
    });

    this.$$(".panel").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.panel === normalized);
    });

    if (normalized === "3d") {
      this.mountThree(this.$("#stage3d"), false);
    } else if (normalized === "symmetry") {
      this.mountThree(this.$("#stageSym"), true);
    }

    if (this.getAttribute("view") !== normalized) {
      this.setAttribute("view", normalized);
    }

    this.dispatchEvent(new CustomEvent("viewchange", {
      detail: { view: normalized },
      bubbles: true,
      composed: true
    }));
  }

  setFormula(value) {
    this.$(".formula").value = value;
    this.build(value);
  }
}

if (!customElements.get("mini-ochem")) {
  customElements.define("mini-ochem", MiniOChem);
}

export { MiniOChem };
