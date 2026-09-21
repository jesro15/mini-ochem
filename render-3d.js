import * as THREE from "https://esm.sh/three@0.180.0";
import { OrbitControls } from "https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js";
import { ELEMENTS, atomHybridization, expandWithHydrogens } from "./chem-core.js";

function basis(axis) {
  const u = axis.clone().normalize();
  const ref = Math.abs(u.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const v = new THREE.Vector3().crossVectors(u, ref).normalize();
  const w = new THREE.Vector3().crossVectors(u, v).normalize();
  return { u, v, w };
}

function cone(back, angleDeg, count, phaseDeg) {
  if (!count) return [];
  const b = basis(back);
  const theta = THREE.MathUtils.degToRad(angleDeg);
  const phase = THREE.MathUtils.degToRad(phaseDeg || 0);
  const spacing = count === 1 ? 0 : (Math.PI * 2) / Math.max(3, count);

  return Array.from({ length: count }, function (_, i) {
    const phi = phase + i * spacing;
    return b.u.clone().multiplyScalar(Math.cos(theta))
      .add(b.v.clone().multiplyScalar(Math.sin(theta) * Math.cos(phi)))
      .add(b.w.clone().multiplyScalar(Math.sin(theta) * Math.sin(phi)))
      .normalize();
  });
}

function rootDirections(type, count) {
  if (type === "sp") {
    return [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)].slice(0, count);
  }

  if (type === "sp2") {
    return Array.from({ length: count }, function (_, i) {
      const angle = i * Math.PI * 2 / 3;
      return new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    });
  }

  if (type === "bent") {
    const half = THREE.MathUtils.degToRad(104.5 / 2);
    return [
      new THREE.Vector3(Math.cos(half), Math.sin(half), 0),
      new THREE.Vector3(Math.cos(half), -Math.sin(half), 0)
    ].slice(0, count);
  }

  const tetra = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(-1, -1, 1)
  ].map(function (v) { return v.normalize(); });

  if (type === "pyramidal") return tetra.slice(0, Math.min(3, count));
  return tetra.slice(0, count);
}

function geometryType(graph, sourceId) {
  const node = graph.nodes[sourceId];
  const hybrid = atomHybridization(graph, sourceId);
  if (node.el === "O" && hybrid === "sp3") return "bent";
  if (node.el === "N" && hybrid === "sp3") return "pyramidal";
  return hybrid;
}

function childDirections(type, back, count, sourceId) {
  if (!back) return rootDirections(type, count);
  if (type === "sp") return [back.clone().normalize().multiplyScalar(-1)].slice(0, count);
  if (type === "sp2") return cone(back, 120, count, (sourceId % 2) * 180);
  if (type === "bent") return cone(back, 104.5, count, sourceId * 47);
  if (type === "pyramidal") return cone(back, 107, count, sourceId * 61);
  return cone(back, 109.47, count, sourceId * 60);
}

function bondLength(a, b, order) {
  if (a === "H" || b === "H") {
    if (a === "O" || b === "O") return 0.96;
    return 1.09;
  }

  const key = [a, b].sort().join("-");
  if (key === "C-C") return order === 3 ? 1.20 : order === 2 ? 1.34 : 1.54;
  if (key === "C-N") return order === 2 ? 1.30 : 1.47;
  if (key === "C-O") return order === 2 ? 1.23 : 1.43;
  return 1.48;
}

function neighbors(expanded, id) {
  return expanded.bonds
    .filter(function (bond) { return bond.a === id || bond.b === id; })
    .map(function (bond) {
      return { id: bond.a === id ? bond.b : bond.a, order: bond.order };
    });
}

export function idealizedCoordinates(graph) {
  const expanded = expandWithHydrogens(graph);
  const positions = new Map();
  const visited = new Set();
  const root = graph.nodes[0] ? graph.nodes[0].id : 0;

  positions.set(root, new THREE.Vector3(0, 0, 0));

  function walk(id, parentId) {
    visited.add(id);
    const atom = expanded.atoms[id];
    if (atom.isHydrogen) return;

    const current = positions.get(id);
    const back = parentId === null
      ? null
      : positions.get(parentId).clone().sub(current).normalize();

    const children = neighbors(expanded, id)
      .filter(function (n) { return n.id !== parentId && !visited.has(n.id); })
      .sort(function (x, y) {
        return Number(expanded.atoms[x.id].isHydrogen) - Number(expanded.atoms[y.id].isHydrogen);
      });

    const type = geometryType(graph, atom.sourceId);
    const directions = childDirections(type, back, children.length, atom.sourceId);

    children.forEach(function (child, i) {
      const childAtom = expanded.atoms[child.id];
      const direction = directions[i] || rootDirections("sp3", 4)[i % 4];
      const length = bondLength(atom.el, childAtom.el, child.order);
      positions.set(child.id, current.clone().add(direction.clone().multiplyScalar(length)));
      walk(child.id, id);
    });
  }

  walk(root, null);

  expanded.atoms.forEach(function (atom) {
    if (!positions.has(atom.id)) positions.set(atom.id, new THREE.Vector3(atom.id * 1.6, 0, 0));
  });

  const center = Array.from(positions.values())
    .reduce(function (sum, p) { return sum.add(p); }, new THREE.Vector3())
    .divideScalar(Math.max(1, positions.size));

  positions.forEach(function (point) { point.sub(center); });
  return { expanded, positions };
}

function cylinder(start, end, radius, material) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return mesh;
}

function labelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 70;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(255,253,248,.92)";
  ctx.strokeStyle = "rgba(23,23,20,.20)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(8, 8, 164, 54, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#171714";
  ctx.font = "600 25px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 90, 36);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.35, 0.52, 1);
  return sprite;
}

function moleculeGroup(graph) {
  const built = idealizedCoordinates(graph);
  const group = new THREE.Group();
  const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x8c877d, roughness: 0.6 });

  built.expanded.bonds.forEach(function (bond) {
    const start = built.positions.get(bond.a);
    const end = built.positions.get(bond.b);
    const direction = end.clone().sub(start).normalize();
    const reference = Math.abs(direction.y) < 0.8 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const offsetAxis = new THREE.Vector3().crossVectors(direction, reference).normalize();
    const order = Math.max(1, Math.min(3, bond.order));

    for (let i = 0; i < order; i += 1) {
      const shift = (i - (order - 1) / 2) * 0.11;
      const offset = offsetAxis.clone().multiplyScalar(shift);
      group.add(cylinder(
        start.clone().add(offset),
        end.clone().add(offset),
        order === 1 ? 0.065 : 0.047,
        bondMaterial
      ));
    }
  });

  built.expanded.atoms.forEach(function (atom) {
    const p = built.positions.get(atom.id);
    const radius = atom.el === "H" ? 0.20 : 0.31;
    const material = new THREE.MeshStandardMaterial({
      color: ELEMENTS[atom.el] ? ELEMENTS[atom.el].color : 0x777777,
      roughness: 0.42
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 30, 22), material);
    sphere.position.copy(p);
    group.add(sphere);

    if (!atom.isHydrogen) {
      const sprite = labelSprite(atom.el + String(atom.sourceId + 1));
      sprite.position.copy(p).add(new THREE.Vector3(0, radius + 0.42, 0));
      group.add(sprite);
    }
  });

  return { group, positions: built.positions };
}

function ghostOf(source) {
  const clone = source.clone(true);
  clone.traverse(function (object) {
    if (!object.material) return;
    object.material = object.material.clone();
    object.material.transparent = true;
    object.material.opacity = object.isSprite ? 0.10 : 0.13;
    object.material.depthWrite = false;
  });
  return clone;
}

export class Molecule3DView {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    this.camera.position.set(5.5, 4.2, 7.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xbcb4a6, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(5, 7, 8);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.1);
    fill.position.set(-5, 1, -4);
    this.scene.add(fill);

    this.axes = new THREE.AxesHelper(4.2);
    this.axes.visible = false;
    this.scene.add(this.axes);

    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({
        color: 0x7f91c7,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.plane.visible = false;
    this.scene.add(this.plane);

    this.molecule = null;
    this.ghost = null;
    this.clock = new THREE.Clock();
    this.raf = null;
    this.animate();
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate.bind(this));
    this.controls.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  }

  setGraph(graph) {
    if (this.molecule) this.scene.remove(this.molecule);
    if (this.ghost) this.scene.remove(this.ghost);

    const built = moleculeGroup(graph);
    this.molecule = built.group;
    this.ghost = ghostOf(built.group);
    this.ghost.visible = false;

    this.scene.add(this.molecule);
    this.scene.add(this.ghost);

    let maxRadius = 1.5;
    built.positions.forEach(function (p) { maxRadius = Math.max(maxRadius, p.length()); });

    const distance = Math.max(5.2, maxRadius * 3.4);
    this.camera.position.set(distance * 0.72, distance * 0.54, distance);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  mount(element) {
    if (this.renderer.domElement.parentElement !== element) element.prepend(this.renderer.domElement);
    this.resize(element.clientWidth, element.clientHeight || 520);
  }

  resize(width, height) {
    width = Math.max(320, width || 320);
    height = Math.max(380, height || 520);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setNormalMode() {
    if (!this.molecule) return;
    this.molecule.quaternion.identity();
    this.ghost.visible = false;
    this.axes.visible = false;
    this.plane.visible = false;
  }

  setSymmetryMode(axisName, angleDegrees, planeName) {
    if (!this.molecule) return;
    const axes = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1)
    };
    const axis = axes[axisName] || axes.z;

    this.molecule.quaternion.setFromAxisAngle(axis, THREE.MathUtils.degToRad(Number(angleDegrees) || 0));
    this.ghost.visible = true;
    this.axes.visible = true;

    this.plane.visible = planeName && planeName !== "none";
    this.plane.rotation.set(0, 0, 0);
    if (planeName === "xz") this.plane.rotation.x = Math.PI / 2;
    if (planeName === "yz") this.plane.rotation.y = Math.PI / 2;
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
