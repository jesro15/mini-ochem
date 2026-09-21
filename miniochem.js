import {
  ELEMENTS,
  atomHybridization,
  eligibleNewmanBonds,
  bondLabel,
  molecularFormula
} from "./chem-core.js";

import {
  resolveMolecule,
  resolveCandidate,
  OCL
} from "./molecule-resolver.js";

import { Molecule3DView } from "./render-3d.js";
import { renderNewmanSvg } from "./render-newman.js";

const CSS_URL = new URL("./miniochem.css", import.meta.url).href;

const TEMPLATE = [
  '<main class="shell">',
    '<form class="query-form" autocomplete="off">',
      '<input class="query" aria-label="Molecule input" spellcheck="false" ',
        'placeholder="ethanol · CH3CH2OH · CCO · InChI=… · 64-17-5 · CID 702">',
    '</form>',

    '<div class="status" hidden>',
      '<span id="identity"></span>',
      '<span id="source"></span>',
    '</div>',

    '<div class="error" hidden></div>',
    '<div class="candidates" hidden></div>',

    '<section class="workspace" hidden>',
      '<nav class="tabs" aria-label="Molecule representations">',
        '<button type="button" class="tab active" data-view="lewis">Lewis</button>',
        '<button type="button" class="tab" data-view="skeletal">Skeletal</button>',
        '<button type="button" class="tab" data-view="3d">3D / ball + stick</button>',
        '<button type="button" class="tab" data-view="newman">Newman projection</button>',
        '<button type="button" class="tab" data-view="symmetry">Symmetry</button>',
        '<button type="button" class="tab" data-view="hybridization">Hybridization</button>',
        '<button type="button" class="tab" data-view="conformations">Conformations</button>',
      '</nav>',

      '<section class="panel active" data-panel="lewis">',
        '<svg id="lewisSvg" viewBox="0 0 1000 620" aria-label="Lewis structure view"></svg>',
      '</section>',

      '<section class="panel" data-panel="skeletal">',
        '<div class="center-stage" id="skeletal"></div>',
      '</section>',

      '<section class="panel" data-panel="3d">',
        '<div class="stage" id="stage3d">',
          '<div class="stage-help">drag to orbit · scroll to zoom · right-drag to pan</div>',
        '</div>',
        '<div class="footnote">Idealized teaching geometry from local hybridization/VSEPR rules; not an energy-minimized conformer.</div>',
      '</section>',

      '<section class="panel" data-panel="newman">',
        '<div class="split">',
          '<div class="newman-stage">',
            '<svg id="newmanSvg" viewBox="0 0 560 500"></svg>',
            '<div class="empty" id="newmanEmpty" hidden>No eligible sp³ C–C single bond in this structure.</div>',
          '</div>',
          '<aside class="controls">',
            '<label>Viewing bond<select id="newmanBond"></select></label>',
            '<label>Dihedral angle',
              '<div class="range-row">',
                '<input id="dihedral" type="range" min="0" max="360" step="1" value="60">',
                '<output id="dihedralValue">60°</output>',
              '</div>',
            '</label>',
            '<div class="presets">',
              '<button type="button" data-angle="0">0°</button>',
              '<button type="button" data-angle="60">60°</button>',
              '<button type="button" data-angle="180">180°</button>',
              '<button type="button" data-angle="300">300°</button>',
            '</div>',
            '<div class="result-note" id="conformation"></div>',
          '</aside>',
        '</div>',
      '</section>',

      '<section class="panel" data-panel="symmetry">',
        '<div class="split">',
          '<div class="stage" id="stageSym"></div>',
          '<aside class="controls">',
            '<label>Rotation axis',
              '<select id="symAxis">',
                '<option value="x">x axis</option>',
                '<option value="y">y axis</option>',
                '<option value="z" selected>z axis</option>',
              '</select>',
            '</label>',
            '<label>Rotation',
              '<div class="range-row">',
                '<input id="symAngle" type="range" min="0" max="360" step="1" value="180">',
                '<output id="symAngleValue">180°</output>',
              '</div>',
            '</label>',
            '<div class="presets">',
              '<button type="button" data-sym-angle="90">90°</button>',
              '<button type="button" data-sym-angle="120">120°</button>',
              '<button type="button" data-sym-angle="180">180°</button>',
              '<button type="button" data-sym-angle="360">360°</button>',
            '</div>',
            '<label>Mirror plane',
              '<select id="mirrorPlane">',
                '<option value="none">none</option>',
                '<option value="xy">xy plane</option>',
                '<option value="xz">xz plane</option>',
                '<option value="yz">yz plane</option>',
              '</select>',
            '</label>',
            '<div class="result-note">Compare the solid molecule with the pale reference after the operation. Exact point-group assignment is intentionally not inferred yet.</div>',
          '</aside>',
        '</div>',
      '</section>',

      '<section class="panel" data-panel="hybridization">',
        '<div class="cards" id="hybridCards"></div>',
      '</section>',

      '<section class="panel" data-panel="conformations">',
        '<div class="conformation-list" id="rotatableList"></div>',
      '</section>',
    '</section>',
  '</main>'
].join("");

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function atomText(node) {
  const h = node.hCount
    ? "H" + (node.hCount > 1 ? node.hCount : "")
    : "";
  const charge =
    node.charge > 0 ? "+" + (node.charge > 1 ? node.charge : "") :
    node.charge < 0 ? "−" + (node.charge < -1 ? Math.abs(node.charge) : "") :
    "";
  return node.el + h + charge;
}

function treeLayout(graph, width, height) {
  const start =
    graph.nodes.find(function (node) {
      return graph.neighbors(node.id).length <= 1;
    }) || graph.nodes[0];

  const level = new Map([[start.id, 0]]);
  const queue = [start.id];

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
      positions[id] = {
        x: 90 + (width - 180) * (value / maxLevel),
        y:
          ids.length === 1
            ? height / 2
            : 95 + (height - 190) * (index / (ids.length - 1))
      };
    });
  });

  return positions;
}

function renderLewisSvg(svg, graph) {
  const width = 1000;
  const height = 620;
  const positions = treeLayout(graph, width, height);
  const parts = [];

  graph.bonds.forEach(function (bond) {
    const a = positions[bond.a];
    const b = positions[bond.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const ox = (-dy / length) * 6;
    const oy = (dx / length) * 6;
    const order = Math.max(1, Math.min(3, Math.round(bond.order)));

    for (let i = 0; i < order; i += 1) {
      const shift = i - (order - 1) / 2;
      parts.push(
        '<line x1="' + (a.x + ox * shift) +
        '" y1="' + (a.y + oy * shift) +
        '" x2="' + (b.x + ox * shift) +
        '" y2="' + (b.y + oy * shift) +
        '" stroke="#24231f" stroke-width="2.5" stroke-linecap="round"/>'
      );
    }
  });

  graph.nodes.forEach(function (node) {
    const p = positions[node.id];
    const lonePairs = ELEMENTS[node.el] ? ELEMENTS[node.el].lonePairs : 0;
    const pairCount = Math.min(lonePairs, 3);

    parts.push(
      '<rect x="' + (p.x - 31) + '" y="' + (p.y - 23) +
      '" width="62" height="46" rx="12" fill="#fffdf8"/>'
    );

    parts.push(
      '<text x="' + p.x + '" y="' + (p.y + 6) +
      '" text-anchor="middle" font-size="20" font-family="ui-monospace,monospace" fill="#171714">' +
      esc(atomText(node)) + '</text>'
    );

    parts.push(
      '<text x="' + p.x + '" y="' + (p.y + 48) +
      '" text-anchor="middle" font-size="11" font-family="ui-sans-serif,sans-serif" fill="#858077">' +
      esc(atomHybridization(graph, node.id)) + '</text>'
    );

    for (let pair = 0; pair < pairCount; pair += 1) {
      const angle =
        -Math.PI / 2 +
        (pair - (pairCount - 1) / 2) * 0.64;
      const cx = p.x + Math.cos(angle) * 44;
      const cy = p.y + Math.sin(angle) * 44;

      parts.push(
        '<circle cx="' + (cx - 2.7) + '" cy="' + cy + '" r="2" fill="#c74e38"/>'
      );
      parts.push(
        '<circle cx="' + (cx + 2.7) + '" cy="' + cy + '" r="2" fill="#c74e38"/>'
      );
    }
  });

  svg.innerHTML = parts.join("");
}

function localGeometry(hybrid) {
  if (hybrid === "sp") return "linear · ~180°";
  if (hybrid === "sp2") return "trigonal planar · ~120°";
  if (hybrid === "sp3") return "tetrahedral electron geometry · ~109.5°";
  return "not classified";
}

class MiniOChem extends HTMLElement {
  static get observedAttributes() {
    return ["molecule", "formula", "view"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML =
      '<link rel="stylesheet" href="' + CSS_URL + '">' + TEMPLATE;

    this.state = {
      resolved: null,
      graph: null,
      molecule: null,
      currentView: "lewis",
      newmanBondIndex: 0,
      dihedral: 60
    };

    this.threeView = null;
    this.resizeObserver = null;
  }

  connectedCallback() {
    this.bindUI();

    const initial =
      this.getAttribute("molecule") ||
      this.getAttribute("formula") ||
      "";

    if (initial) {
      this.$(".query").value = initial;
      this.resolve(initial);
    }

    const view = this.getAttribute("view");
    if (view) this.setView(view);
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.threeView) this.threeView.dispose();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if ((name === "molecule" || name === "formula") && newValue) {
      this.$(".query").value = newValue;
      this.resolve(newValue);
    }

    if (name === "view" && newValue) this.setView(newValue);
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.shadowRoot.querySelectorAll(selector));
  }

  bindUI() {
    const self = this;

    this.$(".query-form").addEventListener("submit", function (event) {
      event.preventDefault();
      self.resolve(self.$(".query").value);
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

    this.$$(".presets [data-angle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const angle = Number(button.dataset.angle);
        self.state.dihedral = angle;
        self.$("#dihedral").value = angle;
        self.$("#dihedralValue").textContent = angle + "°";
        self.renderNewman();
      });
    });

    this.$("#symAxis").addEventListener("change", function () {
      self.updateSymmetry();
    });

    this.$("#symAngle").addEventListener("input", function () {
      self.$("#symAngleValue").textContent =
        self.$("#symAngle").value + "°";
      self.updateSymmetry();
    });

    this.$("#mirrorPlane").addEventListener("change", function () {
      self.updateSymmetry();
    });

    this.$$("[data-sym-angle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const angle = button.dataset.symAngle;
        self.$("#symAngle").value = angle;
        self.$("#symAngleValue").textContent = angle + "°";
        self.updateSymmetry();
      });
    });

    this.$(".candidates").addEventListener("click", function (event) {
      const button = event.target.closest("[data-candidate]");
      if (!button) return;

      const index = Number(button.dataset.candidate);
      const candidate = self.pendingCandidates[index];
      if (candidate) self.chooseCandidate(candidate);
    });

    this.$("#rotatableList").addEventListener("click", function (event) {
      const button = event.target.closest("[data-newman-index]");
      if (!button) return;

      const index = Number(button.dataset.newmanIndex);
      self.state.newmanBondIndex = index;
      self.$("#newmanBond").value = String(index);
      self.setView("newman");
      self.renderNewman();
    });
  }

  async resolve(value) {
    const error = this.$(".error");
    const candidates = this.$(".candidates");

    error.hidden = true;
    candidates.hidden = true;
    candidates.innerHTML = "";
    this.pendingCandidates = null;

    this.$(".query").classList.add("loading");

    try {
      const result = await resolveMolecule(value);

      if (result.ambiguous) {
        this.pendingCandidates = result.candidates;
        this.renderCandidates(result);
        return;
      }

      this.applyResolved(result);
    } catch (err) {
      error.textContent = err && err.message ? err.message : String(err);
      error.hidden = false;
    } finally {
      this.$(".query").classList.remove("loading");
    }
  }

  async chooseCandidate(candidate) {
    this.$(".query").classList.add("loading");
    this.$(".candidates").hidden = true;

    try {
      const result = await resolveCandidate(
        candidate,
        this.$(".query").value
      );
      this.applyResolved(result);
    } catch (err) {
      this.$(".error").textContent =
        err && err.message ? err.message : String(err);
      this.$(".error").hidden = false;
    } finally {
      this.$(".query").classList.remove("loading");
    }
  }

  renderCandidates(result) {
    const box = this.$(".candidates");
    const rows = result.candidates || [];

    box.innerHTML =
      '<div class="candidate-head">That molecular formula is not unique. Choose a structure:</div>' +
      rows.map(function (item, index) {
        return (
          '<button type="button" class="candidate" data-candidate="' + index + '">' +
            '<span>' + esc(item.title || item.iupacName || ("CID " + item.cid)) + '</span>' +
            '<small>' + esc(item.molecularFormula || "") + ' · CID ' + esc(item.cid) + '</small>' +
          '</button>'
        );
      }).join("");

    box.hidden = false;
  }

  applyResolved(result) {
    this.state.resolved = result;
    this.state.graph = result.graph;
    this.state.molecule = result.molecule;
    this.state.newmanBondIndex = 0;

    this.$(".workspace").hidden = false;
    this.$(".status").hidden = false;
    this.$(".error").hidden = true;
    this.$(".candidates").hidden = true;

    this.renderIdentity();
    this.renderLewis();
    this.renderSkeletal();
    this.ensureThree();
    this.threeView.setGraph(result.graph);
    this.setupNewman();
    this.renderHybridization();
    this.renderConformations();

    if (this.state.currentView === "3d") {
      this.mountThree(this.$("#stage3d"), false);
    }

    if (this.state.currentView === "symmetry") {
      this.mountThree(this.$("#stageSym"), true);
    }

    if (this.getAttribute("molecule") !== result.query) {
      this.setAttribute("molecule", result.query);
    }

    this.dispatchEvent(new CustomEvent("moleculechange", {
      detail: {
        query: result.query,
        inputType: result.inputType,
        smiles: result.smiles,
        molecularFormula: result.metadata.molecularFormula,
        title: result.metadata.title,
        cid: result.metadata.cid
      },
      bubbles: true,
      composed: true
    }));
  }

  renderIdentity() {
    const result = this.state.resolved;
    const meta = result.metadata;

    const identity = [
      meta.title && meta.title !== result.query ? meta.title : "",
      meta.molecularFormula || molecularFormula(result.graph),
      meta.cid ? "CID " + meta.cid : ""
    ].filter(Boolean).join(" · ");

    this.$("#identity").textContent = identity || result.query;
    this.$("#source").textContent = result.inputType;
  }

  renderLewis() {
    renderLewisSvg(this.$("#lewisSvg"), this.state.graph);
  }

  renderSkeletal() {
    const molecule = this.state.molecule;
    if (typeof molecule.inventCoordinates === "function") {
      molecule.inventCoordinates();
    }

    this.$("#skeletal").innerHTML = molecule.toSVG(
      920,
      620,
      "molecule",
      {
        autoCrop: true,
        autoCropMargin: 28,
        factorTextSize: 1.08
      }
    );
  }

  ensureThree() {
    if (this.threeView) return;

    this.threeView = new Molecule3DView();
    const self = this;

    this.resizeObserver = new ResizeObserver(function () {
      if (!self.threeView) return;
      const canvas = self.threeView.renderer.domElement;
      const host = canvas.parentElement;
      if (host) {
        self.threeView.resize(
          host.clientWidth,
          host.clientHeight || 620
        );
      }
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
      self.threeView.resize(
        target.clientWidth,
        target.clientHeight || 620
      );
    });
  }

  setupNewman() {
    const bonds = eligibleNewmanBonds(this.state.graph);
    const select = this.$("#newmanBond");

    select.innerHTML = bonds.map(function (bond, index) {
      return (
        '<option value="' + index + '">' +
        esc(bondLabel(this.state.graph, bond)) +
        '</option>'
      );
    }, this).join("");

    select.disabled = bonds.length === 0;
    this.$("#newmanEmpty").hidden = bonds.length !== 0;
    this.$("#newmanSvg").hidden = bonds.length === 0;

    this.renderNewman();
  }

  renderNewman() {
    const bonds = eligibleNewmanBonds(this.state.graph || { bonds: [] });

    if (!bonds.length) {
      this.$("#conformation").textContent =
        "Newman projections require an eligible sp³ C–C single bond.";
      return;
    }

    const index = Math.min(
      this.state.newmanBondIndex,
      bonds.length - 1
    );

    const result = renderNewmanSvg(
      this.$("#newmanSvg"),
      this.state.graph,
      bonds[index],
      this.state.dihedral
    );

    this.$("#conformation").innerHTML =
      '<strong>' + esc(result.label) + '</strong><br>' +
      '<span>front: ' +
      esc(result.front.map(function (item) { return item.label; }).join(", ")) +
      '<br>back: ' +
      esc(result.back.map(function (item) { return item.label; }).join(", ")) +
      '</span>';
  }

  updateSymmetry() {
    if (!this.threeView || !this.state.graph) return;

    this.threeView.setSymmetryMode(
      this.$("#symAxis").value,
      Number(this.$("#symAngle").value),
      this.$("#mirrorPlane").value
    );
  }

  renderHybridization() {
    const graph = this.state.graph;

    this.$("#hybridCards").innerHTML = graph.nodes.map(function (node) {
      const hybrid = atomHybridization(graph, node.id);
      const neighbors = graph.neighbors(node.id)
        .map(function (item) {
          return graph.nodes[item.id].el + (item.id + 1);
        })
        .join(", ");

      return (
        '<article class="atom-card">' +
          '<div class="atom-index">' + esc(node.el + (node.id + 1)) + '</div>' +
          '<div class="hybrid">' + esc(hybrid) + '</div>' +
          '<div class="geometry">' + esc(localGeometry(hybrid)) + '</div>' +
          '<div class="atom-detail">' +
            (node.aromatic ? "aromatic · " : "") +
            (node.hCount ? node.hCount + " H · " : "") +
            (node.charge ? "formal charge " + node.charge + " · " : "") +
            "neighbors: " + esc(neighbors || "none") +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  renderConformations() {
    const bonds = eligibleNewmanBonds(this.state.graph);
    const box = this.$("#rotatableList");

    if (!bonds.length) {
      box.innerHTML =
        '<div class="empty">No simple sp³ C–C bond is available for Newman-style torsional analysis.</div>';
      return;
    }

    box.innerHTML =
      '<div class="list-intro">Bonds currently available for direct torsional / Newman analysis:</div>' +
      bonds.map(function (bond, index) {
        return (
          '<button type="button" class="rotatable" data-newman-index="' + index + '">' +
            '<span>' + esc(bondLabel(this.state.graph, bond)) + '</span>' +
            '<small>rotate about σ bond →</small>' +
          '</button>'
        );
      }, this).join("");
  }

  setView(view) {
    const allowed = [
      "lewis",
      "skeletal",
      "3d",
      "newman",
      "symmetry",
      "hybridization",
      "conformations"
    ];

    const normalized = allowed.includes(view) ? view : "lewis";
    this.state.currentView = normalized;

    this.$$(".tab").forEach(function (tab) {
      tab.classList.toggle(
        "active",
        tab.dataset.view === normalized
      );
    });

    this.$$(".panel").forEach(function (panel) {
      panel.classList.toggle(
        "active",
        panel.dataset.panel === normalized
      );
    });

    if (this.state.graph && normalized === "3d") {
      this.mountThree(this.$("#stage3d"), false);
    }

    if (this.state.graph && normalized === "symmetry") {
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

  setMolecule(value) {
    this.$(".query").value = value;
    this.resolve(value);
  }

  setFormula(value) {
    this.setMolecule(value);
  }
}

if (!customElements.get("mini-ochem")) {
  customElements.define("mini-ochem", MiniOChem);
}

export { MiniOChem };
