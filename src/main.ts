import * as THREE from 'three';
import './style.css';

type UpgradeKind = 'capacity' | 'damage' | 'axeSpeed';
type CostType = 'money' | 'wood';

interface ResourceCost {
  type: CostType;
  amount: number;
}

interface TreeData {
  group: THREE.Group;
  healthBar: THREE.Group;
  rangeIndicator: THREE.Group;
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
}

interface BuildZoneData {
  group: THREE.Group;
  position: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  label: THREE.Mesh;
  progressFill: THREE.Mesh;
  progressWidth: number;
  cost: number;
  paid: number;
  built: boolean;
  paymentClock: number;
}

interface TavernData {
  group: THREE.Group;
  position: THREE.Vector3;
  deliveryPosition: THREE.Vector3;
  deliveryRing: THREE.Group;
  pile: THREE.Group;
  stages: THREE.Group[];
  label: THREE.Mesh;
  cost: ResourceCost;
  paid: number;
  completed: boolean;
  deliveryClock: number;
  delivering: boolean;
  barrelPosition: THREE.Vector3;
  entrancePosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  queueOrigin: THREE.Vector3;
  tables: TavernTable[];
  colliders: TavernCollider[];
}

interface TavernTable {
  group: THREE.Group;
  seatPosition: THREE.Vector3;
  occupied: boolean;
}

interface TavernCollider {
  center: THREE.Vector3;
  halfX: number;
  halfZ: number;
  stage: number;
}

type CustomerState = 'arriving' | 'queue' | 'toSeat' | 'seated' | 'standingDrink' | 'leaving';

interface CustomerData {
  group: THREE.Group;
  visual: THREE.Group;
  state: CustomerState;
  path: THREE.Vector3[];
  queueIndex: number;
  table: TavernTable | null;
  drinkClock: number;
  walkClock: number;
  mug: THREE.Group;
}

interface TipData {
  group: THREE.Group;
  value: number;
  collecting: boolean;
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

// Ana yoldan tavernanın girişine uzanan müşteri yolu.
const tavernPath = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 3.2), pathMaterial);
tavernPath.rotation.x = -Math.PI / 2;
tavernPath.position.set(2.35, 0.018, -2.2);
tavernPath.receiveShadow = true;
world.add(tavernPath);

const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9f5c2d, roughness: 0.85 });
const woodEndMaterial = new THREE.MeshStandardMaterial({ color: 0xe1ad63, roughness: 0.9 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x795029, roughness: 1 });
const darkTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x573a22, roughness: 1 });
const leafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x2d7a3d, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x3f9142, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x58a847, roughness: 1 }),
];
const treeRangeFillGeometry = new THREE.CircleGeometry(2.02, 40);
const treeRangeOutlineGeometry = new THREE.RingGeometry(1.93, 2.02, 40);
const treeRangeFillMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.025,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const treeRangeOutlineMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.26,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const trees: TreeData[] = [];
const treeOccluderMeshes: THREE.Mesh[] = [];
const groundLogs: GroundLog[] = [];
const stations: StationData[] = [];
const buildZones: BuildZoneData[] = [];
const tweens: TweenData[] = [];
const customers: CustomerData[] = [];
const customerQueue: CustomerData[] = [];
const tips: TipData[] = [];
const keys = new Set<string>();

const state = {
  gold: 0,
  carried: 0,
  pendingCollection: 0,
  stock: 0,
  capacity: 5,
  damage: 1,
  speed: 4.8,
  axeInterval: 1,
  levels: { capacity: 1, damage: 1, axeSpeed: 1 },
};

let tavern: TavernData;
let customerSpawnClock = 0;
let drinkFillClock = 0;
let playerHasDrink = false;

const offer: OfferData = {
  wood: 8,
  gold: 20,
  remaining: 45,
  active: true,
  cooldown: 0,
};
offerButton.classList.add('hidden');

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
axePivot.position.set(-0.57, 1.04, -0.12);
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
const axeRestAngle = 0.32;
const axeWindupAngle = 1.52;
const axeStrikeAngle = -1.48;
axePivot.rotation.z = axeRestAngle;

const toolArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.34, 4, 7), skinMaterial);
toolArm.position.set(-0.39, 1.04, -0.1);
toolArm.rotation.z = -0.38;
toolArm.castShadow = true;
playerVisual.add(toolArm);

const toolHand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), skinMaterial);
toolHand.position.set(-0.56, 0.91, -0.12);
toolHand.castShadow = true;
playerVisual.add(toolHand);

const carriedMug = new THREE.Group();
const carriedMugBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.105, 0.09, 0.25, 9),
  new THREE.MeshStandardMaterial({ color: 0xe8d2a4, roughness: 0.75 }),
);
carriedMugBody.position.y = 0.12;
const carriedDrink = new THREE.Mesh(
  new THREE.CylinderGeometry(0.088, 0.088, 0.018, 9),
  new THREE.MeshStandardMaterial({ color: 0xc87826, roughness: 0.55 }),
);
carriedDrink.position.y = 0.25;
carriedMug.add(carriedMugBody, carriedDrink);
carriedMug.position.set(0.48, 1.03, -0.32);
carriedMug.visible = false;
player.add(carriedMug);

const createCustomerVisual = (variant: number) => {
  const visual = new THREE.Group();
  const shirts = [0x6d8fc7, 0xb8674d, 0x6c9c63, 0x9b6ca8, 0xc99845, 0x4f8d8a];
  const trousers = [0x34485b, 0x4d4138, 0x384b3d, 0x463c57];
  const skins = [0xd79b67, 0xbd7d50, 0xe0aa78, 0x9d643f];
  const hairs = [0x493022, 0x2f241e, 0x7b4c26, 0x191817];
  const customerShirt = new THREE.MeshStandardMaterial({ color: shirts[variant % shirts.length], roughness: 0.85 });
  const customerPants = new THREE.MeshStandardMaterial({ color: trousers[variant % trousers.length], roughness: 0.9 });
  const customerSkin = new THREE.MeshStandardMaterial({ color: skins[variant % skins.length], roughness: 0.85 });
  const customerHair = new THREE.MeshStandardMaterial({ color: hairs[variant % hairs.length], roughness: 1 });
  const customerBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.52, 5, 9), customerShirt);
  customerBody.position.y = 0.92;
  customerBody.castShadow = true;
  visual.add(customerBody);
  for (const x of [-0.17, 0.17]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.32, 4, 7), customerPants);
    leg.position.set(x, 0.37, 0);
    leg.castShadow = true;
    leg.userData.walkLeg = x < 0 ? -1 : 1;
    visual.add(leg);
  }
  const customerHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 9), customerSkin);
  customerHead.position.y = 1.58;
  customerHead.castShadow = true;
  visual.add(customerHead);
  const customerHairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.54), customerHair);
  customerHairMesh.position.y = 1.67;
  customerHairMesh.castShadow = true;
  visual.add(customerHairMesh);
  return visual;
};

const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0.68);
player.add(stackGroup);

const stackMeshes: THREE.Mesh[] = [];

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

  const rangeIndicator = new THREE.Group();
  rangeIndicator.position.copy(position);
  rangeIndicator.position.y = 0.028;
  const rangeFill = new THREE.Mesh(treeRangeFillGeometry, treeRangeFillMaterial);
  const rangeOutline = new THREE.Mesh(treeRangeOutlineGeometry, treeRangeOutlineMaterial);
  rangeFill.rotation.x = -Math.PI / 2;
  rangeOutline.rotation.x = -Math.PI / 2;
  rangeOutline.position.y = 0.004;
  rangeIndicator.add(rangeFill, rangeOutline);
  world.add(rangeIndicator);

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
  const tree: TreeData = { group, healthBar, rangeIndicator, home: position.clone(), hp: 3, alive: true };
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

const makePurchaseLabel = (paid: number, cost: number, costType: CostType = 'money') => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.28, 1.28),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  label.rotation.x = -Math.PI / 2;
  label.renderOrder = 220;
  label.userData.canvas = canvas;
  label.userData.context = context;
  updatePurchaseLabel(label, paid, cost, costType);
  return label;
};

const updatePurchaseLabel = (label: THREE.Mesh, paid: number, cost: number, costType: CostType = 'money') => {
  const canvas = label.userData.canvas as HTMLCanvasElement;
  const context = label.userData.context as CanvasRenderingContext2D;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const remaining = Math.max(0, cost - paid);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Pizza Ready tarzı dünya işareti: sayı üstte, yeşil banknot altta.
  context.shadowColor = 'rgba(74, 55, 24, .28)';
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;
  context.fillStyle = '#ffffff';
  context.font = '1000 96px system-ui';
  context.fillText(String(remaining), 128, 78);
  context.shadowColor = 'transparent';

  if (costType === 'wood') {
    context.save();
    context.translate(128, 170);
    context.rotate(-0.12);
    context.fillStyle = '#a96432';
    context.strokeStyle = '#653a20';
    context.lineWidth = 8;
    context.beginPath();
    context.roundRect(-58, -23, 116, 46, 22);
    context.fill();
    context.stroke();
    context.fillStyle = '#e3b36e';
    context.beginPath();
    context.arc(51, 0, 20, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  } else {
    context.fillStyle = '#20bf55';
    context.strokeStyle = '#087b36';
    context.lineWidth = 9;
    context.beginPath();
    context.roundRect(76, 138, 104, 66, 10);
    context.fill();
    context.stroke();
    context.fillStyle = '#65e883';
    context.beginPath();
    context.arc(128, 171, 19, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#0b8f3e';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(86, 153);
    context.lineTo(86, 189);
    context.moveTo(170, 153);
    context.lineTo(170, 189);
    context.stroke();
  }

  const material = label.material as THREE.MeshBasicMaterial;
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

  const deliveryRing = new THREE.Mesh(
    new THREE.RingGeometry(2.82, 3.06, 40),
    new THREE.MeshBasicMaterial({ color: 0xffe18c, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  deliveryRing.rotation.x = -Math.PI / 2;
  deliveryRing.position.y = 0.035;
  group.add(deliveryRing);

  world.add(group);
  const station = { group, position: position.clone(), pile };
  stations.push(station);
  if (animate) {
    group.scale.setScalar(0.02);
    addTween(0.75, (progress) => group.scale.setScalar(easeOutBack(progress)));
  }
  rebuildStationPiles();
  return station;
};

const rebuildStationPiles = () => {
  const logsPerRow = 4;
  const horizontalLogSpacing = 0.82;
  const rowStartX = -((logsPerRow - 1) * horizontalLogSpacing) / 2;
  for (const station of stations) {
    station.pile.clear();
    for (let index = 0; index < state.stock; index += 1) {
      const log = makeLogMesh(0.78);
      const column = index % logsPerRow;
      const row = Math.floor(index / logsPerRow);
      log.position.set(rowStartX + column * horizontalLogSpacing, 0.22 + row * 0.34, 0);
      log.rotation.x = row % 2 === 0 ? 0.018 : -0.018;
      station.pile.add(log);
    }
  }
};

const createBuildZone = (position: THREE.Vector3, spawnOffset: THREE.Vector3, cost: number) => {
  const group = new THREE.Group();
  group.position.copy(position);
  const padSize = 2.35;
  const progressWidth = padSize - 0.18;
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(padSize, padSize),
    new THREE.MeshBasicMaterial({ color: 0xf6d873, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.035;
  group.add(pad);

  const progressFill = new THREE.Mesh(
    new THREE.PlaneGeometry(progressWidth, progressWidth),
    new THREE.MeshBasicMaterial({ color: 0x70b84f, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
  );
  progressFill.rotation.x = -Math.PI / 2;
  progressFill.position.set(0, 0.045, progressWidth / 2);
  progressFill.scale.y = 0.001;
  group.add(progressFill);

  const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 });
  const edge = padSize + 0.1;
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, -edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(edge / 2, 0.075, 0), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(-edge / 2, 0.075, 0), borderMaterial);

  const label = makePurchaseLabel(0, cost);
  // Etiket bir UI sprite'ı değil; satın alma karesine basılmış yatay dünya işaretidir.
  label.position.set(0, 0.062, 0);
  group.add(label);
  world.add(group);
  buildZones.push({
    group,
    position: position.clone(),
    spawnPosition: position.clone().add(spawnOffset),
    label,
    progressFill,
    progressWidth,
    cost,
    paid: 0,
    built: false,
    paymentClock: 0,
  });
};

const createTavern = (position: THREE.Vector3) => {
  const group = new THREE.Group();
  group.position.copy(position);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xb9854f, roughness: 0.95 });
  const floorAccentMaterial = new THREE.MeshStandardMaterial({ color: 0xd7aa6d, roughness: 0.95 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe0c18c, roughness: 1 });
  const plasterMaterial = new THREE.MeshStandardMaterial({ color: 0xead6a8, roughness: 1 });
  const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x754529, roughness: 0.85 });
  const blueprintMaterial = new THREE.MeshBasicMaterial({ color: 0xf8e5b9, transparent: true, opacity: 0.45 });

  // İnşaat başlamadan önce tavernanın kaplayacağı alanı gösteren sade temel çizgisi.
  const footprint = new THREE.Group();
  const footprintWidth = 11.8;
  const footprintDepth = 9.4;
  addBox(footprint, new THREE.Vector3(footprintWidth, 0.045, 0.11), new THREE.Vector3(0, 0.035, footprintDepth / 2), blueprintMaterial);
  addBox(footprint, new THREE.Vector3(footprintWidth, 0.045, 0.11), new THREE.Vector3(0, 0.035, -footprintDepth / 2), blueprintMaterial);
  addBox(footprint, new THREE.Vector3(0.11, 0.045, footprintDepth), new THREE.Vector3(footprintWidth / 2, 0.035, 0), blueprintMaterial);
  addBox(footprint, new THREE.Vector3(0.11, 0.045, footprintDepth), new THREE.Vector3(-footprintWidth / 2, 0.035, 0), blueprintMaterial);
  group.add(footprint);

  const floorStage = new THREE.Group();
  addBox(floorStage, new THREE.Vector3(11.4, 0.18, 9), new THREE.Vector3(0, 0.09, 0), floorMaterial);
  for (let plank = -4; plank <= 4; plank += 1) {
    addBox(floorStage, new THREE.Vector3(11.05, 0.035, 0.055), new THREE.Vector3(0, 0.198, plank * 0.92), floorAccentMaterial);
  }

  const wallStage = new THREE.Group();
  const wallHeight = 2.45;
  addBox(wallStage, new THREE.Vector3(11.5, wallHeight, 0.3), new THREE.Vector3(0, wallHeight / 2, -4.5), wallMaterial);
  addBox(wallStage, new THREE.Vector3(11.5, wallHeight, 0.3), new THREE.Vector3(0, wallHeight / 2, 4.5), wallMaterial);
  addBox(wallStage, new THREE.Vector3(0.3, wallHeight, 9.1), new THREE.Vector3(5.7, wallHeight / 2, 0), wallMaterial);
  // Yol tarafındaki batı duvarı, ortadaki kapı boşluğu korunarak iki parçadır.
  addBox(wallStage, new THREE.Vector3(0.3, wallHeight, 3.35), new THREE.Vector3(-5.7, wallHeight / 2, -2.78), wallMaterial);
  addBox(wallStage, new THREE.Vector3(0.3, wallHeight, 3.35), new THREE.Vector3(-5.7, wallHeight / 2, 2.78), wallMaterial);
  for (const z of [-4.5, 4.5]) {
    addBox(wallStage, new THREE.Vector3(0.38, 2.72, 0.38), new THREE.Vector3(-5.7, 1.36, z), darkTrunkMaterial);
    addBox(wallStage, new THREE.Vector3(0.38, 2.72, 0.38), new THREE.Vector3(5.7, 1.36, z), darkTrunkMaterial);
  }

  const entranceStage = new THREE.Group();
  addBox(entranceStage, new THREE.Vector3(0.38, 2.55, 0.3), new THREE.Vector3(-5.7, 1.28, -1.08), darkTrunkMaterial);
  addBox(entranceStage, new THREE.Vector3(0.38, 2.55, 0.3), new THREE.Vector3(-5.7, 1.28, 1.08), darkTrunkMaterial);
  addBox(entranceStage, new THREE.Vector3(0.4, 0.3, 2.46), new THREE.Vector3(-5.7, 2.5, 0), darkTrunkMaterial);
  // Ana servis tezgâhı aynı zamanda müşterilerin sıraya girdiği tek noktadır.
  addBox(entranceStage, new THREE.Vector3(4.65, 0.98, 0.78), new THREE.Vector3(2.75, 0.68, -2.85), counterMaterial);
  addBox(entranceStage, new THREE.Vector3(4.9, 0.18, 0.98), new THREE.Vector3(2.75, 1.23, -2.85), floorAccentMaterial);
  addBox(entranceStage, new THREE.Vector3(2.0, 0.78, 0.12), new THREE.Vector3(2.75, 1.72, -4.3), plasterMaterial);

  const furnitureStage = new THREE.Group();
  const tables: TavernTable[] = [];
  for (const [x, z] of [[-2.7, 1.25], [0.15, 1.25], [-2.7, 3.35], [0.15, 3.35]] as [number, number][]) {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, 0, z);
    addBox(tableGroup, new THREE.Vector3(1.45, 0.16, 0.9), new THREE.Vector3(0, 0.82, 0), counterMaterial);
    addBox(tableGroup, new THREE.Vector3(0.18, 0.76, 0.18), new THREE.Vector3(0, 0.4, 0), darkTrunkMaterial);
    addBox(tableGroup, new THREE.Vector3(0.72, 0.14, 0.64), new THREE.Vector3(0, 0.46, 0.92), floorAccentMaterial);
    addBox(tableGroup, new THREE.Vector3(0.14, 0.46, 0.14), new THREE.Vector3(0, 0.23, 0.92), darkTrunkMaterial);
    furnitureStage.add(tableGroup);
    tables.push({ group: tableGroup, seatPosition: position.clone().add(new THREE.Vector3(x, 0, z + 0.92)), occupied: false });
  }

  // Fıçı, içecek alınan gerçek etkileşim noktasıdır.
  const barrelPosition = position.clone().add(new THREE.Vector3(-3.65, 0, -2.75));
  const barrel = new THREE.Group();
  barrel.position.copy(group.worldToLocal(barrelPosition.clone()));
  const barrelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.25, 12), woodMaterial);
  barrelBody.position.y = 0.68;
  barrelBody.castShadow = true;
  barrel.add(barrelBody);
  for (const y of [0.25, 0.68, 1.1]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.045, 6, 12), new THREE.MeshStandardMaterial({ color: 0x4c4c46, metalness: 0.2, roughness: 0.7 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    barrel.add(band);
  }
  const tap = addBox(barrel, new THREE.Vector3(0.12, 0.12, 0.38), new THREE.Vector3(0, 0.72, 0.72), darkTrunkMaterial);
  tap.rotation.x = -0.15;
  furnitureStage.add(barrel);

  const stages = [floorStage, wallStage, entranceStage, furnitureStage];
  for (const stage of stages) {
    stage.visible = false;
    group.add(stage);
  }

  const deliveryPosition = position.clone().add(new THREE.Vector3(-4.45, 0, -6.0));
  const deliveryRing = new THREE.Group();
  deliveryRing.position.copy(group.worldToLocal(deliveryPosition.clone()));
  const ringFill = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 36),
    new THREE.MeshBasicMaterial({ color: 0xf0c95b, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
  );
  const ringEdge = new THREE.Mesh(
    new THREE.RingGeometry(1.38, 1.54, 36),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
  );
  ringFill.rotation.x = -Math.PI / 2;
  ringEdge.rotation.x = -Math.PI / 2;
  ringFill.position.y = 0.035;
  ringEdge.position.y = 0.048;
  deliveryRing.add(ringFill, ringEdge);
  group.add(deliveryRing);

  const label = makePurchaseLabel(0, 12, 'wood');
  label.position.set(0, 0.062, 0);
  deliveryRing.add(label);

  const pile = new THREE.Group();
  // Teslim edilen kütükler maliyet sayısını kapatmasın diye alanın yanında birikir.
  pile.position.set(1.9, 0.12, 0.05);
  deliveryRing.add(pile);
  world.add(group);

  const toWorld = (x: number, z: number) => position.clone().add(new THREE.Vector3(x, 0, z));
  const colliders: TavernCollider[] = [
    { center: toWorld(0, -4.5), halfX: 5.75, halfZ: 0.15, stage: 1 },
    { center: toWorld(0, 4.5), halfX: 5.75, halfZ: 0.15, stage: 1 },
    { center: toWorld(5.7, 0), halfX: 0.15, halfZ: 4.55, stage: 1 },
    { center: toWorld(-5.7, -2.78), halfX: 0.15, halfZ: 1.68, stage: 1 },
    { center: toWorld(-5.7, 2.78), halfX: 0.15, halfZ: 1.68, stage: 1 },
    { center: toWorld(2.75, -2.85), halfX: 2.45, halfZ: 0.49, stage: 2 },
    { center: barrelPosition, halfX: 0.7, halfZ: 0.7, stage: 3 },
    ...tables.map((table) => ({ center: table.group.position.clone().add(position), halfX: 0.83, halfZ: 0.56, stage: 3 })),
    ...tables.map((table) => ({ center: table.group.position.clone().add(position).add(new THREE.Vector3(0, 0, 0.92)), halfX: 0.42, halfZ: 0.38, stage: 3 })),
  ];

  tavern = {
    group,
    position: position.clone(),
    deliveryPosition,
    deliveryRing,
    pile,
    stages,
    label,
    cost: { type: 'wood', amount: 12 },
    paid: 0,
    completed: false,
    deliveryClock: 0,
    delivering: false,
    barrelPosition,
    entrancePosition: toWorld(-5.95, 0),
    exitPosition: toWorld(-8.2, -5.5),
    queueOrigin: toWorld(2.75, -1.65),
    tables,
    colliders,
  };
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
  if (Math.abs(position.x - 7.8) < 7.2 && Math.abs(position.z + 2.2) < 6.2) return false;
  if (Math.abs(position.z + 2.2) < 2.4 && position.x > -2 && position.x < 5) return false;
  return trees.every((tree) => position.distanceTo(tree.group.position) > 2.55);
};

for (let index = 0; index < 30; index += 1) {
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
  const outsideTavern = !(Math.abs(position.x - 7.8) < 7.1 && Math.abs(position.z + 2.2) < 6.1);
  const outsideTavernPath = !(Math.abs(position.z + 2.2) < 2.2 && position.x > -2 && position.x < 5);
  if (Math.abs(position.x + position.z * 0.13) > 4 && outsideTavern && outsideTavernPath) {
    createRock(position, 0.25 + seededRandom() * 0.38);
  }
}

createTavern(new THREE.Vector3(7.8, 0, -2.2));
// Eski satın alma alanı kurucusu bu prototip aşamasında çağrılmıyor.
void createBuildZone;

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

const spawnChopDebris = (treePosition: THREE.Vector3) => {
  const burstOrigin = treePosition.clone().add(new THREE.Vector3(0, 1.35, 0));
  for (let index = 0; index < 10; index += 1) {
    const isTwig = index < 3;
    const material = new THREE.MeshBasicMaterial({
      color: isTwig ? 0x8b542f : (index % 2 === 0 ? 0x78b94e : 0x9bca5b),
      transparent: true,
      side: THREE.DoubleSide,
    });
    const debris = new THREE.Mesh(
      isTwig
        ? new THREE.BoxGeometry(0.055, 0.3, 0.055)
        : new THREE.PlaneGeometry(0.16, 0.1),
      material,
    );
    const start = burstOrigin.clone().add(new THREE.Vector3(
      (seededRandom() - 0.5) * 0.42,
      seededRandom() * 0.5,
      (seededRandom() - 0.5) * 0.42,
    ));
    const velocity = new THREE.Vector3(
      (seededRandom() - 0.5) * 2.7,
      0.8 + seededRandom() * 1.5,
      (seededRandom() - 0.5) * 2.7,
    );
    debris.position.copy(start);
    debris.rotation.set(seededRandom() * Math.PI, seededRandom() * Math.PI, seededRandom() * Math.PI);
    scene.add(debris);
    addTween(0.72 + seededRandom() * 0.18, (progress) => {
      debris.position.copy(start).addScaledVector(velocity, progress);
      debris.position.y -= 2.35 * progress * progress;
      debris.rotation.x += isTwig ? 0.18 : 0.34;
      debris.rotation.z += isTwig ? 0.12 : 0.28;
      material.opacity = Math.min(1, (1 - progress) * 1.7);
    }, () => {
      scene.remove(debris);
      debris.geometry.dispose();
      material.dispose();
    });
  }
};

const animateMoneyToBuildZone = (zone: BuildZoneData) => {
  const moneyMaterial = new THREE.MeshStandardMaterial({ color: 0x20bf55, roughness: 0.72 });
  const banknote = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.19), moneyMaterial);
  const start = player.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const target = zone.position.clone().add(new THREE.Vector3(0, 0.13, 0));
  banknote.position.copy(start);
  banknote.rotation.set(0.12, player.rotation.y, 0.08);
  scene.add(banknote);
  addTween(0.42, (progress) => {
    banknote.position.lerpVectors(start, target, easeInOutCubic(progress));
    banknote.position.y += Math.sin(progress * Math.PI) * 0.9;
    banknote.rotation.y += 0.26;
    banknote.rotation.z = Math.sin(progress * Math.PI * 2) * 0.18;
    const scale = 1 + Math.sin(progress * Math.PI) * 0.24;
    banknote.scale.setScalar(scale);
  }, () => {
    scene.remove(banknote);
    banknote.geometry.dispose();
    moneyMaterial.dispose();
  });
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
    addTween(0.32 + index * 0.04, (progress) => {
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
  tree.rangeIndicator.visible = false;
  audio.treeFall();
  tree.healthBar.visible = false;
  const treePosition = tree.group.position.clone();
  const away = treePosition.clone().sub(player.position);
  tree.group.rotation.y = Math.atan2(away.x, away.z);
  spawnParticles(treePosition, 0x78b94e, 9);
  addTween(0.42, (progress) => {
    tree.group.rotation.z = -easeInOutCubic(progress) * Math.PI * 0.48;
  }, () => {
    spawnFallenLogs(treePosition);
    world.remove(tree.group);
  });
};

let chopClock = 0;

const hitTree = (tree: TreeData) => {
  if (!tree.alive) return;
  audio.chop();
  tree.hp = Math.max(0, tree.hp - state.damage);
  updateTreeHealthBar(tree);
  spawnParticles(tree.group.position, 0xc99248, 5);
  spawnChopDebris(tree.group.position);
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
    -1.23 + (state.stock % 4) * 0.82,
    0.42 + Math.floor(state.stock / 4) * 0.34,
    0.45,
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

const rebuildTavernPile = () => {
  tavern.pile.clear();
  for (let index = 0; index < tavern.paid; index += 1) {
    const log = makeLogMesh(0.66);
    const column = index % 3;
    const row = Math.floor(index / 3);
    log.position.set((column - 1) * 0.58, 0.22 + row * 0.28, 0);
    tavern.pile.add(log);
  }
};

const revealTavernStage = (stageIndex: number) => {
  const stage = tavern.stages[stageIndex];
  if (!stage || stage.visible) return;
  stage.visible = true;
  stage.scale.set(0.04, 0.04, 0.04);
  addTween(0.62, (progress) => stage.scale.setScalar(easeOutBack(progress)), () => stage.scale.setScalar(1));
  spawnParticles(tavern.position.clone().add(new THREE.Vector3(0, 0.2, 0)), 0xf2d06b, 12);
};

const updateTavernStages = () => {
  const thresholds = [3, 6, 9, 12];
  thresholds.forEach((threshold, index) => {
    if (tavern.paid >= threshold) revealTavernStage(index);
  });
};

const finishTavern = () => {
  tavern.completed = true;
  tavern.group.remove(tavern.deliveryRing);
  customerSpawnClock = 3.2;
  audio.coin();
  showToast('Taverna açıldı! Fıçıdan içecek al ve sıraya servis et.');
};

const makeDrinkMug = () => {
  const mug = new THREE.Group();
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.09, 0.25, 9),
    new THREE.MeshStandardMaterial({ color: 0xe8d2a4, roughness: 0.75 }),
  );
  cup.position.y = 0.12;
  const drink = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 0.018, 9),
    new THREE.MeshStandardMaterial({ color: 0xc87826, roughness: 0.55 }),
  );
  drink.position.y = 0.25;
  mug.add(cup, drink);
  mug.visible = false;
  return mug;
};

const queueTarget = (index: number) => tavern.queueOrigin.clone().add(new THREE.Vector3(0, 0, index * 0.88));

const moveCustomerTowards = (customer: CustomerData, target: THREE.Vector3, delta: number, speed = 2.25) => {
  const direction = target.clone().sub(customer.group.position);
  direction.y = 0;
  const distance = direction.length();
  if (distance < 0.045) {
    customer.group.position.copy(target);
    return true;
  }
  direction.normalize();
  customer.group.position.addScaledVector(direction, Math.min(distance, speed * delta));
  customer.group.rotation.y = Math.atan2(-direction.x, -direction.z);
  customer.walkClock += delta * 9;
  customer.visual.position.y = Math.abs(Math.sin(customer.walkClock)) * 0.045;
  customer.visual.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.walkLeg) {
      child.rotation.x = Math.sin(customer.walkClock) * 0.3 * Number(child.userData.walkLeg);
    }
  });
  return false;
};

const spawnCustomer = () => {
  const group = new THREE.Group();
  const visual = createCustomerVisual(customers.length + Math.floor(ambientTime));
  const mug = makeDrinkMug();
  mug.position.set(0.38, 0.9, -0.28);
  group.add(visual, mug);
  const spawnPosition = tavern.exitPosition.clone().add(new THREE.Vector3(-1.8, 0, -2.2));
  group.position.copy(spawnPosition);
  world.add(group);
  const customer: CustomerData = {
    group,
    visual,
    state: 'arriving',
    path: [
      tavern.entrancePosition.clone().add(new THREE.Vector3(-0.9, 0, 0)),
      tavern.entrancePosition.clone().add(new THREE.Vector3(0.9, 0, 0)),
    ],
    queueIndex: -1,
    table: null,
    drinkClock: 0,
    walkClock: 0,
    mug,
  };
  customers.push(customer);
};

const refreshQueue = () => {
  customerQueue.forEach((customer, index) => {
    customer.queueIndex = index;
  });
};

const animateCustomerPayment = (position: THREE.Vector3) => {
  const material = new THREE.MeshStandardMaterial({ color: 0x20bf55, roughness: 0.72 });
  const banknote = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.21), material);
  const start = position.clone().add(new THREE.Vector3(0, 1.05, 0));
  const target = player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
  banknote.position.copy(start);
  scene.add(banknote);
  addTween(0.48, (progress) => {
    banknote.position.lerpVectors(start, target, easeInOutCubic(progress));
    banknote.position.y += Math.sin(progress * Math.PI) * 0.85;
    banknote.rotation.y += 0.3;
  }, () => {
    scene.remove(banknote);
    banknote.geometry.dispose();
    material.dispose();
  });
};

const spawnTableTip = (table: TavernTable) => {
  const group = new THREE.Group();
  group.position.copy(table.group.position.clone().add(tavern.position));
  group.position.y = 1.02;
  for (let index = 0; index < 2; index += 1) {
    const note = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.035, 0.2),
      new THREE.MeshStandardMaterial({ color: index === 0 ? 0x20bf55 : 0x65e883, roughness: 0.7 }),
    );
    note.position.set((index - 0.5) * 0.11, index * 0.045, 0);
    note.rotation.y = (index - 0.5) * 0.22;
    note.castShadow = true;
    group.add(note);
  }
  world.add(group);
  tips.push({ group, value: 2, collecting: false });
  bounceGroup(group);
};

const removeCustomer = (customer: CustomerData) => {
  world.remove(customer.group);
  const customerIndex = customers.indexOf(customer);
  if (customerIndex >= 0) customers.splice(customerIndex, 1);
};

const sendCustomerAway = (customer: CustomerData) => {
  customer.state = 'leaving';
  customer.path = [
    tavern.entrancePosition.clone().add(new THREE.Vector3(0.85, 0, 0)),
    tavern.entrancePosition.clone().add(new THREE.Vector3(-0.9, 0, 0)),
    tavern.exitPosition.clone(),
  ];
  customer.visual.position.y = 0;
};

const serveFrontCustomer = () => {
  const customer = customerQueue[0];
  if (!customer || !playerHasDrink || customer.group.position.distanceTo(player.position) > 1.55) return;
  playerHasDrink = false;
  carriedMug.visible = false;
  customerQueue.shift();
  refreshQueue();
  customer.mug.visible = true;
  state.gold += 4;
  animateCustomerPayment(customer.group.position);
  audio.coin();

  const table = tavern.tables.find((candidate) => !candidate.occupied) ?? null;
  if (table) {
    table.occupied = true;
    customer.table = table;
    customer.state = 'toSeat';
  } else {
    customer.state = 'standingDrink';
    customer.drinkClock = 0;
    const standingSlot = customers.indexOf(customer) % 3;
    customer.path = [tavern.queueOrigin.clone().add(new THREE.Vector3(-2.0, 0, 0.25 + standingSlot * 0.7))];
  }
  updateUI();
};

const updateCustomers = (delta: number) => {
  if (!tavern.completed) return;
  customerSpawnClock -= delta;
  if (customerSpawnClock <= 0 && customers.length < 8) {
    spawnCustomer();
    customerSpawnClock = 4.8;
  }

  for (const customer of [...customers]) {
    if (customer.state === 'arriving' || customer.state === 'leaving') {
      const target = customer.path[0];
      if (!target) {
        if (customer.state === 'arriving') {
          customer.state = 'queue';
          customerQueue.push(customer);
          refreshQueue();
        } else {
          removeCustomer(customer);
        }
        continue;
      }
      if (moveCustomerTowards(customer, target, delta)) customer.path.shift();
    } else if (customer.state === 'queue') {
      moveCustomerTowards(customer, queueTarget(customer.queueIndex), delta, 1.9);
    } else if (customer.state === 'toSeat' && customer.table) {
      if (moveCustomerTowards(customer, customer.table.seatPosition, delta)) {
        customer.state = 'seated';
        customer.drinkClock = 0;
        customer.visual.position.y = -0.3;
        customer.group.rotation.y = Math.PI;
      }
    } else if (customer.state === 'seated') {
      customer.drinkClock += delta;
      customer.mug.rotation.z = Math.sin(customer.drinkClock * 3.6) * 0.12;
      if (customer.drinkClock >= 4.1 && customer.table) {
        spawnTableTip(customer.table);
        customer.table.occupied = false;
        customer.table = null;
        customer.mug.visible = false;
        sendCustomerAway(customer);
      }
    } else if (customer.state === 'standingDrink') {
      if (customer.path[0] && moveCustomerTowards(customer, customer.path[0], delta, 1.75)) customer.path.shift();
      customer.drinkClock += delta;
      customer.mug.rotation.z = Math.sin(customer.drinkClock * 4) * 0.14;
      if (customer.drinkClock >= 2.5) {
        customer.mug.visible = false;
        sendCustomerAway(customer);
      }
    }
  }

  if (!playerHasDrink && player.position.distanceTo(tavern.barrelPosition) < 1.5) {
    drinkFillClock += delta;
    if (drinkFillClock >= 0.48) {
      drinkFillClock = 0;
      playerHasDrink = true;
      carriedMug.visible = true;
      audio.pickup();
      showToast('İçecek hazır · sıranın başına götür');
    }
  } else {
    drinkFillClock = 0;
  }
  serveFrontCustomer();
};

const updateTips = () => {
  for (const tip of [...tips]) {
    if (tip.collecting || tip.group.position.distanceTo(player.position) >= 1.45) continue;
    tip.collecting = true;
    const start = tip.group.position.clone();
    const target = player.position.clone().add(new THREE.Vector3(0, 1, 0));
    addTween(0.36, (progress) => {
      tip.group.position.lerpVectors(start, target, easeInOutCubic(progress));
      tip.group.position.y += Math.sin(progress * Math.PI) * 0.65;
    }, () => {
      world.remove(tip.group);
      const index = tips.indexOf(tip);
      if (index >= 0) tips.splice(index, 1);
      state.gold += tip.value;
      audio.coin();
      updateUI();
      showToast(`Masa bahşişi +${tip.value} para`);
    });
  }
};

const deliverLogToTavern = () => {
  if (tavern.completed || tavern.delivering || state.carried <= 0 || stackMeshes.length === 0) return;
  tavern.delivering = true;
  const topLog = stackMeshes[stackMeshes.length - 1];
  const start = new THREE.Vector3();
  topLog.getWorldPosition(start);
  state.carried -= 1;
  rebuildPlayerStack();
  updateUI();

  const flyingLog = makeLogMesh(0.72);
  flyingLog.position.copy(start);
  scene.add(flyingLog);
  const nextIndex = tavern.paid;
  const target = tavern.deliveryPosition.clone().add(new THREE.Vector3(
    1.9 + ((nextIndex % 3) - 1) * 0.58,
    0.34 + Math.floor(nextIndex / 3) * 0.28,
    0.05,
  ));
  addTween(0.34, (progress) => {
    flyingLog.position.lerpVectors(start, target, easeInOutCubic(progress));
    flyingLog.position.y += Math.sin(progress * Math.PI) * 0.9;
    flyingLog.rotation.y += 0.28;
  }, () => {
    scene.remove(flyingLog);
    tavern.paid += 1;
    tavern.delivering = false;
    audio.unload();
    rebuildTavernPile();
    updatePurchaseLabel(tavern.label, tavern.paid, tavern.cost.amount, tavern.cost.type);
    updateTavernStages();
    bounceGroup(tavern.pile);
    if (tavern.paid >= tavern.cost.amount) finishTavern();
  });
};

const updateTavern = (delta: number) => {
  if (tavern.completed) return;
  if (tavern.deliveryPosition.distanceTo(player.position) < 1.85 && state.carried > 0 && !tavern.delivering) {
    tavern.deliveryClock += delta;
    if (tavern.deliveryClock >= 0.18) {
      tavern.deliveryClock = 0;
      deliverLogToTavern();
    }
  } else {
    tavern.deliveryClock = 0;
  }
};

const upgradeCosts = (): Record<UpgradeKind, ResourceCost> => ({
  capacity: { type: 'money', amount: 15 + (state.levels.capacity - 1) * 15 },
  damage: { type: 'money', amount: 25 + (state.levels.damage - 1) * 25 },
  axeSpeed: { type: 'wood', amount: 5 + (state.levels.axeSpeed - 1) * 3 },
});

const resourceAmount = (type: CostType) => type === 'money' ? state.gold : state.carried;

const spendResource = (cost: ResourceCost) => {
  if (cost.type === 'money') state.gold -= cost.amount;
  else {
    state.carried -= cost.amount;
    rebuildPlayerStack();
  }
};

const buyUpgrade = (kind: UpgradeKind) => {
  const costs = upgradeCosts();
  const cost = costs[kind];
  if (resourceAmount(cost.type) < cost.amount) {
    showToast(cost.type === 'money' ? 'Yeterli paran yok' : 'Yeterli odunun yok');
    return;
  }
  spendResource(cost);
  audio.coin();
  state.levels[kind] += 1;
  if (kind === 'capacity') state.capacity += 2;
  if (kind === 'damage') state.damage += 1;
  if (kind === 'axeSpeed') state.axeInterval = Math.max(0.42, state.axeInterval * 0.82);
  updateUI();
  showToast('Geliştirme satın alındı!');
};

const updateUI = () => {
  goldCount.textContent = `${state.gold}`;
  woodCount.textContent = `${state.carried}/${state.capacity}`;
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
  getElement<HTMLElement>('axe-speed-value').textContent = `${state.axeInterval.toFixed(2)} sn → ${Math.max(0.42, state.axeInterval * 0.82).toFixed(2)} sn`;
  const costElements: Record<UpgradeKind, HTMLElement> = {
    capacity: getElement<HTMLElement>('capacity-cost'),
    damage: getElement<HTMLElement>('damage-cost'),
    axeSpeed: getElement<HTMLElement>('axe-speed-cost'),
  };
  (Object.keys(costElements) as UpgradeKind[]).forEach((kind) => {
    const element = costElements[kind];
    element.textContent = `${costs[kind].amount}`;
    element.classList.toggle('cash-cost', costs[kind].type === 'money');
    element.classList.toggle('wood-cost', costs[kind].type === 'wood');
  });
  document.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => {
    const kind = button.dataset.upgrade as UpgradeKind;
    button.disabled = resourceAmount(costs[kind].type) < costs[kind].amount;
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
  showToast(`Teklif tamamlandı: +${offer.gold} para`);
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
  if (tavern) {
    const playerRadius = 0.36;
    for (const collider of tavern.colliders) {
      if (!tavern.stages[collider.stage]?.visible) continue;
      if (
        Math.abs(position.x - collider.center.x) < collider.halfX + playerRadius
        && Math.abs(position.z - collider.center.z) < collider.halfZ + playerRadius
      ) return true;
    }
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
    if (!collidesAt(nextPosition)) {
      player.position.copy(nextPosition);
    } else {
      // Duvar ve mobilyalara çapraz yürürken oyuncunun köşeye yapışmasını önle.
      const slideX = player.position.clone();
      slideX.x = nextPosition.x;
      const slideZ = player.position.clone();
      slideZ.z = nextPosition.z;
      if (!collidesAt(slideX)) player.position.copy(slideX);
      else if (!collidesAt(slideZ)) player.position.copy(slideZ);
    }
    const targetRotation = Math.atan2(-desiredMovement.x, -desiredMovement.z);
    let difference = targetRotation - playerRotation;
    difference = Math.atan2(Math.sin(difference), Math.cos(difference));
    playerRotation += difference * Math.min(1, delta * 12);
    player.rotation.y = playerRotation;
    walkTime += delta * 10;
    playerVisual.position.y = Math.abs(Math.sin(walkTime)) * 0.055;
    legs[0].rotation.x = Math.sin(walkTime) * 0.35;
    legs[1].rotation.x = -Math.sin(walkTime) * 0.35;
  } else {
    playerVisual.position.y = THREE.MathUtils.lerp(playerVisual.position.y, 0, delta * 10);
    legs[0].rotation.x = THREE.MathUtils.lerp(legs[0].rotation.x, 0, delta * 10);
    legs[1].rotation.x = THREE.MathUtils.lerp(legs[1].rotation.x, 0, delta * 10);
  }

  const nearest = nearestTreeInRange();
  if (nearest) {
    if (!isMoving) {
      const direction = nearest.group.position.clone().sub(player.position);
      const targetRotation = Math.atan2(-direction.x, -direction.z);
      let difference = targetRotation - playerRotation;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      playerRotation += difference * Math.min(1, delta * 12);
      player.rotation.y = playerRotation;
    }
    chopClock += delta;
    const chopRatio = Math.min(1, chopClock / state.axeInterval);
    if (chopRatio < 0.56) {
      axePivot.rotation.z = THREE.MathUtils.lerp(axeRestAngle, axeWindupAngle, easeInOutCubic(chopRatio / 0.56));
    } else {
      axePivot.rotation.z = THREE.MathUtils.lerp(axeWindupAngle, axeStrikeAngle, easeInOutCubic((chopRatio - 0.56) / 0.44));
    }
    toolArm.rotation.z = -0.38 + (axePivot.rotation.z - axeRestAngle) * 0.18;
    if (chopClock >= state.axeInterval) {
      chopClock -= state.axeInterval;
      hitTree(nearest);
    }
  } else {
    chopClock = 0;
    axePivot.rotation.z = THREE.MathUtils.lerp(axePivot.rotation.z, axeRestAngle, delta * 12);
    toolArm.rotation.z = THREE.MathUtils.lerp(toolArm.rotation.z, -0.38, delta * 12);
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
        animateMoneyToBuildZone(zone);
        const ratio = zone.paid / zone.cost;
        zone.progressFill.scale.y = Math.max(0.001, ratio);
        zone.progressFill.position.z = (zone.progressWidth / 2) * (1 - ratio);
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
  const nearTavernDelivery = !tavern.completed && tavern.deliveryPosition.distanceTo(player.position) < 2.2;
  const nearbyGroundLog = groundLogs.some((log) => !log.collecting && log.mesh.position.distanceTo(player.position) < 1.6);
  if (nearTavernDelivery) {
    message = state.carried > 0
      ? `Taverna kuruluyor · ${tavern.paid}/${tavern.cost.amount} odun`
      : `Taverna için odun getir · ${tavern.paid}/${tavern.cost.amount}`;
  } else if (tavern.completed && tavern.barrelPosition.distanceTo(player.position) < 1.8) {
    message = playerHasDrink ? 'Elinde bir içecek var · sıranın başına götür' : 'Fıçıdan içecek dolduruluyor';
  } else if (tavern.completed && customerQueue[0]?.group.position.distanceTo(player.position) < 1.8) {
    message = playerHasDrink ? 'İçecek servis ediliyor' : 'Önce fıçıdan içecek al';
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
  for (const tree of trees) {
    tree.healthBar.quaternion.copy(camera.quaternion);
    // Tüm ormanı beyaz dairelerle kaplamak yerine yalnızca yakındaki
    // kesilebilir ağaçların menzilini göster.
    tree.rangeIndicator.visible = tree.alive && tree.group.position.distanceToSquared(player.position) < 3.6 * 3.6;
  }
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
    updateTavern(delta);
    updateCustomers(delta);
    updateTips();
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
