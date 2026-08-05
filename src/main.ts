import * as THREE from 'three';
import './style.css';

type UpgradeKind = 'capacity' | 'damage' | 'speed';

interface TreeData {
  group: THREE.Group;
  healthBar: THREE.Group;
  home: THREE.Vector3;
  hp: number;
  alive: boolean;
}

interface GroundLog {
  mesh: THREE.Mesh;
  collecting: boolean;
  settled: boolean;
}

interface StationData {
  group: THREE.Group;
  position: THREE.Vector3;
  pile: THREE.Group;
  stockLabel: THREE.Sprite;
}

interface BuildZoneData {
  group: THREE.Group;
  position: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  label: THREE.Sprite;
  progressFill: THREE.Mesh;
  cost: number;
  paid: number;
  built: boolean;
  paymentClock: number;
}

interface TweenData {
  elapsed: number;
  duration: number;
  update: (progress: number) => void;
  complete?: () => void;
}

interface OfferData {
  wood: number;
  gold: number;
  remaining: number;
  active: boolean;
  cooldown: number;
}

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element as T;
};

const gameRoot = getElement<HTMLDivElement>('game');
const goldCount = getElement<HTMLElement>('gold-count');
const woodCount = getElement<HTMLElement>('wood-count');
const offerButton = getElement<HTMLButtonElement>('offers-button');
const upgradesButton = getElement<HTMLButtonElement>('upgrades-button');
const offerBadge = getElement<HTMLElement>('offer-badge');
const offerPanel = getElement<HTMLElement>('offer-panel');
const upgradePanel = getElement<HTMLElement>('upgrade-panel');
const backdrop = getElement<HTMLElement>('panel-backdrop');
const sellButton = getElement<HTMLButtonElement>('sell-button');
const offerWood = getElement<HTMLElement>('offer-wood');
const offerGold = getElement<HTMLElement>('offer-gold');
const offerTime = getElement<HTMLElement>('offer-time');
const offerStatus = getElement<HTMLElement>('offer-status');
const actionHint = getElement<HTMLElement>('action-hint');
const toast = getElement<HTMLElement>('toast');
const joystick = getElement<HTMLElement>('joystick');
const joystickKnob = getElement<HTMLElement>('joystick-knob');
const mainMenu = getElement<HTMLElement>('main-menu');
const playButton = getElement<HTMLButtonElement>('play-button');
const settingsButton = getElement<HTMLButtonElement>('settings-button');
const settingsPanel = getElement<HTMLElement>('settings-panel');
const settingsBackdrop = getElement<HTMLElement>('settings-backdrop');
const settingsClose = getElement<HTMLButtonElement>('settings-close');
const musicVolume = getElement<HTMLInputElement>('music-volume');
const sfxVolume = getElement<HTMLInputElement>('sfx-volume');
const musicVolumeValue = getElement<HTMLOutputElement>('music-volume-value');
const sfxVolumeValue = getElement<HTMLOutputElement>('sfx-volume-value');

document.body.classList.add('menu-active');
let gameStarted = false;
let settingsOpen = false;

class AudioEngine {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  musicLevel = Number(localStorage.getItem('forest-trader-music') ?? 55) / 100;
  sfxLevel = Number(localStorage.getItem('forest-trader-sfx') ?? 80) / 100;

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.context.destination);
      this.applyLevels();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setMusic(value: number) {
    this.musicLevel = value;
    localStorage.setItem('forest-trader-music', `${Math.round(value * 100)}`);
    this.applyLevels();
  }

  setSfx(value: number) {
    this.sfxLevel = value;
    localStorage.setItem('forest-trader-sfx', `${Math.round(value * 100)}`);
    this.applyLevels();
  }

  private applyLevels() {
    if (!this.context) return;
    this.musicGain?.gain.setTargetAtTime(this.musicLevel * 0.16, this.context.currentTime, 0.04);
    this.sfxGain?.gain.setTargetAtTime(this.sfxLevel * 0.34, this.context.currentTime, 0.025);
  }

  private tone(frequency: number, duration: number, options: { type?: OscillatorType; gain?: number; slide?: number; delay?: number; target?: GainNode | null } = {}) {
    if (!this.context) return;
    const start = this.context.currentTime + (options.delay ?? 0);
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + options.slide), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(options.gain ?? 0.22, start + Math.min(0.025, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(options.target ?? this.sfxGain!);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noise(duration: number, gain: number, cutoff: number) {
    if (!this.context || !this.sfxGain) return;
    const length = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    envelope.gain.setValueAtTime(gain, this.context.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(envelope).connect(this.sfxGain);
    source.start();
  }

  button() { this.tone(520, 0.08, { type: 'sine', gain: 0.12, slide: 120 }); }
  chop() {
    this.noise(0.09, 0.24, 1200);
    this.tone(105, 0.14, { type: 'triangle', gain: 0.3, slide: -34 });
    this.tone(740, 0.055, { type: 'square', gain: 0.045 });
  }
  treeFall() {
    this.noise(0.48, 0.28, 520);
    this.tone(82, 0.5, { type: 'sawtooth', gain: 0.22, slide: -45 });
  }
  pickup() {
    this.tone(440, 0.11, { gain: 0.15, slide: 180 });
    this.tone(710, 0.12, { gain: 0.1, delay: 0.075, slide: 80 });
  }
  logDrop(index = 0) {
    this.tone(145 + index * 18, 0.1, { type: 'triangle', gain: 0.17, slide: -35 });
    this.noise(0.055, 0.08, 420);
  }
  unload() {
    this.tone(190, 0.12, { type: 'triangle', gain: 0.23, slide: -45 });
    this.tone(330, 0.08, { gain: 0.08, delay: 0.045 });
  }
  coin() {
    this.tone(880, 0.1, { gain: 0.14 });
    this.tone(1320, 0.18, { gain: 0.12, delay: 0.08 });
  }

  startMusic() {
    if (!this.context || this.musicTimer !== null) return;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 392];
    const playStep = () => {
      const note = notes[this.musicStep % notes.length];
      this.tone(note, 0.65, { type: 'sine', gain: 0.12, target: this.musicGain });
      if (this.musicStep % 2 === 0) this.tone(note / 2, 1.15, { type: 'triangle', gain: 0.07, target: this.musicGain });
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 680);
  }
}

const audio = new AudioEngine();
musicVolume.value = `${Math.round(audio.musicLevel * 100)}`;
sfxVolume.value = `${Math.round(audio.sfxLevel * 100)}`;
musicVolumeValue.value = musicVolume.value;
sfxVolumeValue.value = sfxVolume.value;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86b95b);
scene.fog = new THREE.Fog(0x86b95b, 30, 58);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
gameRoot.appendChild(renderer.domElement);

const camera = new THREE.OrthographicCamera(-8, 8, 12, -12, 0.1, 100);
const cameraOffset = new THREE.Vector3(10, 16, 13);
const cameraTarget = new THREE.Vector3();

const hemiLight = new THREE.HemisphereLight(0xfff1c6, 0x42612e, 2.2);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xffe5ae, 3.1);
sun.position.set(-14, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 36;
sun.shadow.camera.bottom = -36;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0003;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

interface BirdData {
  group: THREE.Group;
  speed: number;
  phase: number;
  lane: number;
  scale: number;
}

const birds: BirdData[] = [];
const birdMaterial = new THREE.MeshBasicMaterial({ color: 0x233b2c, side: THREE.DoubleSide });
const birdWingGeometry = new THREE.BufferGeometry();
birdWingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, 0, -0.72, 0.08, 0.06, -0.18, 0, 0,
  0, 0, 0, 0.72, 0.08, 0.06, 0.18, 0, 0,
], 3));

for (let index = 0; index < 7; index += 1) {
  const bird = new THREE.Group();
  const wings = new THREE.Mesh(birdWingGeometry, birdMaterial);
  bird.add(wings);
  const scale = 0.42 + (index % 3) * 0.11;
  bird.scale.setScalar(scale);
  bird.position.set(-18 - index * 5.2, 5.4 + (index % 3) * 1.15, -8 + (index % 4) * 5.4);
  scene.add(bird);
  birds.push({ group: bird, speed: 2.3 + (index % 3) * 0.42, phase: index * 0.9, lane: bird.position.z, scale });
}

const updateBirds = (delta: number, elapsed: number) => {
  for (const bird of birds) {
    bird.group.position.x += bird.speed * delta;
    bird.group.position.z = bird.lane + Math.sin(elapsed * 0.32 + bird.phase) * 1.4;
    bird.group.position.y += Math.sin(elapsed * 2.2 + bird.phase) * delta * 0.16;
    bird.group.rotation.z = Math.sin(elapsed * 6.5 + bird.phase) * 0.16;
    bird.group.scale.y = bird.scale * (0.62 + Math.abs(Math.sin(elapsed * 6.5 + bird.phase)) * 0.72);
    if (bird.group.position.x > 25) bird.group.position.x = -25;
  }
};

const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x78ad4f, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(54, 70), grassMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xcfa365, roughness: 1 });
const mainPath = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 68), pathMaterial);
mainPath.rotation.x = -Math.PI / 2;
mainPath.rotation.z = -0.13;
mainPath.position.y = 0.012;
mainPath.receiveShadow = true;
world.add(mainPath);

const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9f5c2d, roughness: 0.85 });
const woodEndMaterial = new THREE.MeshStandardMaterial({ color: 0xe1ad63, roughness: 0.9 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x795029, roughness: 1 });
const darkTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x573a22, roughness: 1 });
const leafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x2d7a3d, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x58a847, roughness: 1 }),
];

const trees: TreeData[] = [];
const treeOccluderMeshes: THREE.Mesh[] = [];
const groundLogs: GroundLog[] = [];
const stations: StationData[] = [];
const buildZones: BuildZoneData[] = [];
const tweens: TweenData[] = [];
const keys = new Set<string>();

const state = {
  gold: 0,
  carried: 0,
  pendingCollection: 0,
  stock: 0,
  capacity: 5,
  damage: 1,
  speed: 4.8,
  levels: { capacity: 1, damage: 1, speed: 1 },
};

const offer: OfferData = {
  wood: 8,
  gold: 20,
  remaining: 45,
  active: true,
  cooldown: 0,
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value: number) => value < 0.5
  ? 4 * value * value * value
  : 1 - Math.pow(-2 * value + 2, 3) / 2;
const easeOutBack = (value: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
};

const addTween = (duration: number, update: (progress: number) => void, complete?: () => void) => {
  tweens.push({ elapsed: 0, duration, update, complete });
};

const makeLogMesh = (scale = 1) => {
  const geometry = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.9 * scale, 8);
  const mesh = new THREE.Mesh(geometry, [woodMaterial, woodEndMaterial, woodEndMaterial]);
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const player = new THREE.Group();
player.position.set(0, 0, -2);
scene.add(player);

const playerVisual = new THREE.Group();
player.add(playerVisual);

const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0xeda948, roughness: 0.8 });
const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x31524b, roughness: 0.9 });
const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xd79b67, roughness: 0.85 });
const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x493022, roughness: 1 });

const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.52, 5, 9), shirtMaterial);
body.position.y = 0.92;
body.castShadow = true;
playerVisual.add(body);

const legs = [-0.17, 0.17].map((x) => {
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.32, 4, 7), pantsMaterial);
  leg.position.set(x, 0.37, 0);
  leg.castShadow = true;
  playerVisual.add(leg);
  return leg;
});

const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 9), skinMaterial);
head.position.y = 1.58;
head.castShadow = true;
playerVisual.add(head);

const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMaterial);
hair.position.y = 1.67;
hair.rotation.x = 0.05;
hair.castShadow = true;
playerVisual.add(hair);

const axePivot = new THREE.Group();
axePivot.position.set(-0.57, 0.94, -0.12);
playerVisual.add(axePivot);
const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.74, 6), trunkMaterial);
axeHandle.position.y = -0.23;
axeHandle.castShadow = true;
axePivot.add(axeHandle);
const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.12), new THREE.MeshStandardMaterial({ color: 0x9ba7a5, roughness: 0.55, metalness: 0.25 }));
axeHead.position.set(0.12, 0.13, 0);
axeHead.rotation.z = -0.24;
axeHead.castShadow = true;
axePivot.add(axeHead);
axePivot.rotation.z = 0.22;

const toolArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 4, 7), skinMaterial);
toolArm.position.set(-0.39, 1.04, -0.1);
toolArm.rotation.z = -0.38;
toolArm.castShadow = true;
playerVisual.add(toolArm);

const toolHand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), skinMaterial);
toolHand.position.set(-0.56, 0.91, -0.12);
toolHand.castShadow = true;
playerVisual.add(toolHand);

const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0.68);
player.add(stackGroup);

const stackMeshes: THREE.Mesh[] = [];

const chopProgress = new THREE.Group();
chopProgress.visible = false;
const chopProgressBack = new THREE.Mesh(
  new THREE.PlaneGeometry(1.22, 0.2),
  new THREE.MeshBasicMaterial({ color: 0x30281f, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false }),
);
const chopProgressFill = new THREE.Mesh(
  new THREE.PlaneGeometry(1.08, 0.12),
  new THREE.MeshBasicMaterial({ color: 0xffd84d, depthTest: false, depthWrite: false }),
);
chopProgressBack.renderOrder = 300;
chopProgressFill.renderOrder = 301;
chopProgressFill.position.z = 0.025;
chopProgressFill.scale.x = 0.001;
chopProgress.add(chopProgressBack, chopProgressFill);
chopProgress.renderOrder = 300;
scene.add(chopProgress);

const rebuildPlayerStack = () => {
  for (const mesh of stackMeshes) stackGroup.remove(mesh);
  stackMeshes.length = 0;
  for (let index = 0; index < state.carried; index += 1) {
    const log = makeLogMesh(0.78);
    log.position.set(0, 0.34 + index * 0.235, 0);
    log.rotation.x = index % 2 === 0 ? 0.025 : -0.025;
    stackGroup.add(log);
    stackMeshes.push(log);
  }
};

const makeTree = (position: THREE.Vector3, variant: number): TreeData => {
  const group = new THREE.Group();
  group.position.copy(position);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.35, 7), trunkMaterial.clone());
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leafMaterial = leafMaterials[variant % leafMaterials.length].clone();
  const layerData = [
    { y: 1.75, radius: 1.12, height: 1.85 },
    { y: 2.45, radius: 0.9, height: 1.65 },
    { y: 3.05, radius: 0.64, height: 1.45 },
  ];
  for (const layer of layerData) {
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(layer.radius, layer.height, 8), leafMaterial);
    leaves.position.y = layer.y;
    leaves.castShadow = true;
    group.add(leaves);
  }

  const healthBar = new THREE.Group();
  healthBar.position.set(0, 4.05, 0);
  healthBar.visible = false;
  const barBack = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.18), new THREE.MeshBasicMaterial({ color: 0x3b2f23 }));
  const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.11), new THREE.MeshBasicMaterial({ color: 0xf1cc45 }));
  barFill.name = 'fill';
  barFill.position.z = 0.01;
  healthBar.add(barBack, barFill);
  group.add(healthBar);

  world.add(group);
  const tree: TreeData = { group, healthBar, home: position.clone(), hp: 3, alive: true };
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child === barBack || child === barFill) return;
    child.userData.tree = tree;
    child.userData.occludable = true;
    const material = child.material as THREE.Material;
    material.transparent = true;
    treeOccluderMeshes.push(child);
  });
  trees.push(tree);
  return tree;
};

const makePurchaseLabel = (paid: number, cost: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(3.65, 2.28, 1);
  sprite.renderOrder = 220;
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  updatePurchaseLabel(sprite, paid, cost);
  return sprite;
};

const updatePurchaseLabel = (sprite: THREE.Sprite, paid: number, cost: number) => {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  const context = sprite.userData.context as CanvasRenderingContext2D;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(246, 224, 168, .97)';
  context.roundRect(18, 18, 476, 284, 42);
  context.fill();
  context.lineWidth = 12;
  context.strokeStyle = '#fff9df';
  context.stroke();
  context.lineWidth = 5;
  context.strokeStyle = '#8c552e';
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#5c3a24';
  context.font = '900 43px system-ui';
  context.fillText('KÜTÜK İSTASYONU', 256, 76);
  context.fillStyle = '#fff4c9';
  context.roundRect(106, 117, 300, 93, 30);
  context.fill();
  context.fillStyle = '#3d6936';
  context.font = '1000 66px system-ui';
  context.fillText(`${paid} / ${cost}`, 256, 165);
  context.fillStyle = '#9a5f20';
  context.beginPath();
  context.arc(196, 254, 23, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#fff2a8';
  context.font = '1000 30px system-ui';
  context.fillText('G', 196, 254);
  context.fillStyle = '#6f4829';
  context.font = '900 35px system-ui';
  context.fillText('GOLD', 282, 255);
  const material = sprite.material as THREE.SpriteMaterial;
  if (material.map) material.map.needsUpdate = true;
};

const makeStationStockLabel = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(1.85, 0.8, 1);
  sprite.renderOrder = 210;
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  return sprite;
};

const updateStationStockLabel = (sprite: THREE.Sprite, stock: number) => {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  const context = sprite.userData.context as CanvasRenderingContext2D;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(255, 247, 213, .96)';
  context.roundRect(10, 10, 236, 92, 30);
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = '#87502b';
  context.stroke();
  context.fillStyle = '#a45a2a';
  context.font = '1000 42px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(`ODUN  ${stock}`, 128, 56);
  const material = sprite.material as THREE.SpriteMaterial;
  if (material.map) material.map.needsUpdate = true;
};

const addBox = (parent: THREE.Group, size: THREE.Vector3, position: THREE.Vector3, material: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

const createStation = (position: THREE.Vector3, animate = false) => {
  const group = new THREE.Group();
  group.position.copy(position);

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b278, roughness: 1 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x577b42, roughness: 0.9 });
  addBox(group, new THREE.Vector3(4.3, 0.22, 3.1), new THREE.Vector3(0, 0.11, 0), platformMaterial);
  addBox(group, new THREE.Vector3(0.2, 2.55, 0.2), new THREE.Vector3(-1.7, 1.28, -1.15), darkTrunkMaterial);
  addBox(group, new THREE.Vector3(0.2, 2.55, 0.2), new THREE.Vector3(1.7, 1.28, -1.15), darkTrunkMaterial);
  addBox(group, new THREE.Vector3(3.9, 0.25, 1.12), new THREE.Vector3(0, 2.48, -1.02), roofMaterial).rotation.x = -0.08;

  const pile = new THREE.Group();
  pile.position.set(0, 0.2, 0.45);
  group.add(pile);

  const stockLabel = makeStationStockLabel();
  stockLabel.position.set(0, 1.36, 1.12);
  group.add(stockLabel);

  const deliveryRing = new THREE.Mesh(
    new THREE.RingGeometry(2.82, 3.06, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe18c, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  deliveryRing.rotation.x = -Math.PI / 2;
  deliveryRing.position.y = 0.035;
  group.add(deliveryRing);

  world.add(group);
  const station = { group, position: position.clone(), pile, stockLabel };
  stations.push(station);
  if (animate) {
    group.scale.setScalar(0.02);
    addTween(0.75, (progress) => group.scale.setScalar(easeOutBack(progress)));
  }
  rebuildStationPiles();
  return station;
};

const rebuildStationPiles = () => {
  for (const station of stations) {
    station.pile.clear();
    updateStationStockLabel(station.stockLabel, state.stock);
    const visibleLogs = Math.min(state.stock, 16);
    for (let index = 0; index < visibleLogs; index += 1) {
      const log = makeLogMesh(0.78);
      const column = index % 4;
      const row = Math.floor(index / 4);
      log.position.set(-0.85 + column * 0.56, 0.22 + row * 0.28, 0);
      station.pile.add(log);
    }
  }
};

const createBuildZone = (position: THREE.Vector3, spawnOffset: THREE.Vector3, cost: number) => {
  const group = new THREE.Group();
  group.position.copy(position);
  const padSize = 2.85;
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize, padSize),
    new THREE.MeshBasicMaterial({ color: 0xf6d873, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.035;
  group.add(pad);

  const progressFill = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize - 0.18, padSize - 0.18),
    new THREE.MeshBasicMaterial({ color: 0x70b84f, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
  );
  progressFill.rotation.x = -Math.PI / 2;
  progressFill.position.set(-(padSize - 0.18) / 2, 0.045, 0);
  progressFill.scale.x = 0.001;
  group.add(progressFill);

  const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 });
  const edge = padSize + 0.1;
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, -edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(edge / 2, 0.075, 0), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(-edge / 2, 0.075, 0), borderMaterial);

  const label = makePurchaseLabel(0, cost);
  label.position.set(0, 1.62, -1.05);
  group.add(label);
  world.add(group);
  buildZones.push({
    group,
    position: position.clone(),
    spawnPosition: position.clone().add(spawnOffset),
    label,
    progressFill,
    cost,
    paid: 0,
    built: false,
    paymentClock: 0,
  });
};

const seededRandom = (() => {
  let seed = 47821;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
})();

const isClearForTree = (position: THREE.Vector3) => {
  if (Math.abs(position.x + position.z * 0.13) < 3.8) return false;
  if (position.distanceTo(new THREE.Vector3(0, 0, 5)) < 5.1) return false;
  const reserved = [new THREE.Vector3(12, 0, -15), new THREE.Vector3(-13, 0, -9), new THREE.Vector3(-10, 0, 20)];
  if (!reserved.every((point) => position.distanceTo(point) > 3.7)) return false;
  return trees.every((tree) => position.distanceTo(tree.group.position) > 2.55);
};

for (let index = 0; index < 90; index += 1) {
  let position = new THREE.Vector3();
  let attempts = 0;
  do {
    position = new THREE.Vector3((seededRandom() - 0.5) * 48, 0, (seededRandom() - 0.5) * 62);
    attempts += 1;
  } while (!isClearForTree(position) && attempts < 180);
  if (isClearForTree(position)) makeTree(position, index);
}

const createRock = (position: THREE.Vector3, scale: number) => {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x7f8374, roughness: 1, flatShading: true }),
  );
  rock.position.copy(position);
  rock.position.y = scale * 0.55;
  rock.scale.y = 0.72;
  rock.rotation.set(seededRandom(), seededRandom() * Math.PI, seededRandom());
  rock.castShadow = true;
  rock.receiveShadow = true;
  world.add(rock);
};

for (let index = 0; index < 28; index += 1) {
  const position = new THREE.Vector3((seededRandom() - 0.5) * 48, 0, (seededRandom() - 0.5) * 63);
  if (Math.abs(position.x + position.z * 0.13) > 4) createRock(position, 0.25 + seededRandom() * 0.38);
}

createStation(new THREE.Vector3(0, 0, 5));
createBuildZone(new THREE.Vector3(12, 0, -15), new THREE.Vector3(-2.8, 0, 0.4), 5);
createBuildZone(new THREE.Vector3(-13, 0, -9), new THREE.Vector3(2.8, 0, 0.4), 5);
createBuildZone(new THREE.Vector3(-10, 0, 20), new THREE.Vector3(2.8, 0, -0.4), 5);

const spawnParticles = (position: THREE.Vector3, color: number, count: number) => {
  for (let index = 0; index < count; index += 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true });
    const particle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);
    const start = position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const velocity = new THREE.Vector3((seededRandom() - 0.5) * 2.1, 1.2 + seededRandom(), (seededRandom() - 0.5) * 2.1);
    particle.position.copy(start);
    scene.add(particle);
    addTween(0.55, (progress) => {
      particle.position.copy(start).addScaledVector(velocity, progress);
      particle.position.y -= 2.2 * progress * progress;
      particle.rotation.x += 0.2;
      material.opacity = 1 - progress;
    }, () => {
      scene.remove(particle);
      particle.geometry.dispose();
      material.dispose();
    });
  }
};

const updateTreeHealthBar = (tree: TreeData) => {
  const fill = tree.healthBar.getObjectByName('fill');
  if (!fill) return;
  const ratio = Math.max(0, tree.hp / 3);
  fill.scale.x = ratio;
  fill.position.x = -(1.05 * (1 - ratio)) / 2;
  tree.healthBar.visible = tree.alive && tree.hp < 3;
};

const spawnFallenLogs = (treePosition: THREE.Vector3) => {
  for (let index = 0; index < 3; index += 1) {
    const mesh = makeLogMesh(0.94);
    const angle = (index / 3) * Math.PI * 2 + seededRandom() * 0.55;
    const start = treePosition.clone().add(new THREE.Vector3(0, 1.1, 0));
    const target = treePosition.clone().add(new THREE.Vector3(Math.cos(angle) * (0.7 + seededRandom() * 0.65), 0.22, Math.sin(angle) * (0.7 + seededRandom() * 0.65)));
    mesh.position.copy(start);
    mesh.scale.setScalar(0.7);
    scene.add(mesh);
    const groundLog: GroundLog = { mesh, collecting: false, settled: false };
    groundLogs.push(groundLog);
    addTween(0.5 + index * 0.07, (progress) => {
      const eased = easeOutCubic(progress);
      mesh.position.lerpVectors(start, target, eased);
      mesh.position.y += Math.sin(progress * Math.PI) * 0.9;
      mesh.rotation.y = angle + progress * 1.8;
      mesh.scale.setScalar(0.7 + 0.3 * eased);
    }, () => {
      groundLog.settled = true;
      audio.logDrop(index);
      bounceGroup(mesh);
    });
  }
};

const fellTree = (tree: TreeData) => {
  tree.alive = false;
  audio.treeFall();
  tree.healthBar.visible = false;
  const treePosition = tree.group.position.clone();
  const away = treePosition.clone().sub(player.position);
  tree.group.rotation.y = Math.atan2(away.x, away.z);
  spawnParticles(treePosition, 0x78b94e, 9);
  addTween(0.62, (progress) => {
    tree.group.rotation.z = -easeInOutCubic(progress) * Math.PI * 0.48;
  }, () => {
    spawnFallenLogs(treePosition);
    world.remove(tree.group);
    window.setTimeout(() => {
      tree.hp = 3;
      tree.alive = true;
      tree.group.position.copy(tree.home);
      tree.group.rotation.set(0, 0, 0);
      tree.group.scale.setScalar(0.04);
      world.add(tree.group);
      addTween(0.75, (progress) => tree.group.scale.setScalar(easeOutBack(progress)));
    }, 12000);
  });
};

let chopClock = 0;
const chopDuration = 1;

const hitTree = (tree: TreeData) => {
  if (!tree.alive) return;
  audio.chop();
  tree.hp = Math.max(0, tree.hp - state.damage);
  updateTreeHealthBar(tree);
  spawnParticles(tree.group.position, 0xc99248, 5);
  const startingRotation = tree.group.rotation.z;
  addTween(0.22, (progress) => {
    tree.group.rotation.z = startingRotation + Math.sin(progress * Math.PI) * 0.085;
  }, () => { if (tree.alive) tree.group.rotation.z = startingRotation; });
  if (tree.hp <= 0) fellTree(tree);
};

const collectLog = (log: GroundLog) => {
  if (!log.settled || log.collecting || state.carried + state.pendingCollection >= state.capacity) return;
  log.collecting = true;
  state.pendingCollection += 1;
  const stackIndex = state.carried + state.pendingCollection - 1;
  const start = log.mesh.position.clone();
  const startScale = log.mesh.scale.clone();
  addTween(0.48, (progress) => {
    const target = new THREE.Vector3(0, 0.34 + stackIndex * 0.235, 0.75);
    player.localToWorld(target);
    log.mesh.position.lerpVectors(start, target, easeOutCubic(progress));
    log.mesh.position.y += Math.sin(progress * Math.PI) * 1.05;
    log.mesh.rotation.y += 0.18;
    log.mesh.scale.copy(startScale).multiplyScalar(1 + Math.sin(progress * Math.PI) * 0.18);
  }, () => {
    scene.remove(log.mesh);
    const index = groundLogs.indexOf(log);
    if (index >= 0) groundLogs.splice(index, 1);
    state.pendingCollection -= 1;
    state.carried += 1;
    audio.pickup();
    rebuildPlayerStack();
    updateUI();
    bounceGroup(stackGroup);
  });
};

const bounceGroup = (group: THREE.Object3D) => {
  addTween(0.22, (progress) => {
    const scale = 1 + Math.sin(progress * Math.PI) * 0.12;
    group.scale.set(scale, scale, scale);
  }, () => group.scale.setScalar(1));
};

let unloadClock = 0;
const unloadOneLog = (station: StationData) => {
  if (state.carried <= 0 || stackMeshes.length === 0) return;
  const topLog = stackMeshes[stackMeshes.length - 1];
  const start = new THREE.Vector3();
  topLog.getWorldPosition(start);
  state.carried -= 1;
  rebuildPlayerStack();

  const flyingLog = makeLogMesh(0.78);
  flyingLog.position.copy(start);
  scene.add(flyingLog);
  const target = station.position.clone().add(new THREE.Vector3(
    ((state.stock % 4) - 1.5) * 0.46,
    0.42 + Math.floor((state.stock % 16) / 4) * 0.24,
    -0.2,
  ));
  addTween(0.34, (progress) => {
    flyingLog.position.lerpVectors(start, target, easeInOutCubic(progress));
    flyingLog.position.y += Math.sin(progress * Math.PI) * 0.95;
    flyingLog.rotation.y += 0.25;
  }, () => {
    scene.remove(flyingLog);
    state.stock += 1;
    audio.unload();
    rebuildStationPiles();
    updateUI();
    bounceGroup(station.pile);
  });
  updateUI();
};

const upgradeCosts = () => ({
  capacity: 15 + (state.levels.capacity - 1) * 15,
  damage: 25 + (state.levels.damage - 1) * 25,
  speed: 20 + (state.levels.speed - 1) * 18,
});

const buyUpgrade = (kind: UpgradeKind) => {
  const costs = upgradeCosts();
  const cost = costs[kind];
  if (state.gold < cost) {
    showToast('Yeterli gold yok');
    return;
  }
  state.gold -= cost;
  audio.coin();
  state.levels[kind] += 1;
  if (kind === 'capacity') state.capacity += 2;
  if (kind === 'damage') state.damage += 1;
  if (kind === 'speed') state.speed *= 1.12;
  updateUI();
  showToast('Geliştirme satın alındı!');
};

const updateUI = () => {
  goldCount.textContent = `${state.gold}`;
  woodCount.textContent = `${state.carried}/${state.capacity} · ${state.stock}`;
  offerWood.textContent = `${offer.wood}`;
  offerGold.textContent = `${offer.gold}`;
  const time = Math.max(0, Math.ceil(offer.remaining));
  offerTime.textContent = `00:${time.toString().padStart(2, '0')}`;
  offerStatus.textContent = `İstasyon stoğu: ${state.stock} / ${offer.wood}`;
  sellButton.disabled = !offer.active || state.stock < offer.wood;
  sellButton.textContent = offer.active ? 'Stoğu sat' : 'Yeni teklif bekleniyor';
  offerBadge.classList.toggle('hidden', !offer.active);

  const costs = upgradeCosts();
  getElement<HTMLElement>('capacity-value').textContent = `${state.capacity} → ${state.capacity + 2}`;
  getElement<HTMLElement>('damage-value').textContent = `${state.damage} → ${state.damage + 1}`;
  getElement<HTMLElement>('speed-value').textContent = `${Math.round((state.speed / 4.8) * 100)}% → ${Math.round((state.speed * 1.12 / 4.8) * 100)}%`;
  getElement<HTMLElement>('capacity-cost').textContent = `${costs.capacity} ●`;
  getElement<HTMLElement>('damage-cost').textContent = `${costs.damage} ●`;
  getElement<HTMLElement>('speed-cost').textContent = `${costs.speed} ●`;
  document.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => {
    const kind = button.dataset.upgrade as UpgradeKind;
    button.disabled = state.gold < costs[kind];
  });
};

let toastTimer = 0;
const showToast = (message: string) => {
  toast.textContent = message;
  toast.classList.remove('hidden');
  toastTimer = 2;
};

const openPanel = (panel: HTMLElement) => {
  audio.button();
  offerPanel.classList.add('hidden');
  upgradePanel.classList.add('hidden');
  panel.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  joystickInput.set(0, 0);
  joystickPointer = null;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
  joystick.classList.remove('active');
};

const closePanels = () => {
  offerPanel.classList.add('hidden');
  upgradePanel.classList.add('hidden');
  backdrop.classList.add('hidden');
};

const isPanelOpen = () => !backdrop.classList.contains('hidden') || settingsOpen;

const openSettings = async () => {
  await audio.unlock();
  audio.button();
  settingsOpen = true;
  settingsPanel.classList.remove('hidden');
  settingsBackdrop.classList.remove('hidden');
  joystickInput.set(0, 0);
  joystickPointer = null;
  joystick.classList.remove('active');
};

const closeSettings = () => {
  audio.button();
  settingsOpen = false;
  settingsPanel.classList.add('hidden');
  settingsBackdrop.classList.add('hidden');
};

settingsButton.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsBackdrop.addEventListener('click', closeSettings);

musicVolume.addEventListener('input', () => {
  musicVolumeValue.value = musicVolume.value;
  audio.setMusic(Number(musicVolume.value) / 100);
});
sfxVolume.addEventListener('input', () => {
  sfxVolumeValue.value = sfxVolume.value;
  audio.setSfx(Number(sfxVolume.value) / 100);
});

playButton.addEventListener('click', async () => {
  await audio.unlock();
  audio.button();
  audio.startMusic();
  gameStarted = true;
  playButton.querySelector('b')!.textContent = 'DEVAM ET';
  mainMenu.classList.add('leaving');
  document.body.classList.remove('menu-active');
});

offerButton.addEventListener('click', () => openPanel(offerPanel));
upgradesButton.addEventListener('click', () => openPanel(upgradePanel));
backdrop.addEventListener('click', closePanels);
document.querySelectorAll<HTMLButtonElement>('.close-panel').forEach((button) => button.addEventListener('click', closePanels));
document.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => {
  button.addEventListener('click', () => buyUpgrade(button.dataset.upgrade as UpgradeKind));
});

sellButton.addEventListener('click', () => {
  if (!offer.active || state.stock < offer.wood) return;
  state.stock -= offer.wood;
  state.gold += offer.gold;
  audio.coin();
  offer.active = false;
  offer.cooldown = 4;
  rebuildStationPiles();
  updateUI();
  closePanels();
  showToast(`Teklif tamamlandı: +${offer.gold} gold`);
});

const generateOffer = () => {
  const options = [5, 6, 8, 10];
  offer.wood = options[Math.floor(seededRandom() * options.length)];
  offer.gold = Math.round(offer.wood * (2.4 + seededRandom() * 0.8));
  offer.remaining = 45;
  offer.active = true;
  offer.cooldown = 0;
  updateUI();
  showToast('Yeni teklif geldi!');
};

const joystickInput = new THREE.Vector2();
let joystickPointer: number | null = null;
let joystickCenter = new THREE.Vector2();

const updateJoystick = (event: PointerEvent) => {
  const radius = 42;
  const delta = new THREE.Vector2(event.clientX - joystickCenter.x, event.clientY - joystickCenter.y);
  if (delta.length() > radius) delta.setLength(radius);
  joystickInput.set(delta.x / radius, -delta.y / radius);
  joystickKnob.style.transform = `translate(calc(-50% + ${delta.x}px), calc(-50% + ${delta.y}px))`;
};

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (isPanelOpen() || joystickPointer !== null) return;
  joystickPointer = event.pointerId;
  joystickCenter = new THREE.Vector2(event.clientX, event.clientY);
  joystick.style.left = `${event.clientX}px`;
  joystick.style.top = `${event.clientY}px`;
  joystick.classList.add('active');
  renderer.domElement.setPointerCapture(event.pointerId);
  joystickInput.set(0, 0);
  joystickKnob.style.transform = 'translate(-50%, -50%)';
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (joystickPointer === event.pointerId) updateJoystick(event);
});
const releaseJoystick = (event: PointerEvent) => {
  if (joystickPointer !== event.pointerId) return;
  joystickPointer = null;
  joystickInput.set(0, 0);
  joystickKnob.style.transform = 'translate(-50%, -50%)';
  joystick.classList.remove('active');
};
renderer.domElement.addEventListener('pointerup', releaseJoystick);
renderer.domElement.addEventListener('pointercancel', releaseJoystick);

window.addEventListener('keydown', (event) => keys.add(event.code));
window.addEventListener('keyup', (event) => keys.delete(event.code));

const getMovementInput = () => {
  const input = joystickInput.clone();
  if (keys.has('KeyA') || keys.has('ArrowLeft')) input.x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) input.x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) input.y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) input.y -= 1;
  if (input.length() > 1) input.normalize();
  return isPanelOpen() ? input.set(0, 0) : input;
};

const movementForward = new THREE.Vector3(-cameraOffset.x, 0, -cameraOffset.z).normalize();
const movementRight = new THREE.Vector3(-movementForward.z, 0, movementForward.x);
const desiredMovement = new THREE.Vector3();
let playerRotation = 0;
let walkTime = 0;

const nearestTreeInRange = () => {
  let result: TreeData | null = null;
  let bestDistance = 2.1;
  for (const tree of trees) {
    if (!tree.alive) continue;
    const distance = player.position.distanceTo(tree.group.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      result = tree;
    }
  }
  return result;
};

const collidesAt = (position: THREE.Vector3) => {
  for (const tree of trees) {
    if (tree.alive && position.distanceToSquared(tree.group.position) < 0.68 * 0.68) return true;
  }
  return false;
};

const updatePlayer = (delta: number) => {
  const input = getMovementInput();
  desiredMovement.set(0, 0, 0)
    .addScaledVector(movementRight, input.x)
    .addScaledVector(movementForward, input.y);
  const isMoving = desiredMovement.lengthSq() > 0.001;

  if (isMoving) {
    desiredMovement.normalize();
    const nextPosition = player.position.clone().addScaledVector(desiredMovement, state.speed * delta);
    nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -25, 25);
    nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -33, 33);
    if (!collidesAt(nextPosition)) player.position.copy(nextPosition);
    const targetRotation = Math.atan2(-desiredMovement.x, -desiredMovement.z);
    let difference = targetRotation - playerRotation;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    playerRotation += difference * Math.min(1, delta * 12);
    player.rotation.y = playerRotation;
    walkTime += delta * 10;
    playerVisual.position.y = Math.abs(Math.sin(walkTime)) * 0.055;
    legs[0].rotation.x = Math.sin(walkTime) * 0.35;
    legs[1].rotation.x = -Math.sin(walkTime) * 0.35;
    chopClock = 0;
    chopProgress.visible = false;
    axePivot.rotation.z = THREE.MathUtils.lerp(axePivot.rotation.z, 0.22, delta * 12);
  } else {
    playerVisual.position.y = THREE.MathUtils.lerp(playerVisual.position.y, 0, delta * 10);
    legs[0].rotation.x = THREE.MathUtils.lerp(legs[0].rotation.x, 0, delta * 10);
    legs[1].rotation.x = THREE.MathUtils.lerp(legs[1].rotation.x, 0, delta * 10);
    const nearest = nearestTreeInRange();
    if (nearest) {
      const direction = nearest.group.position.clone().sub(player.position);
      const targetRotation = Math.atan2(-direction.x, -direction.z);
      let difference = targetRotation - playerRotation;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      playerRotation += difference * Math.min(1, delta * 12);
      player.rotation.y = playerRotation;
      chopClock += delta;
      const chopRatio = Math.min(1, chopClock / chopDuration);
      chopProgress.visible = true;
      chopProgress.position.copy(player.position).add(new THREE.Vector3(0, 2.18, 0));
      chopProgress.quaternion.copy(camera.quaternion);
      chopProgressFill.scale.x = Math.max(0.001, chopRatio);
      chopProgressFill.position.x = -0.54 * (1 - chopRatio);
      if (chopRatio < 0.65) {
        axePivot.rotation.z = THREE.MathUtils.lerp(0.22, 0.98, easeInOutCubic(chopRatio / 0.65));
      } else {
        axePivot.rotation.z = THREE.MathUtils.lerp(0.98, -1.22, easeInOutCubic((chopRatio - 0.65) / 0.35));
      }
      if (chopClock >= chopDuration) {
        chopClock -= chopDuration;
        hitTree(nearest);
      }
    } else {
      chopClock = 0;
      chopProgress.visible = false;
      axePivot.rotation.z = THREE.MathUtils.lerp(axePivot.rotation.z, 0.22, delta * 12);
    }
  }

  const stackSway = isMoving ? -0.1 : 0.025;
  stackGroup.rotation.x = THREE.MathUtils.lerp(stackGroup.rotation.x, stackSway, delta * 7);

};

let collectionCooldown = 0;
const updateCollection = (delta: number) => {
  collectionCooldown = Math.max(0, collectionCooldown - delta);
  if (collectionCooldown > 0 || groundLogs.some((log) => log.collecting)) return;
  const nextLog = groundLogs
    .filter((log) => log.settled && !log.collecting && log.mesh.position.distanceTo(player.position) < 1.65)
    .sort((a, b) => a.mesh.position.distanceToSquared(player.position) - b.mesh.position.distanceToSquared(player.position))[0];
  if (!nextLog) return;
  collectLog(nextLog);
  collectionCooldown = 0.12;
};

const updateStations = (delta: number) => {
  let nearest: StationData | null = null;
  for (const station of stations) {
    if (station.position.distanceTo(player.position) < 3.05) {
      nearest = station;
      break;
    }
  }
  if (nearest && state.carried > 0) {
    unloadClock += delta;
    if (unloadClock >= 0.2) {
      unloadClock = 0;
      unloadOneLog(nearest);
    }
  } else {
    unloadClock = 0;
  }
};

const finishBuildZone = (zone: BuildZoneData) => {
  zone.built = true;
  world.remove(zone.group);
  spawnParticles(zone.spawnPosition, 0xf2d06b, 16);
  createStation(zone.spawnPosition, true);
  audio.coin();
  showToast('Yeni odun istasyonu kuruldu!');
};

const updateBuildZones = (delta: number) => {
  for (const zone of buildZones) {
    if (zone.built) continue;
    const distance = zone.position.distanceTo(player.position);
    if (distance < 1.45 && zone.paid < zone.cost && state.gold > 0) {
      zone.paymentClock += delta;
      if (zone.paymentClock >= 0.32) {
        zone.paymentClock = 0;
        state.gold -= 1;
        zone.paid += 1;
        const ratio = zone.paid / zone.cost;
        zone.progressFill.scale.x = Math.max(0.001, ratio);
        zone.progressFill.position.x = -1.335 * (1 - ratio);
        updatePurchaseLabel(zone.label, zone.paid, zone.cost);
        bounceGroup(zone.group);
        updateUI();
        if (zone.paid >= zone.cost) finishBuildZone(zone);
      }
    } else {
      zone.paymentClock = 0;
    }
  }
};

const updateContextHint = () => {
  let message = '';
  const nearbyZone = buildZones.find((zone) => !zone.built && zone.position.distanceTo(player.position) < 1.8);
  const nearbyStation = stations.find((station) => station.position.distanceTo(player.position) < 3.15);
  const nearbyGroundLog = groundLogs.some((log) => !log.collecting && log.mesh.position.distanceTo(player.position) < 1.6);
  if (nearbyZone) {
    message = nearbyZone.paid >= nearbyZone.cost
      ? 'İstasyon kuruluyor…'
      : state.gold > 0
        ? `İnşa için bekle · ${nearbyZone.paid}/${nearbyZone.cost} gold`
        : `İstasyon maliyeti ${nearbyZone.cost} gold`;
  } else if (nearbyStation && state.carried > 0) {
    message = 'Odunlar istasyona bırakılıyor…';
  } else if (nearbyGroundLog && state.carried + state.pendingCollection >= state.capacity) {
    message = 'Taşıma kapasitesi dolu';
  }
  actionHint.textContent = message;
  actionHint.classList.toggle('hidden', message.length === 0);
};

const updateOffer = (delta: number) => {
  if (offer.active) {
    offer.remaining -= delta;
    if (offer.remaining <= 0) {
      offer.active = false;
      offer.cooldown = 3;
      closePanels();
      showToast('Teklifin süresi doldu');
    }
  } else if (offer.cooldown > 0) {
    offer.cooldown -= delta;
    if (offer.cooldown <= 0) generateOffer();
  }
};

const updateTweens = (delta: number) => {
  for (let index = tweens.length - 1; index >= 0; index -= 1) {
    const tween = tweens[index];
    tween.elapsed += delta;
    const progress = Math.min(1, tween.elapsed / tween.duration);
    tween.update(progress);
    if (progress >= 1) {
      tweens.splice(index, 1);
      tween.complete?.();
    }
  }
};

const updateBillboards = () => {
  for (const tree of trees) tree.healthBar.quaternion.copy(camera.quaternion);
};

const occlusionRaycaster = new THREE.Raycaster();
const updateTreeOcclusion = () => {
  const playerFocus = player.position.clone().add(new THREE.Vector3(0, 1, 0));
  const rayDirection = playerFocus.clone().sub(camera.position);
  const playerDistance = rayDirection.length();
  occlusionRaycaster.set(camera.position, rayDirection.normalize());
  occlusionRaycaster.far = playerDistance - 0.35;
  const occludingTrees = new Set<TreeData>();
  for (const hit of occlusionRaycaster.intersectObjects(treeOccluderMeshes, false)) {
    const tree = hit.object.userData.tree as TreeData | undefined;
    if (tree?.alive) occludingTrees.add(tree);
  }

  for (const tree of trees) {
    const shouldFade = tree.alive && occludingTrees.has(tree);
    if (tree.group.userData.faded === shouldFade) continue;
    tree.group.userData.faded = shouldFade;
    tree.group.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.userData.occludable) return;
      const material = child.material as THREE.Material;
      material.opacity = shouldFade ? 0.28 : 1;
      material.depthWrite = !shouldFade;
    });
  }
};

const updateCamera = (delta: number) => {
  cameraTarget.lerp(player.position, 1 - Math.exp(-delta * 5));
  camera.position.copy(cameraTarget).add(cameraOffset);
  camera.lookAt(cameraTarget.x, 0.65, cameraTarget.z);
};

const resize = () => {
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = 23;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.left = -(viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
};

window.addEventListener('resize', resize);
resize();
updateUI();

const clock = new THREE.Clock();
let uiClock = 0;
let ambientTime = 0;

const animate = () => {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  ambientTime += delta;
  updateBirds(delta, ambientTime);
  if (gameStarted && !isPanelOpen()) {
    updatePlayer(delta);
    updateCollection(delta);
    updateStations(delta);
    updateBuildZones(delta);
    updateOffer(delta);
  }
  updateTweens(delta);
  updateCamera(delta);
  updateBillboards();
  updateTreeOcclusion();
  updateContextHint();

  uiClock += delta;
  if (uiClock >= 0.2) {
    uiClock = 0;
    updateUI();
  }
  if (toastTimer > 0) {
    toastTimer -= delta;
    if (toastTimer <= 0) toast.classList.add('hidden');
  }

  renderer.render(scene, camera);
};

animate();
