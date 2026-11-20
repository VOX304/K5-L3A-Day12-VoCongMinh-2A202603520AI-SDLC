import * as THREE from 'three';
import { Simulation } from '../sim/simulation.js';
import { TUNING } from '../sim/tuning.js';
import { defaultInput } from '../sim/input.js';
import './style.css';

const root = document.querySelector<HTMLElement>('#app')!;
const position = document.querySelector<HTMLOutputElement>('#position')!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
root.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0E1430');
scene.fog = new THREE.FogExp2('#1B2350', 0.011);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
scene.add(new THREE.HemisphereLight('#FFE9B0', '#12384A', 2));
const moon = new THREE.DirectionalLight('#FFE9B0', 2);
moon.position.set(15, 30, 10);
scene.add(moon);

const island = new THREE.Mesh(
  new THREE.CylinderGeometry(TUNING.island_radius_night1, TUNING.island_radius_night1 - 2, 3, 96),
  new THREE.MeshStandardMaterial({ color: '#2F5D50', roughness: 0.95 }),
);
island.position.y = -1.5;
scene.add(island);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: '#12384A' }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -3.2;
scene.add(sea);

const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 6, 12), new THREE.MeshStandardMaterial({ color: '#E8E2D0' }));
body.position.y = 0.8;
player.add(body);
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.4, 24), new THREE.MeshStandardMaterial({ color: '#C9B48A' }));
hat.position.y = 1.85;
player.add(hat);
const light = new THREE.PointLight('#FFB347', 8, 6);
light.position.set(0.45, 1.4, 0.4);
player.add(light);
scene.add(player);

const keys = new Set<string>();
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
const pressed = (...codes: string[]) => codes.some((code) => keys.has(code)) ? 1 : 0;

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const sim = new Simulation(1);
let yaw = 0;
let lastTime = performance.now();
let accumulated = 0;
const fixedStep = 1 / TUNING.ticks_per_second;

renderer.setAnimationLoop((now: number) => {
  accumulated += Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;
  while (accumulated >= fixedStep) {
    yaw += (pressed('KeyQ') - pressed('KeyE')) * 1.5;
    sim.step({ ...defaultInput(), cam_yaw_deg: yaw, move: [
      pressed('KeyD', 'ArrowRight') - pressed('KeyA', 'ArrowLeft'),
      pressed('KeyW', 'ArrowUp') - pressed('KeyS', 'ArrowDown'),
    ] });
    accumulated -= fixedStep;
  }
  player.position.set(...sim.player.pos);
  const radians = yaw * Math.PI / 180;
  camera.position.set(player.position.x - Math.sin(radians) * 12, player.position.y + 9, player.position.z - Math.cos(radians) * 12);
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
  const [x, y, z] = sim.player.pos;
  position.textContent = `Mây · (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) m`;
  renderer.render(scene, camera);
});
