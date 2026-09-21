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

function coordinatesForGeometry(graph, geometry) {
  const built = idealizedCoordinates(graph);

  if (!geometry || !Array.isArray(geometry.atomPositions)) {
    built.source = {
      kind: "idealized",
      label: "Idealized VSEPR / reference bond lengths"
    };
    return built;
  }

  graph.nodes.forEach(function (node) {
    const point = geometry.atomPositions[node.id];
    if (!point || point.length < 3) return;

    built.positions.set(
      node.id,
      new THREE.Vector3(point[0], point[1], point[2])
    );
  });

  graph.nodes.forEach(function (node) {
    const attached =
      geometry.hydrogenPositions &&
      geometry.hydrogenPositions[node.id]
        ? geometry.hydrogenPositions[node.id]
        : [];

    const expandedHydrogens = built.expanded.atoms.filter(function (atom) {
      return atom.isHydrogen && atom.sourceId === node.id;
    });

    expandedHydrogens.forEach(function (atom, index) {
      const point = attached[index];
      if (!point || point.length < 3) return;

      built.positions.set(
        atom.id,
        new THREE.Vector3(point[0], point[1], point[2])
      );
    });
  });

  const center = Array.from(built.positions.values())
    .reduce(function (sum, point) {
      return sum.add(point);
    }, new THREE.Vector3())
    .divideScalar(Math.max(1, built.positions.size));

  built.positions.forEach(function (point) {
    point.sub(center);
  });

  built.source = {
    kind: geometry.kind || "computed",
    label: geometry.source || "Molecule-specific 3D coordinates"
  };

  return built;
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
  canvas.width = 360;
  canvas.height = 86;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(255,253,248,.94)";
  ctx.strokeStyle = "rgba(23,23,20,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(8, 8, 344, 70, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#171714";
  ctx.font = "600 24px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 180, 44);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.25, 0.54, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function angleBetween(a, center, b) {
  const va = a.clone().sub(center);
  const vb = b.clone().sub(center);
  const denom = va.length() * vb.length();
  if (!denom) return null;
  const cosine = THREE.MathUtils.clamp(va.dot(vb) / denom, -1, 1);
  return THREE.MathUtils.radToDeg(Math.acos(cosine));
}

function moleculeGroup(graph, geometry) {
  const built = coordinatesForGeometry(graph, geometry);
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
      const bondMesh = cylinder(
        start.clone().add(offset),
        end.clone().add(offset),
        order === 1 ? 0.065 : 0.047,
        bondMaterial.clone()
      );
      bondMesh.userData = {
        kind: "bond",
        sourceBondId: bond.sourceBondId,
        a: bond.a,
        b: bond.b
      };
      group.add(bondMesh);
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
    sphere.userData = {
      kind: "atom",
      sourceId: atom.sourceId,
      expandedId: atom.id,
      element: atom.el,
      isHydrogen: atom.isHydrogen
    };
    group.add(sphere);
  });

  return {
    group,
    positions: built.positions,
    expanded: built.expanded,
    source: built.source
  };
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
    this.overlayGroup = new THREE.Group();
    this.scene.add(this.overlayGroup);
    this.graph = null;
    this.positions = null;
    this.expanded = null;
    this.geometrySource = null;
    this.hoverHandler = null;
    this.selectHandler = null;
    this.pointerDown = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.raf = null;

    this.renderer.domElement.style.touchAction = "none";

    this.renderer.domElement.addEventListener(
      "pointermove",
      this.handlePointerMove.bind(this)
    );
    this.renderer.domElement.addEventListener(
      "pointerleave",
      this.handlePointerLeave.bind(this)
    );
    this.renderer.domElement.addEventListener(
      "pointerdown",
      this.handlePointerDown.bind(this)
    );
    this.renderer.domElement.addEventListener(
      "pointerup",
      this.handlePointerUp.bind(this)
    );

    this.animate();
  }

  animate() {
    this.raf = requestAnimationFrame(this.animate.bind(this));
    this.controls.update(this.clock.getDelta());
    this.renderer.render(this.scene, this.camera);
  }

  pick(event) {
    if (!this.molecule) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x =
      ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointer.y =
      -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObjects(
      this.molecule.children,
      true
    );

    const hit = hits.find(function (item) {
      return item.object && item.object.userData && item.object.userData.kind;
    });

    return {
      hit: hit ? hit.object.userData : null,
      point: {
        clientX: event.clientX,
        clientY: event.clientY,
        localX: event.clientX - rect.left,
        localY: event.clientY - rect.top
      }
    };
  }

  handlePointerMove(event) {
    if (!this.hoverHandler || event.pointerType === "touch") return;

    const picked = this.pick(event);
    if (!picked) return;
    this.hoverHandler(picked.hit, picked.point);
  }

  handlePointerLeave(event) {
    if (event.pointerType === "touch") return;
    if (this.hoverHandler) this.hoverHandler(null, null);
  }

  handlePointerDown(event) {
    this.pointerDown = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };
  }

  handlePointerUp(event) {
    if (!this.selectHandler || !this.pointerDown) return;

    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    const moved = Math.hypot(dx, dy);
    this.pointerDown = null;

    // Do not turn an orbit/pan gesture into a selection.
    if (moved > 10) return;

    const picked = this.pick(event);
    if (!picked) return;
    this.selectHandler(picked.hit, picked.point);
  }

  setHoverHandler(handler) {
    this.hoverHandler = typeof handler === "function" ? handler : null;
  }

  setSelectHandler(handler) {
    this.selectHandler = typeof handler === "function" ? handler : null;
  }

  setSelection(selection) {
    if (!this.molecule) return;

    this.molecule.traverse(function (object) {
      if (!object.userData || !object.userData.kind || !object.material) return;

      if (object.material.emissive) {
        object.material.emissive.setHex(0x000000);
        object.material.emissiveIntensity = 0;
      }
      object.scale.setScalar(1);

      const atomSelected =
        selection &&
        selection.kind === "atom" &&
        object.userData.kind === "atom" &&
        !object.userData.isHydrogen &&
        object.userData.sourceId === selection.id;

      const bondSelected =
        selection &&
        selection.kind === "bond" &&
        object.userData.kind === "bond" &&
        object.userData.sourceBondId === selection.id;

      if (atomSelected) {
        object.scale.setScalar(1.22);
        if (object.material.emissive) {
          object.material.emissive.setHex(0xffffff);
          object.material.emissiveIntensity = 0.32;
        }
      }

      if (bondSelected && object.material.emissive) {
        object.material.emissive.setHex(0xffffff);
        object.material.emissiveIntensity = 0.42;
      }
    });
  }

  setGraph(graph, geometry) {
    if (this.molecule) this.scene.remove(this.molecule);
    if (this.ghost) this.scene.remove(this.ghost);

    const built = moleculeGroup(graph, geometry);
    this.graph = graph;
    this.molecule = built.group;
    this.positions = built.positions;
    this.expanded = built.expanded;
    this.geometrySource = built.source;
    this.ghost = ghostOf(built.group);
    this.ghost.visible = false;
    this.setSelection(null);

    this.scene.add(this.molecule);
    this.scene.add(this.ghost);

    let maxRadius = 1.5;
    built.positions.forEach(function (p) { maxRadius = Math.max(maxRadius, p.length()); });

    const distance = Math.max(5.2, maxRadius * 3.4);
    this.camera.position.set(distance * 0.72, distance * 0.54, distance);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.setOverlays({});
  }

  clearOverlays() {
    while (this.overlayGroup.children.length) {
      const child = this.overlayGroup.children.pop();
      if (child.material && child.material.map) {
        child.material.map.dispose();
      }
      if (child.material) child.material.dispose();
    }
  }

  setOverlays(overlays) {
    this.clearOverlays();

    if (!this.graph || !this.positions || !this.expanded) return;

    const active = overlays || {};
    const graph = this.graph;
    const positions = this.positions;
    const expanded = this.expanded;

    if (active.hybridization || active.angles) {
      graph.nodes.forEach(function (node) {
        const center = positions.get(node.id);
        if (!center) return;

        const labels = [];

        if (active.hybridization) {
          labels.push(node.el + String(node.id + 1) + " " +
            atomHybridization(graph, node.id));
        }

        if (active.angles) {
          const around = neighbors(expanded, node.id)
            .map(function (neighbor) {
              return positions.get(neighbor.id);
            })
            .filter(Boolean);

          const values = [];
          for (let i = 0; i < around.length; i += 1) {
            for (let j = i + 1; j < around.length; j += 1) {
              const value = angleBetween(around[i], center, around[j]);
              if (Number.isFinite(value)) values.push(value);
            }
          }

          if (values.length) {
            const mean =
              values.reduce(function (sum, value) {
                return sum + value;
              }, 0) / values.length;
            labels.push("∠ " + mean.toFixed(1) + "°");
          }
        }

        if (labels.length) {
          const sprite = labelSprite(labels.join(" · "));
          sprite.position.copy(center).add(new THREE.Vector3(0, 0.62, 0));
          this.overlayGroup.add(sprite);
        }
      }, this);
    }

    if (active.lengths) {
      graph.bonds.forEach(function (bond) {
        const a = positions.get(bond.a);
        const b = positions.get(bond.b);
        if (!a || !b) return;

        const midpoint = a.clone().add(b).multiplyScalar(0.5);
        const value = a.distanceTo(b);
        const sprite = labelSprite(value.toFixed(3) + " Å");
        sprite.scale.set(1.65, 0.46, 1);
        sprite.position.copy(midpoint).add(new THREE.Vector3(0, 0.34, 0));
        this.overlayGroup.add(sprite);
      }, this);
    }
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

  getGeometrySource() {
    return this.geometrySource;
  }

  getPositions() {
    return this.positions;
  }

  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
