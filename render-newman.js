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

export function renderNewmanSvg(svg, graph, bond, dihedral) {
  const state = newmanConformation(graph, bond, dihedral);
  const cx = 280;
  const cy = 245;
  const carbonRadius = 51;
  const arm = 125;
  const labelRadius = 158;

  const frontAngles = [90, 210, 330];
  const backAngles = frontAngles.map(function (angle) {
    return angle + state.normalized;
  });

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
