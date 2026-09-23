import { atom as A, graph as G, chain as C, fork as F, ring as R, tetra, orbitalSvg } from './chapter-one-structures.js';
const L = (...args) => { const g=C(...args); g.atoms.forEach(a=>{a.y=95;}); return g; };
const minus = {charge:'−'}, plus = {charge:'+'};
const pair = (...pairs) => ({pairs});
const neg = (...pairs) => ({charge:'−',pairs});
const pos = (...pairs) => ({charge:'+',pairs});
const part = (diagram, caption = '') => ({diagram,caption});
const forms = (left,right) => ({forms:[left,right]});
const formulas = (...items) => items.map(formula=>({formula}));
const carbonyl = (left,right,top='O',order=2,marks={}) => F('C',left,top,right,[1,order,1],marks);
const butadiene = C(['CH2','CH','CH','CH2'],[2,1,2]);
const acetate = carbonyl('CH3','O','O',2,{2:pair(-90,0),3:neg(0,90,180)});
const phenyl = (label,mark={}) => R(['CH','C','CH','CH','CH','CH'],[2,1,2,1,2,1],{},[[1,label,1,mark]]);
const enal = (last='CH2', marks={}) => {
 const g=C(['CH','CH','CH',last],[1,2,1],marks);g.atoms.push(A('O',35,35));g.bonds.push([0,4,2]);return g;
};
const p = (number,page,topic,prompt,parts=[],extra={}) => ({number:`1.${number}`,page,pdfPage:page+40,topic,prompt,parts,...extra});
export const chapterOne = [
 p(4,15,'Bond polarity','Show the direction of the dipole, if there is one, in the indicated bonds of the following molecules.',formulas('H—Cl','H—F','Li—CH₃','H₃C—Cl','HO—NH₂','H₃C—CH₃')),
 p(5,16,'Bond polarity','Which of these two molecules has a dipole moment and which does not? Look carefully at the shapes of the two tetrahedral molecules. Use molecular models if needed.',[part(tetra('Cl'),'Carbon tetrachloride (CCl₄)'),part(tetra('H'),'Chloroform (CHCl₃)')],{note:'Solid wedges point toward you; hashed wedges point away. The tetrahedral outlines in the book are omitted.'}),
 p(6,17,'Lewis structures','Construct Lewis structures for the following neutral molecules.',formulas('BF₃','H₂Be','SiH₄','CH₂Cl₂','HOCH₃','H₂N—NH₂'),{worked:true}),
 p(7,18,'Lewis structures','Draw Lewis structures for the following neutral species. Use lines to indicate electrons in bonds and dots to indicate nonbonding electrons.',formulas('CH₃','CH₂','Br','OH','NH₂','H₃C—N'),{worked:true}),
 p(8,19,'Lewis structures','Each of the following compounds has at least one multiple bond. Draw a Lewis structure for each molecule. Use lines for bonding electrons and dots for nonbonding electrons.',[...formulas('F₂CCF₂','H₃CCN','H₂CO','H₂CCO','H₂CCHCHCH₂','H₃CNO'),part(carbonyl('H3CO','OH'))],{worked:true}),
 p(9,21,'Formal charges','Draw Lewis structures for the following charged species. In each case, the charge is shown closest to the charged atom.',formulas('⁻OH','⁻BH₄','⁺NH₄','Cl⁻','⁺CH₃','⁺OH₃','⁺NO₂'),{note:'(g) Hint: Nitrogen is the central atom.'}),
 p(10,22,'Formal charges','Add charges to the following compounds wherever necessary.',[
 part(C(['CH2'],[],{0:pair(180)})),part(C(['CH3'],[],{0:{dots:[180]}})),part(C(['CH'],[],{0:{pairs:[180],dots:[-90]}})),
 part(C(['OH'],[],{0:pair(180,-90,90)})),part(C(['OH3'],[],{0:pair(180)})),part(L(['H2C','O'],[2],{1:pair(-90,0)})),part(L(['HN','C','NH'],[2,2],{0:pair(-90),2:pair(-90)}))]),
 p(11,22,'Formal charges','Add electrons to complete the following Lewis structures. In each case, the charge is placed as close as possible to the charged atom.',[
 ...formulas('⁺CH₂','⁻CH₂CH₃'),part(C(['HC','CH2'],[2],{0:minus})),...formulas('⁺OH₃','⁻OH','⁺NH₂','⁻NH₂'),part(L(['CH3','C','N','H'],[1,3,1],{2:plus}))]),
 p(12,24,'Formal charges','Draw a Lewis structure for nitric acid (HO—NO₂), and verify that the nitrogen is positive and one of the oxygens is negative (see Figure 1.26).'),
 p(13,25,'Resonance','Use the curved arrow formalism to convert your Lewis structure for nitric acid (HO—NO₂, Problem 1.12) into a resonance form.'),
 p(14,25,'Resonance','Draw another structure for nitromethane in which every atom is neutral. Hint: There are only single bonds in this structure.',[part(F('N','CH3','O','O',[1,2,1],{0:plus,2:pair(-90,0),3:neg(0,90,180)}),'Nitromethane: starting resonance form')],{worked:true}),
 p(15,27,'Resonance','Acetone, (CH₃)₂CO, is similar to formaldehyde. Draw a Lewis structure for acetone. Draw two resonance forms. Which do you suppose contributes more to the molecule? Why? Which contributes less? Why?'),
 p(16,27,'Resonance','Use the arrow formalism to convert each of the following Lewis structures into another resonance form. Part (e) asks you to move electrons one at a time.',[
 part(F('C','CH2','CH3','CH3',[1,1,1],{0:plus,1:neg(-90)})),
 part(G([A('B',100,90,minus),A('N',185,90,plus),A('H3C',55,30),A('H3C',55,150),A('CH3',230,30),A('CH3',230,150)],[[0,1,2],[0,2,1],[0,3,1],[1,4,1],[1,5,1]],'Dimethylboron double-bonded to dimethylnitrogen; B negative, N positive')),
 part(C(['O','CH','CH','CH2'],[1,2,1],{0:neg(-90,180,90),3:plus})),part(L(['H3N','BH3'],[1],{0:plus,1:minus})),
 part(C(['CH2','CH','CH','CH','CH','CH2'],[1,2,1,2,1],{0:{dots:[90]},5:{dots:[-90]}}))]),
 p(17,27,'Resonance','Use the arrow formalism to write resonance forms that contribute to the structures of the following molecules.',[
 part(C(['CH2','NH2'],[2],{1:plus})),part(butadiene),part(C(['CH2','CH','CH2'],[2,1],{2:plus})),part(acetate),part(carbonyl('CH3','OH','OH',2,{2:pos(0),3:pair(0,90)}))],{worked:true}),
 p(18,28,'Resonance','Write two more resonance forms for 1,3-butadiene.',[
 part(butadiene,'A'),part(C(['CH2','CH','CH','CH2'],[1,2,1],{0:{dots:[-90]},3:{dots:[-90]}}),'B'),
 part(C(['CH2','CH','CH','CH2'],[1,2,1],{0:plus,3:neg(-90)}),'C'),part(C(['CH2','CH','CH','CH2'],[1,2,1],{0:neg(-90),3:plus}),"C′")],{note:'Reference forms A, B, C and C′ from Figure 1.33 are supplied so “two more” has its original context.'}),
 p(19,30,'Resonance','Add dots for the electron pairs and write resonance forms for the following structures.',[
 part(carbonyl('CH3','CH3','OH',2,{2:plus})),part(enal('CH2',{3:minus})),part(carbonyl('CH3','OC2H5')),
 part(C(['CH3','CH','CH','CH','NH2'],[1,1,2,1],{1:plus})),part(phenyl('CH2',plus)),
 part(R(['CH','CH','CH','CH','CH'],[2,1,1,2,1],{2:minus})),part(phenyl('O',minus))],{worked:true}),
 p(20,31,'Resonance','Write Lewis structures and resonance forms for the following compounds. See the inside front cover of the textbook if you need help visualizing the structures.',formulas('NCCH₂⁻','⁻OSO₂OH','CH₃COO⁻')),
 p(21,31,'Resonance','Which of the following pairs of structures are not resonance forms of each other? Why not? You may have to add dots to make good Lewis structures first.',[
 forms(carbonyl('H','CH2','O',2,{3:minus}),F('C','H','O','CH2',[1,1,2],{2:minus})),
 forms(carbonyl('CH3','CH3'),F('C','CH3','OH','CH2',[1,1,2])),
 forms(G([A('C',90,90),A('CH',170,55),A('CH2',250,100,plus),A('H3C',35,40),A('H3C',35,150)],[[0,1,2],[1,2,1],[0,3,1],[0,4,1]],'(CH3)2C=CH–CH2 positive'),G([A('C',90,90,plus),A('CH',170,55),A('CH2',250,100),A('H3C',35,40),A('H3C',35,150)],[[0,1,1],[1,2,2],[0,3,1],[0,4,1]],'(CH3)2C positive–CH=CH2')),
 forms(carbonyl('H','H'),carbonyl('H','H','O',1,{0:plus,2:minus}))],{worked:true}),
 p(22,31,'Resonance','In the following pairs of resonance forms, indicate which form you think is more important and therefore contributes more to the structure. Justify your choice. You may have to add dots to make good Lewis structures first.',[
 forms(carbonyl('CH3','CH3','OH',2,{2:plus}),carbonyl('CH3','CH3','OH',1,{0:plus})),
 forms(F('C','CH3','NH','CH2',[1,2,1],{3:minus}),F('C','CH3','NH','CH2',[1,1,2],{2:minus})),
 forms(enal('CH2',{3:minus}),C(['O','CH','CH','CH','CH2'],[1,2,1,2],{0:minus})),
 forms(F('C','CH2','OH','CH3',[2,1,1]),F('C','CH2','OH','CH3',[1,2,1],{1:minus,2:plus})),
 forms(C(['CH3','O','CH','CH3'],[1,1,1],{2:plus}),C(['CH3','O','CH','CH3'],[1,2,1],{1:plus}))]),
 p(24,35,'Orbitals','Sketch the orbitals produced through the interaction of a carbon 2s atomic orbital overlapping end-on with a carbon 2p atomic orbital.',[{svg:orbitalSvg}],{worked:true}),
 p(37,47,'Resonance','Use the arrow formalism to write structures for the resonance forms contributing to the structures of the following ions.',[
 part(F('C','O','O','O',[2,1,1],{1:pair(-90,180),2:neg(-90,0,90),3:neg(0,90,180)}),'Carbonate ion'),
 part(G([A('S',115,95),A('O',35,95,neg(-90,180,90)),A('O',195,95,neg(-90,0,90)),A('O',115,25,pair(180,0)),A('O',115,165,pair(180,0))],[[0,1,1],[0,2,1],[0,3,2],[0,4,2]],'Sulfate ion')),
 part(F('N','O','O','O',[2,1,1],{0:plus,1:pair(-90,180),2:neg(-90,0,90),3:neg(0,90,180)}),'Nitrate ion'),
 part(F('C','NH2','NH2','NH2',[2,1,1],{1:plus,2:pair(-90),3:pair(90)}),'Guanidinium ion'),part(C(['CH2','CH','N(CH3)3'],[2,1],{2:plus}),'A vinyl ammonium ion')]),
 p(38,47,'Resonance','Use the arrow formalism to draw three additional resonance structures for each of the following molecules.',[
 part(L(['H2C','N','N'],[1,2],{0:neg(-90),1:pair(-90),2:pos(0)})),
 part(L(['H3C','N','N','N'],[1,1,2],{1:neg(-90,90),2:pair(-90),3:pos(0)})),
 part(L(['H3C','C','N','N','CH3'],[1,2,1,1],{1:plus,2:pair(-90),3:neg(-90,90)})),
 part(G([A('C',95,100,neg(-90)),A('N',175,100,pair(-90)),A('C',255,100,plus),A('CH3',335,100),A('H3C',45,35),A('H3C',45,160)],[[0,1,1],[1,2,2],[2,3,1],[0,4,1],[0,5,1]],'(CH3)2C negative–N=C positive–CH3')),
 part(G([A('C',95,100,plus),A('N',175,100,pair(0)),A('N',215,35,neg(-90,90)),A('CH3',295,35),A('CH3',220,160),A('H3C',45,35),A('H3C',45,160)],[[0,1,1],[1,2,1],[2,3,1],[1,4,1],[0,5,1],[0,6,1]],'(CH3)2C positive–N(CH3)–N negative–CH3')),
 part(L(['O','N','C','CH3'],[1,2,1],{0:neg(-90,180,90),1:pair(-90),2:plus}))]),
 p(39,48,'Resonance','Draw three resonance structures for each of the following.',formulas('⁻CH₂NO₂','CH₃CO₂CH₃','⁻CH₂CO₂⁻','HOSO₂O⁻')),
 p(42,48,'Resonance','Draw resonance forms for the following cyclic molecules.',[
 part(R(['CH','CH','CH'],[2,1,1],{2:neg(180)})),part(R(['CH','CH','CH','CH','CH','CH','CH'],[2,1,2,1,1,2,1],{4:plus})),
 part(R(['CH2','CH','CH','CH','CH','CH'],[1,2,1,1,2,1],{3:plus}))]),
 p(43,48,'Resonance','Draw resonance forms for the following acyclic molecules.',[
 part(C(['CH2','CH','CH','CH','CH2'],[2,1,1,2],{2:neg(-90)})),part(C(['CH2','CH','CH','CH','CH2'],[2,1,2,1],{4:neg(-90)}))]),
 p(44,48,'Resonance','Ozone (O₃) resembles the molecules in Problem 1.38. Write a Lewis dot structure for ozone and sketch contributing resonance forms. Write one neutral resonance form. Be careful with this last part; the answer is tricky.',[part(C(['O','O','O'],[1,1]))]),
 p(45,48,'Resonance','Draw two resonance structures for each of the compounds shown below.',[
 part((()=>{const g=C(['CH3','CH','CH','C','CH3'],[1,2,1,1]);g.atoms.push(A('O',269,0));g.bonds.push([3,5,2]);return g;})()),part(L(['CH3','N','C','O'],[1,2,2]))]),
 p(48,49,'Formal charges','Add charges to the following molecules where necessary.',['O','N','Br','S'].map(el=>part(R([el,'CH2','H2C'],[1,1,1],{0:pair(180,0)})))),
 p(49,49,'Formal charges','Add charges to the following molecules where necessary.',['O','S','N','P'].flatMap(el=>[
 part(F(el,'CH3','H','', [1,1,1],{0:pair(-90,90)})),
 ...(['O','S'].includes(el)?[part(C(['CH3',el],[1],{1:pair(-90,0,90)})),part(F(el,'CH3','H','H',[1,1,1],{0:pair(90)}))]:[
 part(G([A(el,115,90),A('H3C',35,90),A('H',195,90),A('H',115,25),A('H',115,155)],[[0,1,1],[0,2,1],[0,3,1],[0,4,1]],`CH3${el}H3; no lone pairs shown`)),part(F(el,'CH3','H','H',[1,1,1],{0:pair(90)}))])
 ]).map(item=>{ // Remove the unused fourth arm in the two-coordinate source diagrams.
   if(item.diagram.atoms[3]?.label===''){item.diagram.atoms.pop();item.diagram.bonds.pop();}return item;
 })),
 p(50,49,'Formal charges','Determine the formal charge, if there is one, for each of the nitrogens in the following molecules.',[
 part(R(['N','CH','CH','N','CH','CH'],[2,1,2,1,2,1],{3:pair(90)},[[0,'H']])),
 part(R(['N','CH2','CH2','N','CH2','CH2'],[1,1,1,1,1,1],{0:pair(90),3:pair(-90,90)},[[0,'H']])),
 part(R(['N','CH','N','CH','CH'],[1,2,1,2,1],{0:pair(90)},[[0,'H'],[2,'H']])),
 part(R(['N','C','N','CH','CH'],[1,2,1,2,1],{0:pair(90),2:pair(90)},[[0,'H'],[1,'N',1,pair(-90,90)]]))]),
 p(51,49,'Formal charges','Determine the formal charges, if any, for the molecules shown below.',[
 part(F('Al','H','H','CH3',[1,1,1])),
 part(G([A('Al',115,95),A('H',40,120),A('H',90,25),A('H',145,25),A('CH3',195,120)],[[0,1,1],[0,2,'wedge'],[0,3,'hash'],[0,4,1]],'Al bonded to three H atoms and CH3')),
 part(F('Al','H','H','H',[1,1,1])),part(G([A('Al',115,95),A('H',40,120),A('H',90,25),A('H',145,25),A('H',195,120)],[[0,1,1],[0,2,'wedge'],[0,3,'hash'],[0,4,1]],'Al bonded to four H atoms'))]),
 p(52,49,'Lewis structures','Write Lewis dot structures for the neutral diatomic molecules F₂ and N₂. In F₂, there is a single bond between the two atoms, but in N₂ there is a triple bond between the two atoms.')
];
