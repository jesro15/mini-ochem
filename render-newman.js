import { bondLabel, newmanConformation } from "./chem-core.js";

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function polar(cx, cy, radius, degrees) {
  const radians = degrees * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians)
  };
}

export function projectedNewmanAngles(graph, bond, geometry, dihedral) {
  if (!geometry) return null;
  const state = newmanConformation(graph, bond, dihedral);
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const dot = (a,b) => a.reduce((sum,v,i) => sum+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const n=Math.hypot(...a); return a.map(v=>v/n); };
  const front = geometry.atomPositions[bond.a], back = geometry.atomPositions[bond.b];
  const axis = unit(sub(back, front));
  const x = unit(cross(axis, Math.abs(axis[1]) < 0.9 ? [0,1,0] : [1,0,0]));
  // Screen normal points toward the viewer, opposite the viewing axis.
  const y = cross(x, axis);
  function angles(items, center, id) {
    return items.map(item => {
      const point = item.kind === "H" ? geometry.hydrogenPositions[id]?.[item.hydrogenIndex] : geometry.atomPositions[item.atomId];
      if (!point) return NaN;
      const v = sub(point,center);
      return Math.atan2(dot(v,y),dot(v,x))*180/Math.PI;
    });
  }
  const f = angles(state.front,front,bond.a), b = angles(state.back,back,bond.b);
  if (![...f,...b].every(Number.isFinite)) return null;
  return { front: f.map(a=>a-f[0]+90), back: b.map(a=>a-b[0]+90+state.normalized) };
}

export function renderNewmanSvg(svg, graph, bond, dihedral, geometry) {
  const state = newmanConformation(graph, bond, dihedral);
  const cx = 280;
  const cy = 245;
  const carbonRadius = 51;
  const arm = 125;
  const labelRadius = 158;

  const projected = projectedNewmanAngles(graph, bond, geometry, dihedral);
  const frontAngles = projected?.front || [90, 210, 330];
  const backAngles = projected?.back || frontAngles.map(angle => angle + state.normalized);

  const parts = [
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + carbonRadius + '" fill="#fffdf8" stroke="#171714" stroke-width="3"/>'
  ];

  state.back.slice(0, 3).forEach(function (substituent, index) {
    const angle = backAngles[index];
    const start = polar(cx, cy, carbonRadius, angle);
    const end = polar(cx, cy, arm, angle);
    const text = polar(cx, cy, labelRadius, angle);

    parts.push(
      '<line x1="' + start.x + '" y1="' + start.y + '" x2="' + end.x + '" y2="' + end.y + '" stroke="#777168" stroke-width="4" stroke-linecap="round"/>'
    );
    parts.push(
      '<text x="' + text.x + '" y="' + (text.y + 5) + '" text-anchor="middle" font-size="18" font-weight="650" fill="#171714">' + esc(substituent.label) + '</text>'
    );
  });

  state.front.slice(0, 3).forEach(function (substituent, index) {
    const angle = frontAngles[index];
    const end = polar(cx, cy, arm, angle);
    const text = polar(cx, cy, labelRadius, angle);

    parts.push(
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + end.x + '" y2="' + end.y + '" stroke="#171714" stroke-width="4" stroke-linecap="round"/>'
    );
    parts.push(
      '<text x="' + text.x + '" y="' + (text.y + 5) + '" text-anchor="middle" font-size="18" font-weight="700" fill="#171714">' + esc(substituent.label) + '</text>'
    );
  });

  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#171714"/>');

  const labels = bondLabel(graph, bond).split("–");
  parts.push(
    '<text x="' + cx + '" y="44" text-anchor="middle" font-size="13" letter-spacing="1.5" fill="#777168">FRONT ' +
    esc(labels[0]) + ' → BACK ' + esc(labels[1]) + '</text>'
  );
  parts.push(
    '<text x="' + cx + '" y="470" text-anchor="middle" font-size="17" font-weight="700" fill="#171714">' +
    esc(state.label) + '</text>'
  );

  svg.innerHTML = parts.join("");
  return state;
}
