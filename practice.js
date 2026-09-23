const CSS_URL = new URL("./practice.css", import.meta.url).href;

const CHAPTERS = {
  "1": {
    label: "Chapter 1",
    categories: {
      "Dipoles": [
        ["1.4", "Show the direction of the dipole, if there is one, in the indicated bonds of the following molecules:", "H–Cl    H–F    Li–CH₃    H₃C–Cl    HO–NH₂    H₃C–CH₃"],
        ["1.5", "Which of these two molecules has a dipole moment and which does not? Look carefully at the shapes of the two tetrahedral molecules.", "CCl₄    CHCl₃"]
      ],
      "Lewis structures": [
        ["1.6", "Construct Lewis structures for the following neutral molecules:", "(a) BF₃    (b) H₂Be    (c) SiH₄    (d) CH₂Cl₂    (e) HOCH₃    (f) H₂N–NH₂"],
        ["1.7", "Draw Lewis structures for the following neutral species. Use lines to indicate electrons in bonds and dots to indicate nonbonding electrons.", "(a) CH₃·    (b) CH₂    (c) Br·    (d) ·OH    (e) ·NH₂    (f) H₃C–N"],
        ["1.8", "Each of the following compounds has at least one multiple bond. Draw a Lewis structure for each molecule. Use lines to indicate electrons in bonds and dots to indicate nonbonding electrons.", "(a) F₂C=CF₂    (b) H₃CCN    (c) H₂CO    (d) H₂CCO    (e) H₂CCHCHCH₂    (f) H₃CNO    (g) H₃COCO₂H"],
        ["1.9", "Draw Lewis structures for the following charged species. In each case, the charge is shown closest to the charged atom.", "(a) OH⁻    (b) BH₄⁻    (c) NH₄⁺    (d) Cl⁻    (e) CH₃⁺    (f) H₃O⁺    (g) NO₂⁺"],
        ["1.52", "Write Lewis dot structures for the neutral diatomic molecules F₂ and N₂. In F₂, there is a single bond between the two atoms, but in N₂ there is a triple bond between the two atoms.", ""]
      ],
      "Formal charge": [
        ["1.10", "Add charges to the following compounds wherever necessary:", "(a) CH₂    (b) CH₃    (c) C–H framework    (d) OH    (e) OH₃    (f) H₂C–O    (g) HN–C–NH"],
        ["1.11", "Add electrons to complete the following Lewis structures. In each case, the charge is placed as close as possible to the charged atom.", "(a) CH₂⁺    (b) CH₃CH₂⁻    (c) two-carbon charged structure    (d) H₃O⁺    (e) OH⁻    (f) NH₂⁺    (g) NH₂⁻    (h) CH₃–C–N charged structure"],
        ["1.12", "Draw a Lewis structure for nitric acid (HO–NO₂), and verify that the nitrogen is positive and one of the oxygens is negative.", ""],
        ["1.48", "Add charges to the following molecules where necessary:", "(a) three-membered O ring    (b) three-membered N ring    (c) three-membered Br ring    (d) three-membered S ring"],
        ["1.49", "Add charges to the following molecules where necessary:", "(a–c) O structures    (d–f) S structures    (g–i) N structures    (j–l) P structures"],
        ["1.50", "Determine the formal charge, if there is one, for each of the nitrogens in the following molecules:", "(a)    (b)    (c)    (d)"],
        ["1.51", "Determine the formal charges, if any, for the molecules shown below.", "(a)    (b)    (c)    (d)"]
      ],
      "Resonance": [
        ["1.13", "Use the curved arrow formalism to convert your Lewis structure for nitric acid (HO–NO₂, Problem 1.12) into a resonance form.", ""],
        ["1.14", "Draw another structure for nitromethane in which every atom is neutral. Hint: There are only single bonds in this structure.", ""],
        ["1.15", "Acetone, (CH₃)₂CO, is similar to formaldehyde. Draw a Lewis structure for acetone. Draw two resonance forms. Which do you suppose contributes more to the molecule? Why? Which contributes less? Why?", ""],
        ["1.16", "Use the arrow formalism to convert each of the following Lewis structures into another resonance form. Notice that part (e) asks you to do something new—to move electrons one at a time in writing Lewis forms.", "(a)    (b)    (c)    (d) H₃N–BH₃    (e)"],
        ["1.17", "Use the arrow formalism to write resonance forms that contribute to the structures of the following molecules:", "(a)    (b)    (c)    (d)    (e)"],
        ["1.18", "Write two more resonance forms for 1,3-butadiene.", "CH₂=CH–CH=CH₂"],
        ["1.19", "Add dots for the electron pairs and write resonance forms for the following structures:", "(a)    (b)    (c)    (d)    (e)    (f)    (g)"],
        ["1.20", "Write Lewis structures and resonance forms for the following compounds.", "(a) NCCH₂⁻    (b) ⁻OSO₂OH    (c) CH₃COO⁻"],
        ["1.21", "Which of the following pairs of structures are not resonance forms of each other? Why not? You may have to add dots to make good Lewis structures first.", "(a)    (b)    (c)    (d)"],
        ["1.22", "In the following pairs of resonance forms, indicate which form you think is more important and therefore contributes more to the structure. Justify your choice. You may have to add dots to make good Lewis structures first.", "(a)    (b)    (c)    (d)    (e)"],
        ["1.37", "Use the arrow formalism to write structures for the resonance forms contributing to the structures of the following ions:", "(a) carbonate ion    (b) sulfate ion    (c) nitrate ion    (d) guanidinium ion    (e) a vinyl ammonium ion"],
        ["1.38", "Use the arrow formalism to draw three additional resonance structures for each of the following molecules:", "(a)    (b)    (c)    (d)    (e)    (f)"],
        ["1.39", "Draw three resonance structures for each of the following:", "(a) ⁻CH₂NO₂    (b) CH₃CO₂CH₃    (c) ⁻CH₂CO₂⁻    (d) HOSO₂O⁻"],
        ["1.42", "Draw resonance forms for the following cyclic molecules:", "(a)    (b)    (c)"],
        ["1.43", "Draw resonance forms for the following acyclic molecules:", "(a)    (b)"],
        ["1.44", "Ozone (O₃) resembles the molecules in Problem 1.38. Write a Lewis “dot” structure for ozone and sketch out contributing resonance forms. Write one neutral resonance form. Be careful with this last part; the answer is tricky.", "O₃"],
        ["1.45", "Draw two resonance structures for each of the compounds shown below.", "(a)    (b)"]
      ],
      "Molecular orbitals": [
        ["1.24", "Sketch the orbitals produced through the interaction of a carbon 2s atomic orbital overlapping end-on with a carbon 2p atomic orbital.", "2s + 2p"]
      ]
    }
  },

  "2": {
    label: "Chapter 2",
    categories: {
      "Structure": [
        ["2.9", "Use the halogens (X = F, Cl, Br, or I) to draw all possible molecules CH₂X₂. For example, CH₂BrCl is one answer.", ""],
        ["2.10", "Draw all possible molecules of the formula CH₂X₂, CHX₃, and CX₄ when X is F or Cl.", ""],
        ["2.11", "Draw a structure for the methyl radical at the halfway point for the inversion shown in Figure 2.18. What is the hybridization of the carbon atom in the structure you drew?", "methyl radical inversion: pyramidal → planar → pyramidal"],
        ["2.18", "Draw three-dimensional structures for (Me)₂CH₂, (CH₃)₄C, (CH₃)₃CH, EtCH₃, (Et)₂, CH₃CH₂CH₃, EtMe, and MeEt.", ""],
        ["2.19", "Start with the two “different” structures in Figure 2.25a and replace the X group with CH₃ in each. Make three-dimensional drawings of the “two” molecules you’ve created and convince yourself that both your three-dimensional drawings represent the same molecule; there is only one CH₃CH₂CH₃. By all means, use your models.", ""],
        ["2.20", "Make a three-dimensional drawing of propyl alcohol (CH₃–CH₂–CH₂–OH) and one of the related isopropyl alcohol (CH₃–CHOH–CH₃).", ""]
      ],
      "Conformations": [
        ["2.12", "Draw Newman projections for the staggered conformations of ethyl chloride (CH₃–CH₂–Cl) and 1,2-dichloroethane (Cl–CH₂–CH₂–Cl). In the second case, there are two staggered conformations of different energy. Can you estimate which is more stable?", ""],
        ["2.13", "Use an orbital interaction diagram like the one for He₂ in Figure 1.48 (p. 42) to show the destabilization in eclipsed ethane. How many eclipsing filled orbital–filled orbital interactions are present?", ""],
        ["2.16", "Draw the low-energy Newman projection for the structure depicted below by looking down the carbon–carbon bond.", "Eye → H₃C–CH₂OH"],
        ["2.47", "Use your model set to look down the C(3)–C(4) bond of hexane. Draw the Newman projections for the three staggered and the three eclipsed conformations.", ""],
        ["2.48", "Use your model set to look down the C(2)–C(3) bond of 2-bromo-3-methylbutane. Draw the Newman projection for all possible staggered conformations. Circle the one you think is the most stable and explain why you’ve chosen that one. Determine the number of gauche interactions in each projection.", ""],
        ["2.49", "Draw the Newman projections for the different eclipsed and staggered conformations of 2,3-dichlorobutane. Look down the bond joining the two chlorine-bearing carbons. Label each projection as either eclipsed or staggered. In each staggered projection, determine the number and type of gauche interactions.", ""],
        ["2.50", "Draw Newman projections constructed by looking down the C(1)–C(2) bond of 2-methylpentane. Repeat this process looking down the C(2)–C(3) bond. In each case, indicate which conformations will be the most stable.", ""]
      ],
      "Nomenclature & drawings": [
        ["2.41", "Provide the IUPAC name for each of the following compounds:", "Assigned parts: (f), (h), (i)"],
        ["2.44", "Redraw the following line structures so that each atom (including hydrogens), each bond, and any lone pairs are clearly shown.", "(a)    (b)    (c)    (d)"],
        ["2.46", "Draw all the isomers of C₅H₁₁Cl. Give proper systematic names to all of them. Hint: There are eight isomers.", ""]
      ],
      "Hybridization": [
        ["2.52", "What is the approximate hybridization of the indicated carbon in the following compounds?", "(a)    (b)    (c)    (d)    (e)    (f)"],
        ["2.53", "Indicate the hybridization for each carbon, nitrogen, and oxygen in the molecules shown below. Put a circle around the sp³-hybridized atoms, a triangle around sp²-hybridized atoms, and a box around the sp-hybridized atoms.", "(a) Xanturil    (b) Viquidil"]
      ]
    }
  }
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

class OChemPractice extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.chapter = "1";
    this.category = Object.keys(CHAPTERS["1"].categories)[0];
    this.shadowRoot.innerHTML = '<link rel="stylesheet" href="' + CSS_URL + '"><main class="practice-shell"><nav class="chapter-tabs" aria-label="Chapters"></nav><nav class="category-tabs" aria-label="Categories"></nav><section class="problems"></section></main>';
  }

  connectedCallback() {
    this.render();
  }

  $(selector) {
    return this.shadowRoot.querySelector(selector);
  }

  render() {
    const chapterNav = this.$(".chapter-tabs");
    chapterNav.innerHTML = Object.entries(CHAPTERS).map(([key, chapter]) =>
      '<button type="button" data-chapter="' + key + '" class="' + (key === this.chapter ? "active" : "") + '">' + esc(chapter.label) + '</button>'
    ).join("");

    chapterNav.querySelectorAll("[data-chapter]").forEach(button => {
      button.addEventListener("click", () => {
        this.chapter = button.dataset.chapter;
        this.category = Object.keys(CHAPTERS[this.chapter].categories)[0];
        this.render();
      });
    });

    const categories = CHAPTERS[this.chapter].categories;
    const categoryNav = this.$(".category-tabs");
    categoryNav.innerHTML = Object.keys(categories).map(name =>
      '<button type="button" data-category="' + esc(name) + '" class="' + (name === this.category ? "active" : "") + '">' + esc(name) + '</button>'
    ).join("");

    categoryNav.querySelectorAll("[data-category]").forEach(button => {
      button.addEventListener("click", () => {
        this.category = button.dataset.category;
        this.render();
      });
    });

    this.$(".problems").innerHTML = categories[this.category].map(([number, prompt, figure]) =>
      '<article class="problem">' +
        '<p><strong>PROBLEM ' + esc(number) + '</strong> ' + esc(prompt) + '</p>' +
        (figure ? '<div class="problem-figure">' + esc(figure) + '</div>' : '') +
      '</article>'
    ).join("");
  }
}

customElements.define("ochem-practice", OChemPractice);
