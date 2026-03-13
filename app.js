import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f1217');

const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 500);
camera.position.set(25, 18, 28);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 10, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(14, 25, 18);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8cb1ff, 0.5);
fillLight.position.set(-12, 10, -12);
scene.add(fillLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64),
  new THREE.MeshStandardMaterial({ color: '#1f2735', roughness: 0.9, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

const state = {
  height: 20,
  radii: [2.8, 2.4, 2.1, 2.6, 2.3, 1.5],
  materialType: 'standard',
  baseColor: '#2d89a8',
  shapes: []
};

const profileSliders = document.querySelector('#profileSliders');
const shapeGroup = new THREE.Group();
scene.add(shapeGroup);

let vaseMesh;

function createMaterial(colorHex) {
  const color = new THREE.Color(colorHex);
  if (state.materialType === 'phong') {
    return new THREE.MeshPhongMaterial({ color, shininess: 95, specular: 0x666666 });
  }
  if (state.materialType === 'toon') {
    return new THREE.MeshToonMaterial({ color });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.12
  });
}

function profilePoints() {
  const pts = [];
  const count = state.radii.length;
  state.radii.forEach((radius, i) => {
    const y = (i / (count - 1)) * state.height;
    pts.push(new THREE.Vector2(Math.max(0.2, radius), y));
  });
  return pts;
}

function rebuildVase() {
  if (vaseMesh) {
    scene.remove(vaseMesh);
    vaseMesh.geometry.dispose();
    vaseMesh.material.dispose();
  }

  const geometry = new THREE.LatheGeometry(profilePoints(), 96);
  const material = createMaterial(state.baseColor);
  vaseMesh = new THREE.Mesh(geometry, material);
  scene.add(vaseMesh);
  rebuildShapes();
}

function radiusAtHeight(y) {
  const clamped = THREE.MathUtils.clamp(y, 0, state.height);
  const t = clamped / state.height;
  const scaled = t * (state.radii.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(state.radii.length - 1, i0 + 1);
  const blend = scaled - i0;
  return THREE.MathUtils.lerp(state.radii[i0], state.radii[i1], blend);
}

function rebuildShapes() {
  while (shapeGroup.children.length > 0) {
    const child = shapeGroup.children.pop();
    child.geometry?.dispose();
    child.material?.dispose();
  }

  state.shapes.forEach((shape) => {
    const y = (shape.heightPct / 100) * state.height;
    const radius = radiusAtHeight(y);
    const mat = createMaterial(shape.color);

    if (shape.type === 'ring') {
      const geo = new THREE.TorusGeometry(radius + shape.size * 0.4, shape.size * 0.25, 18, 80);
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      shapeGroup.add(ring);
      return;
    }

    const pieceGeometry =
      shape.type === 'cube'
        ? new THREE.BoxGeometry(shape.size, shape.size, shape.size)
        : new THREE.SphereGeometry(shape.size * 0.55, 16, 16);

    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + shape.size * 0.45;
      const piece = new THREE.Mesh(pieceGeometry, mat);
      piece.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      shapeGroup.add(piece);
    }
  });
}

function makeProfileSliders() {
  profileSliders.innerHTML = '';
  state.radii.forEach((radius, i) => {
    const row = document.createElement('label');
    const value = document.createElement('span');
    value.textContent = radius.toFixed(2);
    row.textContent = `Point ${i + 1}: `;
    row.append(value);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0.5';
    input.max = '6';
    input.step = '0.05';
    input.value = String(radius);
    input.addEventListener('input', () => {
      state.radii[i] = Number(input.value);
      value.textContent = Number(input.value).toFixed(2);
      rebuildVase();
    });

    row.append(input);
    profileSliders.append(row);
  });
}

function updateSliderLabel(id, value) {
  document.querySelector(`#${id}Value`).textContent = value;
}

document.querySelector('#height').addEventListener('input', (event) => {
  state.height = Number(event.target.value);
  updateSliderLabel('height', state.height);
  rebuildVase();
});

document.querySelector('#segments').addEventListener('input', (event) => {
  const segments = Number(event.target.value);
  updateSliderLabel('segments', segments);
  const current = [...state.radii];
  state.radii = Array.from({ length: segments }, (_, i) => {
    const t = i / (segments - 1);
    const sampled = current[Math.round(t * (current.length - 1))] ?? 2;
    return sampled;
  });
  makeProfileSliders();
  rebuildVase();
});

document.querySelector('#baseColor').addEventListener('input', (event) => {
  state.baseColor = event.target.value;
  rebuildVase();
});

document.querySelector('#materialType').addEventListener('change', (event) => {
  state.materialType = event.target.value;
  rebuildVase();
});

document.querySelector('#shapeSize').addEventListener('input', (event) => {
  document.querySelector('#shapeSizeValue').textContent = Number(event.target.value).toFixed(1);
});

document.querySelector('#shapeHeight').addEventListener('input', (event) => {
  document.querySelector('#shapeHeightValue').textContent = event.target.value;
});

document.querySelector('#addShape').addEventListener('click', () => {
  state.shapes.push({
    type: document.querySelector('#shapeType').value,
    color: document.querySelector('#shapeColor').value,
    size: Number(document.querySelector('#shapeSize').value),
    heightPct: Number(document.querySelector('#shapeHeight').value)
  });
  rebuildShapes();
});

document.querySelector('#clearShapes').addEventListener('click', () => {
  state.shapes = [];
  rebuildShapes();
});

function resize() {
  const { clientWidth, clientHeight } = canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);

function animate() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

makeProfileSliders();
rebuildVase();
animate();
