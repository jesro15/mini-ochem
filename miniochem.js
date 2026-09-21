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
  getSameFormulaCandidates,
  getSimilarCompounds,
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
      '<span id="geometrySource"></span>',
    '</div>',

    '<div class="error" hidden></div>',
    '<div class="candidates" hidden></div>',

    '<section class="workspace" hidden>',
      '<div class="toolbar">',
        '<div class="segmented" aria-label="Primary representation">',
          '<button type="button" class="view-button active" data-view="skeletal">Skeletal</button>',
          '<button type="button" class="view-button" data-view="3d">3D ball + stick</button>',
        '</div>',

        '<div class="overlays" aria-label="Overlays">',
          '<label><input type="checkbox" data-overlay="hybridization">Hybridization</label>',
          '<label><input type="checkbox" data-overlay="lengths">Bond lengths</label>',
          '<label><input type="checkbox" data-overlay="angles">Bond angles</label>',
        '</div>',
      '</div>',

      '<div class="primary-stage">',
        '<div class="primary-panel active" data-primary="skeletal">',
          '<svg id="skeletalSvg" viewBox="0 0 1000 620" aria-label="Skeletal structure"></svg>',
        '</div>',
        '<div class="primary-panel" data-primary="3d">',
          '<div class="stage" id="stage3d">',
            '<div class="stage-help">drag to orbit · pinch/scroll to zoom · tap atoms or bonds</div>',
          '</div>',
        '</div>',
        '<div class="hover-card" hidden></div>',
      '</div>',

      '<div class="provenance"></div>',

      '<section class="related">',
        '<div class="related-nav">',
          '<span>Related</span>',
          '<button type="button" data-related="formula">Same formula</button>',
          '<button type="button" data-related="similar">Similar structure</button>',
        '</div>',
        '<div class="related-results" hidden></div>',
      '</section>',

      '<div class="secondary-nav">',
        '<span>Other views</span>',
        '<button type="button" data-secondary="lewis">Lewis</button>',
        '<button type="button" data-secondary="newman">Newman</button>',
        '<button type="button" data-secondary="symmetry">Symmetry</button>',
      '</div>',

      '<section class="secondary-panel" data-secondary-panel="lewis" hidden>',
        '<svg id="lewisSvg" viewBox="0 0 1000 620"></svg>',
      '</section>',

      '<section class="secondary-panel" data-secondary-panel="newman" hidden>',
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

      '<section class="secondary-panel" data-secondary-panel="symmetry" hidden>',
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
            '<div class="result-note">This is an operation explorer, not an automatic point-group assignment.</div>',
          '</aside>',
        '</div>',
      '</section>',
    '</section>',
  '</main>'
].join("");

function esc(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


function candidateSvg(smiles, id) {
  try {
    const molecule = OCL.Molecule.fromSmiles(smiles);
    if (typeof molecule.inventCoordinates === "function") {
      molecule.inventCoordinates();
    }

    return molecule.toSVG(
      260,
      170,
      id || "candidate",
      {
        autoCrop: true,
        autoCropMargin: 14,
        factorTextSize: 0.9
      }
    );
  } catch {
    return '<div class="candidate-fallback">structure unavailable</div>';
  }
}

function candidateCard(item, index, mode) {
  const title = item.title || item.iupacName || ("CID " + item.cid);
  const label =
    mode === "similar"
      ? (item.molecularFormula || "") + " · similar structure"
      : (item.molecularFormula || "") + " · same formula";

  return (
    '<button type="button" class="compound-card" data-compound-index="' + index + '">' +
      '<div class="compound-thumb">' +
        candidateSvg(item.smiles, "compound-" + mode + "-" + index) +
      '</div>' +
      '<div class="compound-name">' + esc(title) + '</div>' +
      '<div class="compound-meta">' + esc(label) + ' · CID ' + esc(item.cid) + '</div>' +
    '</button>'
  );
}

function atomText(node) {
  const h = node.hCount ? "H" + (node.hCount > 1 ? node.hCount : "") : "";
  const charge =
    node.charge > 0 ? "+" + (node.charge > 1 ? node.charge : "") :
    node.charge < 0 ? "−" + (node.charge < -1 ? Math.abs(node.charge) : "") :
    "";
  return node.el + h + charge;
}

function point3(value) {
  return value && value.length >= 3
    ? { x: value[0], y: value[1], z: value[2] }
    : null;
}

function distance(a, b) {
  if (!a || !b) return null;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function angleDegrees(a, center, b) {
  if (!a || !center || !b) return null;

  const ax = a.x - center.x;
  const ay = a.y - center.y;
  const az = a.z - center.z;
  const bx = b.x - center.x;
  const by = b.y - center.y;
  const bz = b.z - center.z;

  const amag = Math.sqrt(ax * ax + ay * ay + az * az);
  const bmag = Math.sqrt(bx * bx + by * by + bz * bz);
  if (!amag || !bmag) return null;

  const cosine = Math.max(
    -1,
    Math.min(1, (ax * bx + ay * by + az * bz) / (amag * bmag))
  );

  return Math.acos(cosine) * 180 / Math.PI;
}

function referenceBondLength(graph, bond) {
  const a = graph.nodes[bond.a].el;
  const b = graph.nodes[bond.b].el;
  const key = [a, b].sort().join("-");
  const order = bond.order;

  if (key === "C-C") return order === 3 ? 1.20 : order === 2 ? 1.34 : 1.54;
  if (key === "C-N") return order === 3 ? 1.16 : order === 2 ? 1.30 : 1.47;
  if (key === "C-O") return order === 2 ? 1.23 : 1.43;
  if (key === "N-O") return order === 2 ? 1.21 : 1.40;
  if (key === "C-S") return order === 2 ? 1.61 : 1.82;
  return 1.48;
}

function idealAngle(hybrid) {
  if (hybrid === "sp") return 180;
  if (hybrid === "sp2") return 120;
  if (hybrid === "sp3") return 109.5;
  return null;
}

function geometryPoint(result, atomId) {
  if (!result || !result.geometry || !result.geometry.atomPositions) return null;
  return point3(result.geometry.atomPositions[atomId]);
}

function bondMetric(result, bond) {
  const a = geometryPoint(result, bond.a);
  const b = geometryPoint(result, bond.b);
  const measured = distance(a, b);

  if (Number.isFinite(measured)) {
    return {
      value: measured,
      source: result.geometry.source,
      kind: result.geometry.kind
    };
  }

  return {
    value: referenceBondLength(result.graph, bond),
    source: "reference fallback",
    kind: "reference"
  };
}

function angleMetrics(result, atomId) {
  const graph = result.graph;
  const center = geometryPoint(result, atomId);
  const neighbors = graph.neighbors(atomId);

  if (center && result.geometry) {
    const points = neighbors.map(function (neighbor) {
      return {
        label: graph.nodes[neighbor.id].el + String(neighbor.id + 1),
        point: geometryPoint(result, neighbor.id)
      };
    }).filter(function (item) {
      return item.point;
    });

    const hydrogens =
      result.geometry.hydrogenPositions &&
      result.geometry.hydrogenPositions[atomId]
        ? result.geometry.hydrogenPositions[atomId]
        : [];

    hydrogens.forEach(function (coords, index) {
      points.push({
        label: hydrogens.length > 1 ? "H" + String(index + 1) : "H",
        point: point3(coords)
      });
    });

    const rows = [];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const value = angleDegrees(points[i].point, center, points[j].point);
        if (!Number.isFinite(value)) continue;

        rows.push({
          label:
            points[i].label +
            "–" +
            graph.nodes[atomId].el +
            String(atomId + 1) +
            "–" +
            points[j].label,
          value: value
        });
      }
    }

    return {
      rows: rows,
      source: result.geometry.source,
      kind: result.geometry.kind
    };
  }

  const hybrid = atomHybridization(graph, atomId);
  const fallback = idealAngle(hybrid);

  return {
    rows: fallback == null
      ? []
      : [{ label: "ideal " + hybrid + " angle", value: fallback }],
    source: "idealized hybridization geometry",
    kind: "reference"
  };
}

function geometryLabel(result) {
  if (result && result.geometry) {
    return result.geometry.source + " · computed coordinates";
  }
  return "idealized geometry fallback";
}

function build2DPositions(molecule, graph) {
  if (typeof molecule.inventCoordinates === "function") {
    molecule.inventCoordinates();
  }

  const heavyIndices = [];
  for (let atom = 0; atom < molecule.getAllAtoms(); atom += 1) {
    if (molecule.getAtomicNo(atom) !== 1) heavyIndices.push(atom);
  }

  const raw = graph.nodes.map(function (node, index) {
    const atom = Number.isInteger(node.sourceAtomIndex)
      ? node.sourceAtomIndex
      : heavyIndices[index];

    return {
      x: molecule.getAtomX(atom),
      y: molecule.getAtomY(atom)
    };
  });

  const xs = raw.map(function (p) { return p.x; });
  const ys = raw.map(function (p) { return p.y; });
  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxY = Math.max.apply(null, ys);

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min(760 / spanX, 430 / spanY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return raw.map(function (p) {
    return {
      x: 500 + (p.x - centerX) * scale,
      y: 310 - (p.y - centerY) * scale
    };
  });
}

function renderSkeletalSvg(svg, molecule, result) {
  const graph = result.graph;
  const positions = build2DPositions(molecule, graph);
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
        '<line class="bond-line" x1="' + (a.x + ox * shift) +
        '" y1="' + (a.y + oy * shift) +
        '" x2="' + (b.x + ox * shift) +
        '" y2="' + (b.y + oy * shift) +
        '"/>'
      );
    }
  });

  graph.nodes.forEach(function (node) {
    const p = positions[node.id];
    const degree = graph.neighbors(node.id).length;
    const shouldLabel =
      node.el !== "C" ||
      node.charge !== 0 ||
      degree === 0;

    if (shouldLabel) {
      parts.push(
        '<rect class="atom-label-bg" x="' + (p.x - 28) + '" y="' + (p.y - 20) +
        '" width="56" height="40" rx="8"/>'
      );
      parts.push(
        '<text class="atom-label" x="' + p.x + '" y="' + (p.y + 6) +
        '" text-anchor="middle">' + esc(atomText(node)) + '</text>'
      );
    }
  });

  graph.bonds.forEach(function (bond) {
    const a = positions[bond.a];
    const b = positions[bond.b];

    parts.push(
      '<line class="bond-hit" data-bond-id="' + bond.id +
      '" x1="' + a.x + '" y1="' + a.y +
      '" x2="' + b.x + '" y2="' + b.y + '"/>'
    );
  });

  graph.nodes.forEach(function (node) {
    const p = positions[node.id];
    parts.push(
      '<circle class="atom-hit" data-atom-id="' + node.id +
      '" cx="' + p.x + '" cy="' + p.y + '" r="38"/>'
    );
  });

  svg.innerHTML = parts.join("");
  return positions;
}

function renderLewisSvg(svg, graph) {
  const width = 1000;
  const height = 620;
  const positions = [];
  const start =
    graph.nodes.find(function (node) {
      return graph.neighbors(node.id).length <= 1;
    }) || graph.nodes[0];

  const levels = new Map([[start.id, 0]]);
  const queue = [start.id];

  while (queue.length) {
    const id = queue.shift();
    graph.neighbors(id).forEach(function (neighbor) {
      if (!levels.has(neighbor.id)) {
        levels.set(neighbor.id, levels.get(id) + 1);
        queue.push(neighbor.id);
      }
    });
  }

  const maxLevel = Math.max.apply(null, Array.from(levels.values()).concat([1]));
  const grouped = new Map();

  levels.forEach(function (level, id) {
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(id);
  });

  grouped.forEach(function (ids, level) {
    ids.forEach(function (id, index) {
      positions[id] = {
        x: 90 + (width - 180) * (level / maxLevel),
        y:
          ids.length === 1
            ? height / 2
            : 95 + (height - 190) * (index / (ids.length - 1))
      };
    });
  });

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

    parts.push(
      '<rect x="' + (p.x - 31) + '" y="' + (p.y - 23) +
      '" width="62" height="46" rx="12" fill="#fffdf8"/>'
    );
    parts.push(
      '<text x="' + p.x + '" y="' + (p.y + 6) +
      '" text-anchor="middle" font-size="20" font-family="ui-monospace,monospace" fill="#171714">' +
      esc(atomText(node)) + '</text>'
    );

    for (let pair = 0; pair < Math.min(lonePairs, 3); pair += 1) {
      const angle =
        -Math.PI / 2 +
        (pair - (Math.min(lonePairs, 3) - 1) / 2) * 0.64;
      const cx = p.x + Math.cos(angle) * 44;
      const cy = p.y + Math.sin(angle) * 44;

      parts.push('<circle cx="' + (cx - 2.7) + '" cy="' + cy + '" r="2" fill="#c74e38"/>');
      parts.push('<circle cx="' + (cx + 2.7) + '" cy="' + cy + '" r="2" fill="#c74e38"/>');
    }
  });

  svg.innerHTML = parts.join("");
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
      view: "skeletal",
      overlays: {
        hybridization: false,
        lengths: false,
        angles: false
      },
      secondary: null,
      selection: null,
      relatedMode: null,
      relatedItems: [],
      relatedCache: {},
      newmanBondIndex: 0,
      dihedral: 60
    };

    this.threeView = null;
    this.symmetryView = null;
    this.resizeObserver = null;
    this.pendingCandidates = null;
    this.coarsePointer = window.matchMedia(
      "(hover: none), (pointer: coarse)"
    ).matches;
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
    if (view === "3d" || view === "skeletal") {
      this.setView(view);
    }
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.threeView) this.threeView.dispose();
    if (this.symmetryView) this.symmetryView.dispose();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    if ((name === "molecule" || name === "formula") && newValue) {
      this.$(".query").value = newValue;
      this.resolve(newValue);
    }

    if (name === "view" && (newValue === "3d" || newValue === "skeletal")) {
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

    this.$(".query-form").addEventListener("submit", function (event) {
      event.preventDefault();
      self.resolve(self.$(".query").value);
    });

    this.$$(".view-button").forEach(function (button) {
      button.addEventListener("click", function () {
        self.setView(button.dataset.view);
      });
    });

    this.$("[data-overlay]").forEach(function (input) {
      input.addEventListener("change", function () {
        self.state.overlays[input.dataset.overlay] = input.checked;
        if (self.state.selection) {
          self.renderSelectionCard();
        } else {
          self.hideHover(true);
        }
      });
    });

    this.$("#skeletalSvg").addEventListener("pointermove", function (event) {
      if (self.coarsePointer || self.state.selection) return;

      const target = event.target.closest("[data-atom-id],[data-bond-id]");
      if (!target) {
        self.hideHover();
        return;
      }

      const rect = self.$(".primary-stage").getBoundingClientRect();
      const point = {
        localX: event.clientX - rect.left,
        localY: event.clientY - rect.top
      };

      if (target.hasAttribute("data-atom-id")) {
        self.showAtomHover(Number(target.dataset.atomId), point);
      } else {
        self.showBondHover(Number(target.dataset.bondId), point);
      }
    });

    this.$("#skeletalSvg").addEventListener("pointerleave", function () {
      self.hideHover();
    });

    this.$("#skeletalSvg").addEventListener("click", function (event) {
      const target = event.target.closest("[data-atom-id],[data-bond-id]");
      if (!target) {
        self.clearSelection();
        return;
      }

      if (target.hasAttribute("data-atom-id")) {
        self.selectTarget("atom", Number(target.dataset.atomId));
      } else {
        self.selectTarget("bond", Number(target.dataset.bondId));
      }
    });

    this.$(".hover-card").addEventListener("click", function (event) {
      if (event.target.closest("[data-close-inspector]")) {
        self.clearSelection();
      }
    });

    this.$$(".secondary-nav button").forEach(function (button) {
      button.addEventListener("click", function () {
        self.toggleSecondary(button.dataset.secondary);
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

    this.$$("[data-angle]").forEach(function (button) {
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
      self.$("#symAngleValue").textContent = self.$("#symAngle").value + "°";
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

      const candidate = self.pendingCandidates[Number(button.dataset.candidate)];
      if (candidate) self.chooseCandidate(candidate);
    });

    this.$(".related-nav button").forEach(function (button) {
      button.addEventListener("click", function () {
        self.loadRelated(button.dataset.related);
      });
    });

    this.$(".related-results").addEventListener("click", function (event) {
      const button = event.target.closest("[data-compound-index]");
      if (!button) return;

      const candidate =
        self.state.relatedItems[Number(button.dataset.compoundIndex)];

      if (candidate) self.chooseRelated(candidate);
    });
  }

  async resolve(value) {
    this.$(".error").hidden = true;
    this.$(".candidates").hidden = true;
    this.$(".query").classList.add("loading");

    try {
      const result = await resolveMolecule(value);

      if (result.ambiguous) {
        this.pendingCandidates = result.candidates;
        this.renderCandidates(result);
        return;
      }

      this.applyResolved(result);
    } catch (error) {
      this.$(".error").textContent =
        error && error.message ? error.message : String(error);
      this.$(".error").hidden = false;
    } finally {
      this.$(".query").classList.remove("loading");
    }
  }

  async chooseCandidate(candidate) {
    this.$(".query").classList.add("loading");

    try {
      const result = await resolveCandidate(
        candidate,
        this.$(".query").value
      );
      this.applyResolved(result);
    } catch (error) {
      this.$(".error").textContent =
        error && error.message ? error.message : String(error);
      this.$(".error").hidden = false;
    } finally {
      this.$(".query").classList.remove("loading");
    }
  }

  renderCandidates(result) {
    const rows = result.candidates || [];
    const box = this.$(".candidates");

    box.innerHTML =
      '<div class="candidate-head">' +
        '<strong>' + esc(result.query) + '</strong> is a molecular formula, so it can describe more than one structure. Choose one:' +
      '</div>' +
      '<div class="candidate-grid">' +
        rows.map(function (item, index) {
          return (
            '<button type="button" class="compound-card" data-candidate="' + index + '">' +
              '<div class="compound-thumb">' +
                candidateSvg(item.smiles, "candidate-" + index) +
              '</div>' +
              '<div class="compound-name">' +
                esc(item.title || item.iupacName || ("CID " + item.cid)) +
              '</div>' +
              '<div class="compound-meta">' +
                esc(item.molecularFormula || "") + ' · CID ' + esc(item.cid) +
              '</div>' +
            '</button>'
          );
        }).join("") +
      '</div>';

    box.hidden = false;
  }

  applyResolved(result) {
    this.state.resolved = result;
    this.state.newmanBondIndex = 0;
    this.state.selection = null;
    this.state.relatedMode = null;
    this.state.relatedItems = [];

    this.$(".workspace").hidden = false;
    this.$(".status").hidden = false;
    this.$(".error").hidden = true;
    this.$(".candidates").hidden = true;

    this.renderIdentity();
    this.resetRelated();
    this.renderPrimary();
    renderLewisSvg(this.$("#lewisSvg"), result.graph);
    this.setupNewman();

    this.ensureThreeViews();
    this.threeView.setGraph(result.graph, result.geometry);
    this.symmetryView.setGraph(result.graph, result.geometry);

    this.setView(this.state.view);

    if (this.state.secondary === "symmetry") {
      this.mountSymmetry();
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

    this.$("#identity").textContent = [
      meta.title && meta.title !== result.query ? meta.title : "",
      meta.molecularFormula || molecularFormula(result.graph),
      meta.cid ? "CID " + meta.cid : ""
    ].filter(Boolean).join(" · ") || result.query;

    this.$("#source").textContent = result.inputType;
    this.$("#geometrySource").textContent = geometryLabel(result);

    this.$(".provenance").textContent = result.geometry
      ? "Geometry values are calculated from " + result.geometry.source +
        ". This is molecule-specific computed geometry, not an experimental literature measurement."
      : "No molecule-specific 3D conformer was available; geometry falls back to idealized hybridization angles and reference bond lengths.";
  }

  renderPrimary() {
    if (!this.state.resolved) return;
    renderSkeletalSvg(
      this.$("#skeletalSvg"),
      this.state.resolved.molecule,
      this.state.resolved
    );
  }

  ensureThreeViews() {
    if (!this.threeView) {
      this.threeView = new Molecule3DView();
      const self = this;

      this.threeView.setHoverHandler(function (hit, point) {
        if (self.state.selection || self.coarsePointer) return;

        if (!hit || !point) {
          self.hideHover();
          return;
        }

        const stageRect = self.$(".primary-stage").getBoundingClientRect();
        const canvasRect =
          self.threeView.renderer.domElement.getBoundingClientRect();

        const localPoint = {
          localX: canvasRect.left - stageRect.left + point.localX,
          localY: canvasRect.top - stageRect.top + point.localY
        };

        if (hit.kind === "atom" && !hit.isHydrogen) {
          self.showAtomHover(hit.sourceId, localPoint);
        } else if (hit.kind === "bond" && Number.isInteger(hit.sourceBondId)) {
          self.showBondHover(hit.sourceBondId, localPoint);
        } else {
          self.hideHover();
        }
      });

      this.threeView.setSelectHandler(function (hit) {
        if (!hit) {
          self.clearSelection();
          return;
        }

        if (hit.kind === "atom" && !hit.isHydrogen) {
          self.selectTarget("atom", hit.sourceId);
        } else if (hit.kind === "bond" && Number.isInteger(hit.sourceBondId)) {
          self.selectTarget("bond", hit.sourceBondId);
        }
      });
    }

    if (!this.symmetryView) {
      this.symmetryView = new Molecule3DView();
    }

    if (!this.resizeObserver) {
      const self = this;
      this.resizeObserver = new ResizeObserver(function () {
        self.resizeThreeViews();
      });
      this.resizeObserver.observe(this);
    }
  }

  resizeThreeViews() {
    if (this.threeView && this.state.view === "3d") {
      const stage = this.$("#stage3d");
      this.threeView.resize(stage.clientWidth, stage.clientHeight || 620);
    }

    if (this.symmetryView && this.state.secondary === "symmetry") {
      const stage = this.$("#stageSym");
      this.symmetryView.resize(stage.clientWidth, stage.clientHeight || 620);
    }
  }

  setView(view) {
    const normalized = view === "3d" ? "3d" : "skeletal";
    this.state.view = normalized;
    this.hideHover();

    this.$$(".view-button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === normalized);
    });

    this.$$(".primary-panel").forEach(function (panel) {
      panel.classList.toggle("active", panel.dataset.primary === normalized);
    });

    if (normalized === "3d" && this.state.resolved) {
      const stage = this.$("#stage3d");
      this.threeView.mount(stage);
      this.threeView.setNormalMode();
      this.threeView.setSelection(this.state.selection);

      const self = this;
      requestAnimationFrame(function () {
        self.threeView.resize(stage.clientWidth, stage.clientHeight || 620);
      });
    }

    this.updateSelectionVisuals();
    if (this.state.selection) this.renderSelectionCard();

    if (this.getAttribute("view") !== normalized) {
      this.setAttribute("view", normalized);
    }

    this.dispatchEvent(new CustomEvent("viewchange", {
      detail: { view: normalized },
      bubbles: true,
      composed: true
    }));
  }

  showAtomHover(atomId, point, persistent) {
    if (!this.state.resolved) return;

    const graph = this.state.resolved.graph;
    const node = graph.nodes[atomId];
    if (!node) return;

    const sections = [
      '<strong>' + esc(node.el + String(atomId + 1)) + '</strong>'
    ];

    if (this.state.overlays.hybridization) {
      sections.push(
        '<div><span>hybridization</span> ' +
        '<b>' + esc(atomHybridization(graph, atomId)) + '</b></div>'
      );
    }

    if (this.state.overlays.angles) {
      const metrics = angleMetrics(this.state.resolved, atomId);
      const rows = metrics.rows.slice(0, 8);

      if (rows.length) {
        sections.push(
          '<div class="metric-list">' +
          rows.map(function (row) {
            return '<span>' + esc(row.label) + ' <b>' +
              row.value.toFixed(1) + '°</b></span>';
          }).join("") +
          '</div>'
        );
      }
    }

    if (
      !this.state.overlays.hybridization &&
      !this.state.overlays.angles
    ) {
      sections.push('<small>enable an atom overlay above</small>');
    }

    this.showHover(sections.join(""), point, persistent);
  }

  showBondHover(bondId, point, persistent) {
    if (!this.state.resolved) return;

    const graph = this.state.resolved.graph;
    const bond = graph.bonds[bondId];
    if (!bond) return;

    const a = graph.nodes[bond.a];
    const b = graph.nodes[bond.b];

    const sections = [
      '<strong>' +
      esc(a.el + String(a.id + 1) + "–" + b.el + String(b.id + 1)) +
      '</strong>'
    ];

    if (this.state.overlays.lengths) {
      const metric = bondMetric(this.state.resolved, bond);
      sections.push(
        '<div><span>bond length</span> <b>' +
        metric.value.toFixed(3) + ' Å</b></div>'
      );
    } else {
      sections.push('<small>enable bond lengths above</small>');
    }

    this.showHover(sections.join(""), point, persistent);
  }

  showHover(html, point, persistent) {
    const card = this.$(".hover-card");
    const pinned = Boolean(persistent || this.coarsePointer);

    card.classList.toggle("pinned", pinned);
    card.innerHTML =
      (pinned
        ? '<button type="button" class="inspect-close" data-close-inspector aria-label="Close inspection">×</button>'
        : "") +
      html;
    card.hidden = false;

    if (pinned) {
      card.style.left = "";
      card.style.top = "";
      return;
    }

    const safePoint = point || {
      localX: this.$(".primary-stage").clientWidth / 2,
      localY: this.$(".primary-stage").clientHeight / 2
    };

    const x = Math.max(
      12,
      Math.min(
        safePoint.localX + 16,
        this.$(".primary-stage").clientWidth - 260
      )
    );
    const y = Math.max(12, safePoint.localY + 16);

    card.style.left = x + "px";
    card.style.top = y + "px";
  }

  hideHover(force) {
    if (this.state.selection && !force) return;
    const card = this.$(".hover-card");
    card.hidden = true;
    card.classList.remove("pinned");
  }

  selectTarget(kind, id) {
    const current = this.state.selection;

    if (current && current.kind === kind && current.id === id) {
      this.clearSelection();
      return;
    }

    this.state.selection = { kind: kind, id: id };
    this.updateSelectionVisuals();
    this.renderSelectionCard();
  }

  clearSelection() {
    this.state.selection = null;
    this.updateSelectionVisuals();
    this.hideHover(true);
  }

  updateSelectionVisuals() {
    const selection = this.state.selection;

    this.$(".atom-hit").forEach(function (target) {
      target.classList.toggle(
        "selected",
        Boolean(
          selection &&
          selection.kind === "atom" &&
          Number(target.dataset.atomId) === selection.id
        )
      );
    });

    this.$(".bond-hit").forEach(function (target) {
      target.classList.toggle(
        "selected",
        Boolean(
          selection &&
          selection.kind === "bond" &&
          Number(target.dataset.bondId) === selection.id
        )
      );
    });

    if (this.threeView) this.threeView.setSelection(selection);
  }

  renderSelectionCard() {
    const selection = this.state.selection;
    if (!selection) return;

    if (selection.kind === "atom") {
      this.showAtomHover(selection.id, null, true);
    } else {
      this.showBondHover(selection.id, null, true);
    }
  }


  resetRelated() {
    this.state.relatedMode = null;
    this.state.relatedItems = [];

    this.$(".related-nav button").forEach(function (button) {
      button.classList.remove("active");
    });

    const box = this.$(".related-results");
    box.hidden = true;
    box.innerHTML = "";
  }

  async loadRelated(mode) {
    if (!this.state.resolved) return;

    const box = this.$(".related-results");
    const result = this.state.resolved;
    const meta = result.metadata;
    const key = mode + ":" + (meta.cid || meta.molecularFormula || result.smiles);

    if (this.state.relatedMode === mode && !box.hidden) {
      this.resetRelated();
      return;
    }

    this.state.relatedMode = mode;

    this.$(".related-nav button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.related === mode);
    });

    box.hidden = false;
    box.innerHTML = '<div class="related-loading">Loading related structures…</div>';

    try {
      let rows = this.state.relatedCache[key];

      if (!rows) {
        if (mode === "formula") {
          rows = await getSameFormulaCandidates(
            meta.molecularFormula,
            meta.cid
          );
        } else {
          rows = meta.cid
            ? await getSimilarCompounds(meta.cid, {
                threshold: 90,
                maxRecords: 12
              })
            : [];
        }

        this.state.relatedCache[key] = rows;
      }

      this.state.relatedItems = rows;

      if (!rows.length) {
        box.innerHTML =
          '<div class="related-empty">' +
          (mode === "similar" && !meta.cid
            ? "Structural similarity requires a resolved PubChem CID for this molecule."
            : "No additional compounds were returned for this search.") +
          '</div>';
        return;
      }

      box.innerHTML =
        '<div class="related-grid">' +
        rows.map(function (item, index) {
          return candidateCard(item, index, mode);
        }).join("") +
        '</div>';
    } catch (error) {
      box.innerHTML =
        '<div class="related-empty">' +
        esc(error && error.message ? error.message : String(error)) +
        '</div>';
    }
  }

  async chooseRelated(candidate) {
    this.$(".query").classList.add("loading");

    try {
      const result = await resolveCandidate(
        candidate,
        candidate.title || candidate.iupacName || ("CID " + candidate.cid)
      );

      this.$(".query").value =
        candidate.title || candidate.iupacName || ("CID " + candidate.cid);

      this.applyResolved(result);
    } catch (error) {
      this.$(".error").textContent =
        error && error.message ? error.message : String(error);
      this.$(".error").hidden = false;
    } finally {
      this.$(".query").classList.remove("loading");
    }
  }

  toggleSecondary(name) {
    const next = this.state.secondary === name ? null : name;
    this.state.secondary = next;

    this.$$(".secondary-nav button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.secondary === next);
    });

    this.$$(".secondary-panel").forEach(function (panel) {
      panel.hidden = panel.dataset.secondaryPanel !== next;
    });

    if (next === "symmetry" && this.state.resolved) {
      this.mountSymmetry();
    }
  }

  setupNewman() {
    const bonds = eligibleNewmanBonds(this.state.resolved.graph);
    const select = this.$("#newmanBond");

    select.innerHTML = bonds.map(function (bond, index) {
      return (
        '<option value="' + index + '">' +
        esc(bondLabel(this.state.resolved.graph, bond)) +
        '</option>'
      );
    }, this).join("");

    select.disabled = bonds.length === 0;
    this.$("#newmanEmpty").hidden = bonds.length !== 0;
    this.$("#newmanSvg").hidden = bonds.length === 0;

    this.renderNewman();
  }

  renderNewman() {
    if (!this.state.resolved) return;

    const bonds = eligibleNewmanBonds(this.state.resolved.graph);

    if (!bonds.length) {
      this.$("#conformation").textContent =
        "Newman projections require an eligible sp³ C–C single bond.";
      return;
    }

    const index = Math.min(this.state.newmanBondIndex, bonds.length - 1);

    const result = renderNewmanSvg(
      this.$("#newmanSvg"),
      this.state.resolved.graph,
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

  mountSymmetry() {
    const stage = this.$("#stageSym");
    this.symmetryView.mount(stage);
    this.updateSymmetry();

    const self = this;
    requestAnimationFrame(function () {
      self.symmetryView.resize(stage.clientWidth, stage.clientHeight || 620);
    });
  }

  updateSymmetry() {
    if (!this.symmetryView || !this.state.resolved) return;

    this.symmetryView.setSymmetryMode(
      this.$("#symAxis").value,
      Number(this.$("#symAngle").value),
      this.$("#mirrorPlane").value
    );
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
