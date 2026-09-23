import * as OCL from "openchemlib";

const CSS_URL = new URL("./practice.css", import.meta.url).href;

const PROBLEMS = [
  {
    number: "1.4", topic: "Dipoles", page: 15,
    prompt: "For each indicated bond, decide whether it is polar and, if so, draw the dipole direction.",
    species: [
      ["H–Cl", "Cl", "hydrogen chloride"],
      ["H–F", "F", "hydrogen fluoride"],
      ["Li–CH₃", "[Li]C", "methyllithium"],
      ["CH₃–Cl", "CCl", "chloromethane"],
      ["HO–NH₂", "NO", "hydroxylamine"],
      ["CH₃–CH₃", "CC", "ethane"]
    ]
  },
  {
    number: "1.5", topic: "Dipoles", page: 16,
    prompt: "Compare the two tetrahedral molecules and determine which has a net molecular dipole and which has bond dipoles that cancel.",
    species: [
      ["CCl₄", "ClC(Cl)(Cl)Cl", "carbon tetrachloride"],
      ["CHCl₃", "ClC(Cl)Cl", "chloroform"]
    ]
  },
  {
    number: "1.6", topic: "Lewis structures", page: 17, worked: true,
    prompt: "Construct complete Lewis structures for each neutral molecule, including all lone pairs.",
    species: [
      ["BF₃", "FB(F)F", "boron trifluoride"],
      ["BeH₂", "[H][Be][H]", "beryllium hydride"],
      ["SiH₄", "[SiH4]", "silane"],
      ["CH₂Cl₂", "ClCCl", "dichloromethane"],
      ["HOCH₃", "CO", "methanol"],
      ["H₂N–NH₂", "NN", "hydrazine"]
    ]
  },
  {
    number: "1.7", topic: "Lewis structures", page: 18, worked: true,
    prompt: "Draw Lewis structures for the neutral species. Use bond lines for shared pairs and dots for nonbonding electrons.",
    labels: ["CH₃·", "CH₂", "Br·", "·OH", "·NH₂", "H₃C–N"]
  },
  {
    number: "1.8", topic: "Lewis structures", page: 19, worked: true,
    prompt: "Each species requires at least one multiple bond. Complete the Lewis structure and place all nonbonding electrons.",
    labels: ["F₂C=CF₂", "CH₃CN", "H₂CO", "H₂C=C=O", "H₂C=CH–CH=CH₂", "CH₃NO", "the oxygen-containing structure shown in part (g)"],
    species: [
      ["F₂C=CF₂", "FC(F)=C(F)F", "tetrafluoroethene"],
      ["CH₃CN", "CC#N", "acetonitrile"],
      ["H₂CO", "C=O", "formaldehyde"],
      ["H₂C=C=O", "C=C=O", "ketene"],
      ["1,3-butadiene", "C=CC=C", "1,3-butadiene"]
    ]
  },
  {
    number: "1.9", topic: "Formal charge", page: 21,
    prompt: "Draw complete Lewis structures for the charged species. The stated charge belongs on the indicated atom in the source setup.",
    labels: ["OH⁻", "BH₄⁻", "NH₄⁺", "Cl⁻", "CH₃⁺", "H₃O⁺", "NO₂⁺"],
    species: [
      ["OH⁻", "[OH-]", "hydroxide"],
      ["BH₄⁻", "[BH4-]", "borohydride"],
      ["NH₄⁺", "[NH4+]", "ammonium"],
      ["Cl⁻", "[Cl-]", "chloride"],
      ["CH₃⁺", "[CH3+]", "methyl cation"],
      ["H₃O⁺", "[OH3+]", "hydronium"],
      ["NO₂⁺", "O=[N+]=O", "nitronium"]
    ]
  },
  {
    number: "1.10", topic: "Formal charge", page: 22,
    prompt: "Add formal charges wherever required in each of the seven Lewis structures supplied in the textbook.",
    labels: ["(a) CH₂ framework", "(b) CH₃ framework", "(c) C–H framework", "(d) OH framework", "(e) OH₃ framework", "(f) H₂C–O framework", "(g) HN–C–NH framework"],
    diagramDependent: true
  },
  {
    number: "1.11", topic: "Formal charge", page: 22,
    prompt: "Add the missing electrons to complete each charged Lewis structure. Keep the given atomic connectivity and charge locations.",
    labels: ["CH₂⁺", "CH₃CH₂⁻", "two-carbon charged framework", "H₃O⁺", "OH⁻", "NH₂⁺", "NH₂⁻", "methyl–C–N charged framework"],
    diagramDependent: true
  },
  {
    number: "1.12", topic: "Formal charge", page: 24,
    prompt: "Draw nitric acid as HO–NO₂ and verify the formal-charge pattern: nitrogen positive and one oxygen negative.",
    species: [["HNO₃", "O=[N+]([O-])O", "nitric acid"]]
  },
  {
    number: "1.13", topic: "Resonance", page: 25,
    prompt: "Starting from your nitric-acid Lewis structure, use curved arrows to generate a valid resonance contributor.",
    species: [["HNO₃", "O=[N+]([O-])O", "nitric acid"]]
  },
  {
    number: "1.14", topic: "Resonance", page: 25, worked: true,
    prompt: "Draw the alternate nitromethane contributor in which every atom is formally neutral and only single bonds are used.",
    species: [["CH₃NO₂", "C[N+](=O)[O-]", "nitromethane"]]
  },
  {
    number: "1.15", topic: "Resonance", page: 27,
    prompt: "Draw acetone's Lewis structure and two resonance contributors. Decide which contributor is more important and justify the weighting.",
    species: [["acetone", "CC(=O)C", "acetone"]]
  },
  {
    number: "1.16", topic: "Resonance", page: 27,
    prompt: "For each structure (a–e), use curved-arrow formalism to produce another valid resonance contributor. Part (e) introduces one-electron movement.",
    labels: ["(a)", "(b)", "(c)", "(d) H₃N→BH₃ donor–acceptor structure", "(e) one-electron resonance example"],
    diagramDependent: true
  },
  {
    number: "1.17", topic: "Resonance", page: 27, worked: true,
    prompt: "Use curved arrows to write the resonance contributors for each of the structures shown in parts (a–e).",
    labels: ["(a)", "(b)", "(c)", "(d)", "(e)"],
    diagramDependent: true
  },
  {
    number: "1.18", topic: "Resonance", page: 28,
    prompt: "Starting with 1,3-butadiene, write two additional resonance contributors.",
    species: [["1,3-butadiene", "C=CC=C", "1,3-butadiene"]]
  },
  {
    number: "1.19", topic: "Resonance", page: 30, worked: true,
    prompt: "Add all missing lone-pair electrons, then write resonance contributors for each of the seven structures (a–g).",
    labels: ["(a) carbonyl system", "(b) conjugated carbonyl", "(c) ester", "(d) amide/conjugated N system", "(e) cyclic conjugated system", "(f) cyclic cation system", "(g) aromatic oxygen-anion system"],
    diagramDependent: true
  },
  {
    number: "1.20", topic: "Resonance", page: 31,
    prompt: "Draw complete Lewis structures and all relevant resonance contributors for each species.",
    labels: ["NCCH₂⁻", "⁻OSO₂OH", "CH₃COO⁻"],
    species: [
      ["cyanomethyl anion", "[CH2-]C#N", "cyanomethyl anion"],
      ["acetate", "CC(=O)[O-]", "acetate"]
    ]
  },
  {
    number: "1.21", topic: "Resonance", page: 31, worked: true,
    prompt: "For each pair (a–d), decide whether the drawings are resonance contributors of the same species. If not, explain what changed besides electron placement.",
    labels: ["pair (a)", "pair (b)", "pair (c)", "pair (d)"],
    diagramDependent: true
  },
  {
    number: "1.22", topic: "Resonance", page: 31,
    prompt: "For each pair of resonance contributors, identify the more important contributor and justify the choice using octets, bonding, charge separation, and charge placement.",
    labels: ["pair (a)", "pair (b)", "pair (c)", "pair (d)", "pair (e)"],
    diagramDependent: true
  },
  {
    number: "1.24", topic: "Molecular orbitals", page: 35, worked: true,
    prompt: "Sketch the two molecular orbitals formed by end-on overlap of a carbon 2s atomic orbital with a carbon 2p atomic orbital. Show the bonding and antibonding combinations and their nodes.",
    labels: ["C 2s + C 2p → bonding MO + antibonding MO"]
  },
  {
    number: "1.37", topic: "Resonance", page: 47,
    prompt: "Use curved arrows to generate the resonance contributors for each ion.",
    labels: ["carbonate", "sulfate", "nitrate", "guanidinium", "vinyl ammonium ion"],
    species: [
      ["carbonate", "[O-]C(=O)[O-]", "carbonate"],
      ["nitrate", "[O-][N+](=O)[O-]", "nitrate"],
      ["guanidinium", "NC(=[NH2+])N", "guanidinium"]
    ]
  },
  {
    number: "1.38", topic: "Resonance", page: 47,
    prompt: "For each of the six supplied structures (a–f), use curved arrows to draw three additional resonance contributors.",
    labels: ["structure (a)", "structure (b)", "structure (c)", "structure (d)", "structure (e)", "structure (f)"],
    diagramDependent: true
  },
  {
    number: "1.39", topic: "Resonance", page: 48,
    prompt: "Draw three resonance contributors for each listed species.",
    labels: ["⁻CH₂NO₂", "CH₃CO₂CH₃", "⁻CH₂CO₂⁻", "HOSO₂O⁻"],
    species: [
      ["nitromethyl anion", "[CH2-][N+](=O)[O-]", "nitromethyl anion"],
      ["methyl acetate", "CC(=O)OC", "methyl acetate"]
    ]
  },
  {
    number: "1.42", topic: "Resonance", page: 48,
    prompt: "Draw the resonance contributors for each of the three cyclic conjugated systems shown in parts (a–c).",
    labels: ["cyclic system (a)", "cyclic system (b)", "cyclic system (c)"],
    diagramDependent: true
  },
  {
    number: "1.43", topic: "Resonance", page: 48,
    prompt: "Draw the resonance contributors for the two acyclic conjugated systems shown in parts (a) and (b).",
    labels: ["acyclic system (a)", "acyclic system (b)"],
    diagramDependent: true
  },
  {
    number: "1.44", topic: "Resonance", page: 48,
    prompt: "Write a complete Lewis structure for ozone, then draw its contributing resonance forms. Also find a formally neutral contributor.",
    species: [["O₃", "[O-][O+]=O", "ozone"]]
  },
  {
    number: "1.45", topic: "Resonance", page: 48,
    prompt: "Draw two resonance contributors for each of the two compounds shown in the source problem.",
    labels: ["compound (a): conjugated carbonyl system", "compound (b): N/O-containing system"],
    diagramDependent: true
  },
  {
    number: "1.48", topic: "Formal charge", page: 49,
    prompt: "Add formal charges where needed for the four three-membered heterocycles built from CH₂–CH₂ and O, N, Br, or S.",
    labels: ["O three-membered ring", "N three-membered ring", "Br three-membered ring", "S three-membered ring"]
  },
  {
    number: "1.49", topic: "Formal charge", page: 49,
    prompt: "Assign formal charges where required across the O-, S-, N-, and P-containing structures in parts (a–l).",
    labels: ["O series (a–c)", "S series (d–f)", "N series (g–i)", "P series (j–l)"],
    diagramDependent: true
  },
  {
    number: "1.50", topic: "Formal charge", page: 49,
    prompt: "Determine the formal charge, if any, on every nitrogen atom in each of the four nitrogen-containing structures (a–d).",
    labels: ["structure (a)", "structure (b)", "structure (c)", "structure (d)"],
    diagramDependent: true
  },
  {
    number: "1.51", topic: "Formal charge", page: 49,
    prompt: "Determine all formal charges in the four carbon/aluminum hydride structures.",
    labels: ["structure (a)", "structure (b)", "structure (c)", "structure (d)"],
    diagramDependent: true
  },
  {
    number: "1.52", topic: "Lewis structures", page: 49,
    prompt: "Draw Lewis dot structures for neutral F₂ and N₂, accounting for the single bond in F₂ and the triple bond in N₂.",
    species: [
      ["F₂", "FF", "fluorine"],
      ["N₂", "N#N", "nitrogen"]
    ]
  }
];

const TOPICS = ["All", "Dipoles", "Lewis structures", "Formal charge", "Resonance", "Molecular orbitals"];

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function structureSvg(smiles, id) {
  try {
    const molecule = OCL.Molecule.fromSmiles(smiles);
    if (typeof molecule.inventCoordinates === "function") molecule.inventCoordinates();
    return molecule.toSVG(240, 145, id, {
      autoCrop: true,
      autoCropMargin: 12,
      factorTextSize: 0.92
    });
  } catch {
    return "";
  }
}

function problemCard(problem) {
  const source = "Jones 5e · p. " + problem.page;
  const species = (problem.species || []).map((entry, index) => {
    const [label, smiles, query] = entry;
    const svg = structureSvg(smiles, "practice-" + problem.number.replace(".", "-") + "-" + index);
    return `
      <button type="button" class="species-card" data-open-query="${esc(query || label)}">
        ${svg ? '<div class="species-svg">' + svg + '</div>' : ""}
        <span>${esc(label)}</span>
        <small>open in visualizer</small>
      </button>`;
  }).join("");

  const labels = (problem.labels || []).length
    ? '<div class="setup-list">' + problem.labels.map(x => '<span>' + esc(x) + '</span>').join("") + '</div>'
    : "";

  return `
    <article class="problem-card" data-topic="${esc(problem.topic)}" data-number="${esc(problem.number)}">
      <div class="problem-meta">
        <strong>Problem ${esc(problem.number)}</strong>
        <span>${esc(problem.topic)}</span>
        ${problem.worked ? '<span>worked in text</span>' : ""}
        <span class="source">${esc(source)}</span>
      </div>
      <p>${esc(problem.prompt)}</p>
      ${species ? '<div class="species-grid">' + species + '</div>' : ""}
      ${labels}
      ${problem.diagramDependent ? '<div class="diagram-note">Native redrawing of this source figure is the next fidelity pass; the problem is indexed here now without reproducing the textbook image.</div>' : ""}
      <label class="scratch-label">Work / notes
        <textarea class="scratch" data-note-key="ochem-practice-${esc(problem.number)}" placeholder="Your work stays in this browser."></textarea>
      </label>
    </article>`;
}

class OChemPractice extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.topic = "All";
    this.search = "";
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${CSS_URL}">
      <main class="practice-shell">
        <header class="practice-head">
          <div>
            <span class="eyebrow">Practice</span>
            <h1>Chapter 1</h1>
            <p>Atoms and Molecules; Orbitals and Bonding · 32 assigned problems</p>
          </div>
          <div class="chapter-tabs" role="tablist" aria-label="Practice chapters">
            <button class="active" type="button">Chapter 1</button>
            <button type="button" disabled>Chapter 2</button>
            <button type="button" disabled>Chapter 3</button>
            <button type="button" disabled>Problem Sets</button>
            <button type="button" disabled>Mixed</button>
          </div>
        </header>

        <section class="practice-controls">
          <input class="practice-search" type="search" placeholder="Find a problem, molecule, or topic" aria-label="Search Chapter 1 practice">
          <div class="topic-tabs" role="tablist" aria-label="Filter by topic">
            ${TOPICS.map((topic, i) => `<button type="button" data-topic-filter="${esc(topic)}" class="${i === 0 ? "active" : ""}">${esc(topic)}</button>`).join("")}
          </div>
          <div class="problem-count"></div>
        </section>

        <section class="problem-grid">
          ${PROBLEMS.map(problemCard).join("")}
        </section>
      </main>`;
  }

  connectedCallback() {
    this.$(".practice-search").addEventListener("input", event => {
      this.search = event.target.value.trim().toLowerCase();
      this.applyFilters();
    });

    this.$$("[data-topic-filter]").forEach(button => {
      button.addEventListener("click", () => {
        this.topic = button.dataset.topicFilter;
        this.$$("[data-topic-filter]").forEach(b => b.classList.toggle("active", b === button));
        this.applyFilters();
      });
    });

    this.$$("[data-open-query]").forEach(button => {
      button.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("openvisualizer", {
          detail: { query: button.dataset.openQuery },
          bubbles: true,
          composed: true
        }));
      });
    });

    this.$$(".scratch").forEach(area => {
      const key = area.dataset.noteKey;
      try { area.value = localStorage.getItem(key) || ""; } catch {}
      area.addEventListener("input", () => {
        try { localStorage.setItem(key, area.value); } catch {}
      });
    });

    this.applyFilters();
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.shadowRoot.querySelectorAll(selector));
  }

  applyFilters() {
    let shown = 0;
    this.$$(".problem-card").forEach(card => {
      const topicMatch = this.topic === "All" || card.dataset.topic === this.topic;
      const textMatch = !this.search || card.textContent.toLowerCase().includes(this.search);
      card.hidden = !(topicMatch && textMatch);
      if (!card.hidden) shown += 1;
    });
    this.$(".problem-count").textContent = shown + " of " + PROBLEMS.length + " problems";
  }
}

customElements.define("ochem-practice", OChemPractice);
