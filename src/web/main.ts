import * as THREE from 'three';
import { Simulation } from '../sim/simulation.js';
import { TUNING } from '../sim/tuning.js';
import { defaultInput } from '../sim/input.js';
import type { InputState } from '../sim/types.js';
import { createPlayerMesh } from './player.js';
import { LanternsManager, MotesRenderAdapter, ShadesRenderAdapter } from './adapters.js';
import { HudController } from './hud.js';
import './style.css';

// 1. Root DOM & Renderer setup
const root = document.querySelector<HTMLElement>('#app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
root.append(renderer.domElement);

// 2. Scene, Sky, Fog (#0E1430 / #1B2350)
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0E1430');
scene.fog = new THREE.FogExp2('#1B2350', 0.011);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);

// Lighting
// Ambient light dynamically adjusted by lit / total: 0.15 + 0.55 * (lit / total)
const ambientLight = new THREE.AmbientLight('#FFE9B0', 0.15);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight('#FFE9B0', '#12384A', 0.4);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight('#FFE9B0', 1.2);
moonLight.position.set(25, 45, 18);
scene.add(moonLight);

// 3. Round Island r=40 (sand ring #C9B48A, grass #2F5D50) & Cloud Sea #12384A
const islandGroup = new THREE.Group();

// Sand base cylinder (r=40, height 3, top at y=0)
const sandGeo = new THREE.CylinderGeometry(TUNING.island_radius_night1, TUNING.island_radius_night1 - 2, 3, 96);
const sandMat = new THREE.MeshStandardMaterial({
  color: '#C9B48A',
  roughness: 0.9,
});
const sandMesh = new THREE.Mesh(sandGeo, sandMat);
sandMesh.position.y = -1.5;
islandGroup.add(sandMesh);

// Grass center disc (r=36.5, leaving outer ~3.5m sand ring to edge r=40)
const grassGeo = new THREE.CylinderGeometry(36.5, 36.5, 0.06, 96);
const grassMat = new THREE.MeshStandardMaterial({
  color: '#2F5D50',
  roughness: 0.95,
});
const grassMesh = new THREE.Mesh(grassGeo, grassMat);
grassMesh.position.y = 0.03;
islandGroup.add(grassMesh);

scene.add(islandGroup);

// Cloud sea (#12384A)
const seaGeo = new THREE.PlaneGeometry(1200, 1200);
const seaMat = new THREE.MeshStandardMaterial({
  color: '#12384A',
  roughness: 0.8,
});
const seaMesh = new THREE.Mesh(seaGeo, seaMat);
seaMesh.rotation.x = -Math.PI / 2;
seaMesh.position.y = -3.2;
scene.add(seaMesh);

// 4. Mây (Player) Mesh
const playerMesh = createPlayerMesh();
scene.add(playerMesh.group);

// 5. 5 Great Lanterns Manager
const lanternsManager = new LanternsManager();
scene.add(lanternsManager.group);

// 6. Motes and Shades Render Adapters
const motesAdapter = new MotesRenderAdapter();
scene.add(motesAdapter.group);

const shadesAdapter = new ShadesRenderAdapter();
scene.add(shadesAdapter.group);

// 7. HUD Controller
const hud = new HudController();

// 8. Simulation Instance
let sim = new Simulation(1);
let previousPosition: [number, number, number] = [...sim.player.pos];
let facing: [number, number] = [0, 1];

function resetGame() {
  sim = new Simulation(1);
  cameraYaw = 0;
  previousPosition = [...sim.player.pos];
  facing = [0, 1];
  playerMesh.group.rotation.y = 0;
  clearInput();
  accumulated = 0;
  lastTime = performance.now();
  hud.hideModal();
}
hud.onRestart(resetGame);

// 9. Input & Camera Tracking
const keys = new Set<string>();
let rightMouseDown = false;
let isDraggingMouse = false;
let lastMouseX = 0;
let cameraYaw = 0; // degrees

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

function clearInput(): void {
  keys.clear();
  rightMouseDown = false;
  isDraggingMouse = false;
}
window.addEventListener('blur', clearInput);

// Mouse drag yaw
renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    isDraggingMouse = true;
    lastMouseX = event.clientX;
  } else if (event.button === 2) {
    rightMouseDown = true;
  }
});

window.addEventListener('mousemove', (event) => {
  if (isDraggingMouse) {
    const deltaX = event.clientX - lastMouseX;
    cameraYaw -= deltaX * 0.35;
    lastMouseX = event.clientX;
  }
});

window.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    isDraggingMouse = false;
  } else if (event.button === 2) {
    rightMouseDown = false;
  }
});

renderer.domElement.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const isPressed = (...codes: string[]) => codes.some((code) => keys.has(code));

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// 10. Fixed 60 Hz Sim Stepping with Accumulator
let lastTime = performance.now();
let accumulated = 0;
const fixedStep = 1 / TUNING.ticks_per_second;

document.addEventListener('visibilitychange', () => {
  clearInput();
  accumulated = 0;
  lastTime = performance.now();
});

renderer.setAnimationLoop((now: number) => {
  if (document.hidden) {
    lastTime = now;
    accumulated = 0;
    return;
  }
  const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
  lastTime = now;
  accumulated += dt;

  const moveX = (isPressed('KeyD', 'ArrowRight') ? 1 : 0) - (isPressed('KeyA', 'ArrowLeft') ? 1 : 0);
  const moveZ = (isPressed('KeyS', 'ArrowDown') ? 1 : 0) - (isPressed('KeyW', 'ArrowUp') ? 1 : 0);
  const jump = isPressed('Space');
  const interact = isPressed('KeyE');
  const pulse = isPressed('KeyQ') || rightMouseDown;

  const inputState: InputState = {
    ...defaultInput(),
    cam_yaw_deg: cameraYaw,
    move: [moveX, moveZ],
    jump,
    interact,
    pulse,
  };

  while (accumulated >= fixedStep) {
    previousPosition = [...sim.player.pos];
    sim.step(inputState);
    const dx = sim.player.pos[0] - previousPosition[0];
    const dz = sim.player.pos[2] - previousPosition[2];
    if (Math.hypot(dx, dz) > 0.0001) facing = [dx, dz];
    accumulated -= fixedStep;
  }

  // Sync lanterns from sim state if present
  const simSnapshot = sim.snapshot();
  const renderState = sim as Simulation & {
    lanterns?: Parameters<LanternsManager['syncState']>[0];
    motes?: Parameters<MotesRenderAdapter['update']>[0];
    shades?: Parameters<ShadesRenderAdapter['update']>[0];
  };
  const simLanterns = renderState.lanterns ?? simSnapshot.lanterns;
  const { litCount, totalCount } = lanternsManager.syncState(simLanterns);

  // Dynamic ambient light: 0.15 + 0.55 * (lit / total)
  ambientLight.intensity = 0.15 + 0.55 * (litCount / (totalCount || 5));

  // Sync motes and shades from state arrays (empty now, handled gracefully)
  const elapsedSeconds = now / 1000;
  const simMotes = renderState.motes ?? simSnapshot.motes;
  motesAdapter.update(simMotes, elapsedSeconds);

  const simShades = renderState.shades ?? simSnapshot.shades;
  shadesAdapter.update(simShades, elapsedSeconds);

  // Update Player position and facing
  const alpha = accumulated / fixedStep;
  const playerPos = sim.player.pos.map((value, axis) =>
    previousPosition[axis]! + (value - previousPosition[axis]!) * alpha,
  ) as [number, number, number];
  playerMesh.update(playerPos, facing);

  // Update Third-person Orbit Camera
  const rad = (cameraYaw * Math.PI) / 180;
  const camDistance = 12;
  const camHeight = 7.5;
  camera.position.set(
    playerPos[0] + Math.sin(rad) * camDistance,
    playerPos[1] + camHeight,
    playerPos[2] + Math.cos(rad) * camDistance,
  );
  camera.lookAt(playerPos[0], playerPos[1] + 1.2, playerPos[2]);

  // Update HUD
  hud.update(sim, litCount, totalCount);

  // Render Scene
  renderer.render(scene, camera);
});
