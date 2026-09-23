// Source-authored diagrams: no inferred hydrogens, charges or lone pairs.
// This is essential for exercises that ask the student to supply those details.
const a = (label, x, y, options = {}) => ({ label, x, y, ...options });
export const atom = a;
export const graph = (atoms, bonds, description) => ({ atoms, bonds, description });
export function chain(labels, orders = [], marks = {}) {
  return graph(labels.map((label, i) => a(label, 35 + i * 78, i % 2 ? 65 : 100, marks[i])),
    labels.slice(1).map((_, i) => [i, i + 1, orders[i] || 1]), labels.join('–'));
}
export function fork(center, left, upper, lower, orders = [1, 2, 1], marks = {}) {
  return graph([a(center, 120, 95, marks[0]), a(left, 35, 95, marks[1]),
    a(upper, 174, 40, marks[2]), a(lower, 174, 150, marks[3])],
  [[0, 1, orders[0]], [0, 2, orders[1]], [0, 3, orders[2]]], `${left}–${center} with ${upper} and ${lower}`);
}
export function ring(labels, orders, marks = {}, branches = []) {
  const n = labels.length;
  const atoms = labels.map((label, i) => a(label, 135 + 70 * Math.sin(i * 2 * Math.PI / n),
    110 - 70 * Math.cos(i * 2 * Math.PI / n), marks[i]));
  const bonds = labels.map((_, i) => [i, (i + 1) % n, orders[i] || 1]);
  for (const [i, label, order = 1, options = {}] of branches) {
    const dx = atoms[i].x - 135, dy = atoms[i].y - 110;
    atoms.push(a(label, atoms[i].x + dx * .8, atoms[i].y + dy * .8, options));
    bonds.push([i, atoms.length - 1, order]);
  }
  return graph(atoms, bonds, `${n}-membered ring: ${labels.join(', ')}`);
}
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function labelText(s) {
  return esc(s).replace(/([0-9]+)/g, '<tspan baseline-shift="sub" font-size="12">$1</tspan>');
}
export function structureSvg(g, title = g.description) {
  const xs = g.atoms.map(a => a.x), ys = g.atoms.map(a => a.y);
  const rawWidth = Math.max(...xs) - Math.min(...xs) + 88;
  const rawHeight = Math.max(...ys) - Math.min(...ys) + 76;
  const width = Math.max(230, rawWidth), height = Math.max(175, rawHeight);
  const minX = (Math.min(...xs) + Math.max(...xs) - width) / 2;
  const minY = (Math.min(...ys) + Math.max(...ys) - height) / 2;
  const line = (x1,y1,x2,y2, extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
  let svg = `<svg class="chem-diagram" role="img" aria-label="${esc(title)}" viewBox="${minX} ${minY} ${width} ${height}"><title>${esc(title)}</title><g stroke="currentColor" stroke-width="1.7" fill="none">`;
  for (const [i,j,order=1] of g.bonds) {
    const p=g.atoms[i],q=g.atoms[j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
    const pad = n => n.label ? Math.max(12, Math.abs(ux) * n.label.length * 5.6) : 0;
    const x1=p.x+ux*pad(p),y1=p.y+uy*pad(p),x2=q.x-ux*pad(q),y2=q.y-uy*pad(q);
    if (order === 'wedge') svg+=`<path d="M${x1},${y1} L${x2-uy*5},${y2+ux*5} L${x2+uy*5},${y2-ux*5} Z" fill="currentColor"/>`;
    else if (order === 'hash') {
      for(let k=1;k<=7;k++){const t=k/8,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;svg+=line(x-uy*5*t,y+ux*5*t,x+uy*5*t,y-ux*5*t);}
    } else for(let k=0;k<order;k++){const off=(k-(order-1)/2)*5;svg+=line(x1-uy*off,y1+ux*off,x2-uy*off,y2+ux*off);}
  }
  svg+='</g><g fill="currentColor" font-family="Arial, sans-serif" font-size="19" text-anchor="middle">';
  for(const n of g.atoms){
    // Electron dots belong to the atom, not the center of a condensed label.
    const widths = [...n.label].map(c => /[0-9]/.test(c) ? 6.7 : c === 'l' ? 4.2 : c === 'r' ? 6.3 : 13.3);
    const total = widths.reduce((sum,w) => sum+w,0);
    const anchor = /^(H[0-9]*)+[A-Z]/.test(n.label) ? n.label.search(/[A-GI-Z]/) : 0;
    const electronX = /^[A-Z][a-z]?$/.test(n.label) ? n.x : n.x - total / 2 + widths.slice(0,anchor).reduce((sum,w)=>sum+w,0) + (widths[anchor] || 13.3) / 2;
    svg+=`<text x="${n.x}" y="${n.y+6}">${labelText(n.label)}</text>`;
    if(n.charge) svg+=`<text font-size="15" x="${n.x+(n.chargeSide==='left'?-1:1)*(n.label.length*5+10)}" y="${n.y-15}">${esc(n.charge)}</text>`;
    for(const angle of n.pairs||[]){const r=angle*Math.PI/180,dx=Math.cos(r),dy=Math.sin(r),x=electronX+dx*18,y=n.y+dy*18;
      for(const sign of [-1,1])svg+=`<circle cx="${x-dy*3*sign}" cy="${y+dx*3*sign}" r="1.6"/>`;
    }
    for(const angle of n.dots||[]){const r=angle*Math.PI/180;svg+=`<circle cx="${electronX+18*Math.cos(r)}" cy="${n.y+18*Math.sin(r)}" r="1.6"/>`;}
  }
  return svg+'</g></svg>';
}
export function tetra(top) {
  return graph([a('C',120,90),a(top,120,25),a('Cl',195,115),a('Cl',90,157),a('Cl',45,115)],
    [[0,1,1],[0,2,1],[0,3,'wedge'],[0,4,'hash']], `Tetrahedral ${top==='H'?'chloroform CHCl3':'carbon tetrachloride CCl4'}; solid wedge toward viewer, hashed wedge away`);
}
export const orbitalSvg = `<svg class="chem-diagram" viewBox="0 0 360 140" role="img" aria-label="A carbon 2s orbital next to a carbon 2p orbital, aligned end-on"><title>Carbon 2s and 2p atomic orbitals, aligned end-on</title><g stroke="currentColor" stroke-width="1.5"><circle cx="75" cy="62" r="30" fill="#f4efe7"/><ellipse cx="192" cy="62" rx="38" ry="25" fill="#f4efe7"/><ellipse cx="268" cy="62" rx="38" ry="25" fill="#e2eaf1"/></g><g text-anchor="middle" fill="currentColor" font-family="Arial" font-size="19"><text x="75" y="69">+</text><text x="192" y="69">+</text><text x="268" y="69">−</text><text x="75" y="120">2s</text><text x="230" y="120">2p</text></g></svg>`;
