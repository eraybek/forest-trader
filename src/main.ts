import * as THREE from 'three';
import { findClip, instantiate, loadModels } from './models';
import './style.css';

type SkillKind = 'damage' | 'axeSpeed' | 'capacity' | 'speed' | 'haggle';
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
  maxHp: number;
  tier: number;
  plotIndex: number;
  logs: number;
  logValue: number;
  alive: boolean;
}

interface GroundLog {
  mesh: THREE.Mesh;
  collecting: boolean;
  settled: boolean;
  // Kütüğü düşüren ağacın kademesinden gelen ham değer.
  value: number;
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
  cost: ResourceCost;
  paid: number;
  built: boolean;
  active: boolean;
  paymentClock: number;
  onComplete: () => void;
  completeMessage: string;
}

interface TraderPost {
  group: THREE.Group;
  position: THREE.Vector3;
  // Oyuncunun satışı tetiklemek için üzerinde durduğu alan.
  sellPosition: THREE.Vector3;
  stockPile: THREE.Group;
  // Bekleyen alıcıların tezgâh önünde dizildiği sabit noktalar.
  slots: THREE.Vector3[];
  spawnPosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  colliders: TraderCollider[];
}

interface TraderCollider {
  center: THREE.Vector3;
  halfX: number;
  halfZ: number;
}

type CustomerState = 'arriving' | 'waiting' | 'leaving';

interface CustomerData {
  group: THREE.Group;
  visual: THREE.Group;
  state: CustomerState;
  path: THREE.Vector3[];
  slotIndex: number;
  wantsPlanks: boolean;
  wantAmount: number;
  offerGold: number;
  patience: number;
  maxPatience: number;
  walkClock: number;
  bubble: THREE.Sprite;
  served: boolean;
  currentClip: string;
}

interface CarrierData {
  group: THREE.Group;
  visual: THREE.Group;
  type: 'log' | 'plank';
  state: 'toSource' | 'toTarget';
  carriedItem: THREE.Object3D | null;
}

interface TweenData {
  elapsed: number;
  duration: number;
  update: (progress: number) => void;
  complete?: () => void;
}


const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: ${id}`);
  return element as T;
};

const gameRoot = getElement<HTMLDivElement>('game');
const goldCount = getElement<HTMLElement>('gold-count');
const woodCount = getElement<HTMLElement>('wood-count');
const upgradesButton = getElement<HTMLButtonElement>('upgrades-button');
const upgradePanel = getElement<HTMLElement>('upgrade-panel');
const backdrop = getElement<HTMLElement>('panel-backdrop');
const stockCount = getElement<HTMLElement>('stock-count');
const skillBadge = getElement<HTMLElement>('skill-badge');
const skillPointsNote = getElement<HTMLElement>('skill-points');
const levelValue = getElement<HTMLElement>('level-value');
const levelFill = getElement<HTMLElement>('level-fill');
const levelText = getElement<HTMLElement>('level-text');
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
  private sfxLimiter: DynamicsCompressorNode | null = null;
  private lastSfx = new Map<string, number>();
  private musicTimer: number | null = null;
  private musicStep = 0;
  musicLevel = Number(localStorage.getItem('forest-trader-music') ?? 55) / 100;
  sfxLevel = Number(localStorage.getItem('forest-trader-sfx') ?? 80) / 100;

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.sfxLimiter = this.context.createDynamicsCompressor();
      this.sfxLimiter.threshold.value = -20;
      this.sfxLimiter.knee.value = 8;
      this.sfxLimiter.ratio.value = 12;
      this.sfxLimiter.attack.value = 0.003;
      this.sfxLimiter.release.value = 0.12;
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.sfxLimiter).connect(this.context.destination);
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
    this.sfxGain?.gain.setTargetAtTime(this.sfxLevel * 0.28, this.context.currentTime, 0.025);
  }

  private canPlay(key: string, cooldown: number) {
    if (!this.context) return false;
    const now = this.context.currentTime;
    const lastPlayed = this.lastSfx.get(key) ?? -Infinity;
    if (now - lastPlayed < cooldown) return false;
    this.lastSfx.set(key, now);
    return true;
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

  button() {
    if (!this.canPlay('button', 0.08)) return;
    this.tone(520, 0.08, { type: 'sine', gain: 0.12, slide: 120 });
  }
  chop() {
    if (!this.canPlay('chop', 0.11)) return;
    this.noise(0.09, 0.24, 1200);
    this.tone(105, 0.14, { type: 'triangle', gain: 0.3, slide: -34 });
    this.tone(740, 0.055, { type: 'square', gain: 0.045 });
  }
  treeFall() {
    if (!this.canPlay('tree-fall', 0.45)) return;
    this.noise(0.48, 0.28, 520);
    this.tone(82, 0.5, { type: 'sawtooth', gain: 0.22, slide: -45 });
  }
  pickup() {
    if (!this.canPlay('pickup', 0.18)) return;
    this.tone(440, 0.11, { gain: 0.15, slide: 180 });
    this.tone(710, 0.12, { gain: 0.1, delay: 0.075, slide: 80 });
  }
  logDrop(index = 0) {
    if (!this.canPlay('log-drop', 0.11)) return;
    this.tone(145 + index * 18, 0.1, { type: 'triangle', gain: 0.17, slide: -35 });
    this.noise(0.055, 0.08, 420);
  }
  unload() {
    if (!this.canPlay('unload', 0.13)) return;
    this.tone(190, 0.12, { type: 'triangle', gain: 0.23, slide: -45 });
    this.tone(330, 0.08, { gain: 0.08, delay: 0.045 });
  }
  coin() {
    if (!this.canPlay('coin', 0.22)) return;
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
// Referans arcade-idle oyunlarındaki yüksek, dengeli izometrik görünüm:
// kapıya sağdan çapraz bakar, ana yol ekranda sol alttan sağ üste doğru
// okunur ve perspektif bozulmadan zeminin iki ekseni de belirgin görünür.
const cameraOffset = new THREE.Vector3(15, 28, 15);
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

// Sahne kurulmadan önce tüm modeller belleğe alınır; aşağıdaki dünya kurulumu
// bunlara senkron erişebilsin diye modül seviyesinde bekleniyor.
await loadModels();

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
mainPath.rotation.z = 0;
mainPath.position.y = 0.012;
mainPath.receiveShadow = true;
world.add(mainPath);

// Tüm oyun yolun batısındaki çevrili arazide geçer. Oyuncu araziden hiç
// çıkmaz; alıcılar yoldan gelip yalnızca tezgâhın dış yüzüne kadar
// yaklaşabilir. Çit bu iki tarafı ayıran tek sınırdır.
const COMPOUND_EAST = -5;
let COMPOUND_WEST = -32.0;
const COUNTER_WIDTH = 3.2;

interface PlotData {
  minZ: number;
  maxZ: number;
  tier: number;
  unlocked: boolean;
  cost: number;
  fences: THREE.Group[];
  trees: TreeData[];
}

const plots: PlotData[] = [
  { minZ: -14, maxZ: 14, tier: 0, unlocked: true, cost: 0, fences: [], trees: [] },
  { minZ: -32, maxZ: -14, tier: 1, unlocked: false, cost: 20, fences: [], trees: [] },
  { minZ: 14, maxZ: 32, tier: 2, unlocked: false, cost: 50, fences: [], trees: [] },
  { minZ: -32, maxZ: 32, tier: 2, unlocked: false, cost: 80, fences: [], trees: [] },
];

const stationBuildPosition = new THREE.Vector3(-22, 0, 7.5);
const sawmillBuildPosition = new THREE.Vector3(-22, 0, -7.5);
const logClerkBuildPosition = new THREE.Vector3(-9.5, 0, 6.5);
const plankClerkBuildPosition = new THREE.Vector3(-9.5, 0, -6.5);
const logCarrierBuildPosition = new THREE.Vector3(-15.5, 0, 7.5);
const plankCarrierBuildPosition = new THREE.Vector3(-15.5, 0, -7.5);

// Alıcıların tezgâha yanaştığı kısa toprak alan; yolun batı kenarına bağlanır.
const traderPath = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 18), pathMaterial);
traderPath.rotation.x = -Math.PI / 2;
traderPath.position.set(COMPOUND_EAST + 1.9, 0.018, 0);
traderPath.receiveShadow = true;
world.add(traderPath);

// Arazi zemini: çitin içi otlak olarak biraz daha koyu okunur.
const compoundGround = new THREE.Mesh(
  new THREE.PlaneGeometry(COMPOUND_EAST - COMPOUND_WEST, 68),
  new THREE.MeshStandardMaterial({ color: 0x6fa348, roughness: 1 }),
);
compoundGround.rotation.x = -Math.PI / 2;
compoundGround.position.set((COMPOUND_EAST + COMPOUND_WEST) / 2, 0.012, 0);
compoundGround.position.set((COMPOUND_EAST + COMPOUND_WEST) / 2, 0.012, 0);
compoundGround.receiveShadow = true;
world.add(compoundGround);

const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9f5c2d, roughness: 0.85 });
const woodEndMaterial = new THREE.MeshStandardMaterial({ color: 0xe1ad63, roughness: 0.9 });
const darkTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x573a22, roughness: 1 });
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
const keys = new Set<string>();

const state = {
  gold: 0,
  carried: 0,
  carriedValue: 0,
  pendingCollection: 0,
  // İstasyondaki kütük sayısı ve o kütüklerin toplam ham değeri. Derin ormandan
  // gelen odun daha pahalı olduğu için stok tek bir ortalama fiyat taşır.
  stock: 0,
  stockValue: 0,
  // Bıçkıhane çıktısı. Tahta kütükten belirgin pahalıdır, bu yüzden ayrı
  // stok ve ayrı ortalama değer taşır.
  // Bıçkıhane girdi kütükleri ve çıktı tahtaları
  sawmillInputLogs: 0,
  sawmillOutputPlanks: 0,
  carriedPlanks: 0,
  logStallStock: 0,
  plankStallStock: 0,
  sawmillBuilt: false,
  clerkHired: false,
  capacity: 5,
  damage: 1,
  speed: 4.8,
  axeInterval: 1,
  xp: 0,
  level: 1,
  skillPoints: 0,
  skills: { damage: 1, axeSpeed: 1, capacity: 1, speed: 1, haggle: 1 } as Record<SkillKind, number>,
};

let logTrader!: TraderPost;
let plankTrader!: TraderPost;
let customerSpawnClock = 5;
let ambientTime = 0;
const carriers: CarrierData[] = [];

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

const banknoteTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 112;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.fillStyle = '#23b957';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#d9ffd9';
  context.lineWidth = 9;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = '#0b7d3a';
  context.beginPath();
  context.ellipse(canvas.width / 2, canvas.height / 2, 48, 37, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f4ffd9';
  context.font = 'bold 58px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('$', canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
})();

const makeBanknoteMesh = () => {
  const group = new THREE.Group();
  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.055, 0.29),
    new THREE.MeshStandardMaterial({ color: 0x20bf55, roughness: 0.68 }),
  );
  note.castShadow = true;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.47, 0.26),
    new THREE.MeshBasicMaterial({ map: banknoteTexture, transparent: true }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.029;
  group.add(note, face);
  return group;
};

const player = new THREE.Group();
// Oyuncu arazinin içinde, tezgâhın hemen batısında başlar.
player.position.set(-8, 0, 2);
scene.add(player);

// Oyuncu artık animasyonlu bir GLB. Yürüme/kesme/taşıma durumları klipler
// arasında yumuşak geçişle sürülüyor.
const PLAYER_HEIGHT = 1.62;
const playerVisual = instantiate('player', PLAYER_HEIGHT);
// Model +z yönüne bakıyor, hareket matematiği ise -z varsayıyor. Görseli
// çevirmek yürüme ve balta vuruşunun ikisini birden düzeltir.
playerVisual.rotation.y = Math.PI;
player.add(playerVisual);

const playerMixer = new THREE.AnimationMixer(playerVisual);
const playerActions = new Map<string, THREE.AnimationAction>();
const playerAction = (clipName: string) => {
  const existing = playerActions.get(clipName);
  if (existing) return existing;
  const clip = findClip('player', clipName);
  const action = playerMixer.clipAction(clip);
  playerActions.set(clipName, action);
  return action;
};

let currentPlayerClip = '';
const playPlayerClip = (clipName: string, fade = 0.18) => {
  if (currentPlayerClip === clipName) return;
  const next = playerAction(clipName);
  const previous = currentPlayerClip ? playerAction(currentPlayerClip) : null;
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  previous?.fadeOut(fade);
  currentPlayerClip = clipName;
};
playPlayerClip('idle', 0);

// Balta karakterin sağ eline takılır; yetenek yükseltilince modeli değişir.
const axeHolder = new THREE.Group();
let axeModel = instantiate('axe', 0.62);
axeHolder.add(axeModel);
axeHolder.visible = false;

const playerHand = (() => {
  let found: THREE.Object3D | null = null;
  playerVisual.traverse((child) => {
    if (found) return;
    if (/hand/i.test(child.name) && /r/i.test(child.name)) found = child;
  });
  return found;
})();
if (playerHand) (playerHand as THREE.Object3D).add(axeHolder);
else player.add(axeHolder);

const setAxeModel = (upgraded: boolean) => {
  axeHolder.remove(axeModel);
  axeModel = instantiate(upgraded ? 'axe-upgraded' : 'axe', 0.62);
  axeHolder.add(axeModel);
};

const BUYER_MODELS = ['buyer-b', 'buyer-c', 'buyer-d', 'buyer-e', 'buyer-f', 'buyer-g'] as const;

const createCustomerVisual = (variant: number) => {
  const name = BUYER_MODELS[Math.abs(variant) % BUYER_MODELS.length];
  const visual = instantiate(name, PLAYER_HEIGHT);
  visual.rotation.y = Math.PI;
  const mixer = new THREE.AnimationMixer(visual);
  visual.userData.mixer = mixer;
  visual.userData.modelName = name;
  return visual;
};

const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0.68);
player.add(stackGroup);

const stackMeshes: THREE.Object3D[] = [];

const rebuildPlayerStack = () => {
  for (const mesh of stackMeshes) stackGroup.remove(mesh);
  stackMeshes.length = 0;
  const carriedLogs = Math.max(0, state.carried - state.carriedPlanks);
  for (let index = 0; index < state.carried; index += 1) {
    const isPlank = index >= carriedLogs;
    const item = isPlank ? instantiate('resource-wood', 0.45) : makeLogMesh(0.78);
    item.position.set(0, 0.34 + index * 0.235, 0);
    item.rotation.x = index % 2 === 0 ? 0.025 : -0.025;
    stackGroup.add(item);
    stackMeshes.push(item);
  }
};

// Orman kademeleri. Ağaçlar yenilenmediği için oyuncu yakını tükettikçe
// derine inmek zorunda kalır; derindeki ağaç daha uzun kesilir ama daha çok ve
// daha değerli kütük verir, böylece yürüme mesafesi kendini amorti eder.
const forestTiers = [
  { hp: 3, logs: 5, value: 25 },
  { hp: 6, logs: 6, value: 50 },
  { hp: 10, logs: 8, value: 90 },
];

const makeTree = (position: THREE.Vector3, tier: number, plotIndex: number, variant = 0) => {
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

  const safeTier = Math.min(tier, TIER_MODELS.length - 1);
  const trunk = instantiate(TIER_MODELS[safeTier], TIER_HEIGHTS[safeTier]);
  trunk.rotation.y = variant * 1.7;
  group.add(trunk);

  const healthBar = new THREE.Group();
  healthBar.position.set(0, TIER_HEIGHTS[safeTier] + 0.5, 0);
  healthBar.visible = false;
  const barBack = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.18), new THREE.MeshBasicMaterial({ color: 0x3b2f23 }));
  const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.11), new THREE.MeshBasicMaterial({ color: 0xf1cc45 }));
  barFill.name = 'fill';
  barFill.position.z = 0.01;
  healthBar.add(barBack, barFill);
  group.add(healthBar);

  world.add(group);
  const config = forestTiers[safeTier];
  const tree: TreeData = {
    group,
    healthBar,
    rangeIndicator,
    home: position.clone(),
    hp: config.hp,
    maxHp: config.hp,
    tier: safeTier,
    plotIndex,
    logs: config.logs,
    logValue: config.value,
    alive: true,
  };
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child === barBack || child === barFill) return;
    child.userData.tree = tree;
    child.userData.occludable = true;
    // Her ağaca kendi özel materyal kopyası verilir; tek bir ağaç transparan olunca tüm orman etkilenmez.
    child.material = (child.material as THREE.Material).clone();
    const material = child.material as THREE.Material;
    material.transparent = true;
    treeOccluderMeshes.push(child);
  });
  trees.push(tree);
  const plot = plots[plotIndex];
  if (plot) plot.trees.push(tree);
  tree.group.visible = plot?.unlocked ?? true;
  tree.rangeIndicator.visible = false;
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
  // Kamera açısıyla hizalanması için düzlem içinde çeyrek tur döndürülür.
  label.rotation.z = Math.PI / 2;
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

const structureOccluderMeshes: THREE.Mesh[] = [];

const registerStructureOccluder = (group: THREE.Group) => {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !(child.geometry instanceof THREE.RingGeometry) && !(child.geometry instanceof THREE.PlaneGeometry)) {
      child.material = (child.material as THREE.Material).clone();
      child.material.transparent = true;
      child.userData.structureGroup = group;
      child.userData.baseOpacity = child.material.opacity ?? 1.0;
      structureOccluderMeshes.push(child);
    }
  });
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
  registerStructureOccluder(group);
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

const createBuildZone = (
  position: THREE.Vector3,
  spawnOffset: THREE.Vector3,
  cost: ResourceCost,
  onComplete: () => void,
  completeMessage: string,
  active = true,
) => {
  const group = new THREE.Group();
  group.position.copy(position);
  group.visible = active;
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
  progressFill.rotation.z = Math.PI / 2;
  progressFill.position.set(progressWidth / 2, 0.045, 0);
  progressFill.scale.y = 0.001;
  group.add(progressFill);

  const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 });
  const edge = padSize + 0.1;
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(edge, 0.075, 0.11), new THREE.Vector3(0, 0.075, -edge / 2), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(edge / 2, 0.075, 0), borderMaterial);
  addBox(group, new THREE.Vector3(0.11, 0.075, edge), new THREE.Vector3(-edge / 2, 0.075, 0), borderMaterial);

  const label = makePurchaseLabel(0, cost.amount, cost.type);
  // Etiket bir UI sprite'ı değil; satın alma karesine basılmış yatay dünya işaretidir.
  label.position.set(0, 0.062, 0);
  group.add(label);
  world.add(group);
  const zone: BuildZoneData = {
    group,
    position: position.clone(),
    spawnPosition: position.clone().add(spawnOffset),
    label,
    progressFill,
    progressWidth,
    cost,
    paid: 0,
    built: false,
    active,
    paymentClock: 0,
    onComplete,
    completeMessage,
  };
  buildZones.push(zone);
  return zone;
};

// Referans görseldeki pazar tezgâhı: tenteli ahşap kulübe, yola bakan açık bir
// satış yüzü ve önünde alıcıların dizildiği boş alan. Tavernanın aksine
// aşamalı kurulmaz — üs oyunun başından beri buradan işler.
// Takas tezgâhı çitin üstünde bir sınırdır: oyuncu batı (iç) yüzünde durur,
// alıcılar doğu (yol) yüzüne gelir. Üstten bakışta hiçbir şeyi örtmemesi için
// bilerek çatısızdır — girilebilen hiçbir yapıya çatı koymuyoruz.
const createTradingPost = (position: THREE.Vector3, isPlankPost = false): TraderPost => {
  const group = new THREE.Group();
  group.position.copy(position);

  const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.85 });
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0xc9a065, roughness: 0.9 });

  // Tezgâh gövdesi ve üst tablası; çit hattı boyunca uzanır. Alçak tutulur ki
  // üstten bakışta arkasındaki oyuncuyu ve alıcıları kapatmasın.
  addBox(group, new THREE.Vector3(0.5, 0.78, COUNTER_WIDTH), new THREE.Vector3(0, 0.39, 0), counterMaterial);
  addBox(group, new THREE.Vector3(0.94, 0.14, COUNTER_WIDTH + 0.36), new THREE.Vector3(0, 0.85, 0), topMaterial);

  // Tezgâhın iki ucundaki kısa direkler, çite bağlandığını okutur.
  for (const z of [-(COUNTER_WIDTH / 2) - 0.2, COUNTER_WIDTH / 2 + 0.2]) {
    addBox(group, new THREE.Vector3(0.22, 1.16, 0.22), new THREE.Vector3(0, 0.58, z), darkTrunkMaterial);
  }

  // Tezgâhta sergilenen satılık mal.
  const stockPile = new THREE.Group();
  stockPile.position.set(0, 0.93, 0);
  group.add(stockPile);

  // Oyuncunun satışı tetiklemek için durduğu halka (iç taraf).
  const sellRing = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.22, 36),
    new THREE.MeshBasicMaterial({ color: isPlankPost ? 0xe5aa53 : 0x8fe06a, transparent: true, opacity: 0.68, side: THREE.DoubleSide }),
  );
  sellRing.rotation.x = -Math.PI / 2;
  sellRing.position.set(-1.5, 0.05, 0);
  group.add(sellRing);

  world.add(group);
  registerStructureOccluder(group);

  return {
    group,
    position: position.clone(),
    sellPosition: position.clone().add(new THREE.Vector3(-1.5, 0, 0)),
    stockPile,
    // Alıcılar tezgâhın önünde doğu yönünde (+X ekseni) tek sıra hâlinde arka arkaya dizilir.
    slots: [0, 1.4, 2.8, 4.2].map((xOffset) => position.clone().add(new THREE.Vector3(1.7 + xOffset, 0, 0))),
    spawnPosition: position.clone().add(new THREE.Vector3(7.5, 0, 0)),
    exitPosition: position.clone().add(new THREE.Vector3(7.5, 0, 2.5)),
    colliders: [
      { center: position.clone(), halfX: 0.45, halfZ: COUNTER_WIDTH / 2 + 0.3 },
    ],
  };
};

// Tezgâhtaki kütük yığını istasyon stoğunu yansıtır; kalabalık olmasın diye
// görsel olarak sınırlanır.
const rebuildTraderStock = () => {
  if (logTrader) {
    logTrader.stockPile.clear();
    const shown = Math.min(state.logStallStock, 12);
    for (let index = 0; index < shown; index += 1) {
      const log = makeLogMesh(0.72);
      const col = index % 3;
      const row = Math.floor(index / 3);
      log.rotation.set(0, 0, Math.PI / 2);
      log.position.set(-0.15, 0.15 + row * 0.24, (col - 1) * 0.68);
      logTrader.stockPile.add(log);
    }
  }
  if (plankTrader) {
    plankTrader.stockPile.clear();
    const shown = Math.min(state.plankStallStock, 12);
    for (let index = 0; index < shown; index += 1) {
      const plank = instantiate('resource-wood', 0.45);
      const col = index % 3;
      const row = Math.floor(index / 3);
      plank.position.set(-0.15, 0.12 + row * 0.18, (col - 1) * 0.62);
      plankTrader.stockPile.add(plank);
    }
  }
};

const seededRandom = (() => {
  let seed = 47821;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
})();

// Üs merkezi: ağaç kademeleri bu noktaya olan uzaklığa göre belirlenir.
// Arazi içindeki yapıların çevresi ağaçsız kalmalı ki yollar tıkanmasın.
const PLAYER_SPAWN = new THREE.Vector3(-8, 0, 0);

const ALL_RESERVED_POSITIONS: THREE.Vector3[] = [
  PLAYER_SPAWN,
  stationBuildPosition,
  sawmillBuildPosition,
  logClerkBuildPosition,
  plankClerkBuildPosition,
  logCarrierBuildPosition,
  plankCarrierBuildPosition,
  new THREE.Vector3(COMPOUND_EAST, 0, 6.5),
  new THREE.Vector3(COMPOUND_EAST, 0, -6.5),
  new THREE.Vector3(-18.5, 0, -12.0),
  new THREE.Vector3(-18.5, 0, 12.0),
  new THREE.Vector3(-29.5, 0, 0),
];

const isClearForTree = (position: THREE.Vector3) => {
  if (position.x > COMPOUND_EAST - 2.6 || position.x < COMPOUND_WEST + 1.4) return false;
  if (ALL_RESERVED_POSITIONS.some((pos) => position.distanceTo(pos) < 4.8)) return false;
  return trees.every((tree) => position.distanceTo(tree.group.position) > 2.8);
};

const TIER_MODELS = ['tree-near', 'tree-mid', 'tree-deep'] as const;
const TIER_HEIGHTS = [3.6, 4.4, 5.2];

const populatePlot = (plot: PlotData) => {
  const plotIndex = plots.indexOf(plot);
  const area = (plot.maxZ - plot.minZ) * (COMPOUND_EAST - COMPOUND_WEST);
  const target = Math.round(area / 7.5);
  for (let index = 0; index < target; index += 1) {
    let position = new THREE.Vector3();
    let attempts = 0;
    do {
      position.x = COMPOUND_WEST + 1.8 + seededRandom() * (COMPOUND_EAST - COMPOUND_WEST - 3.6);
      position.z = plot.minZ + 1.8 + seededRandom() * (plot.maxZ - plot.minZ - 3.6);
      attempts += 1;
    } while (!isClearForTree(position) && attempts < 40);
    if (attempts < 40) makeTree(position, plot.tier, plotIndex);
  }
};

// Çit: arazi sınırını çizer. Doğu hattında tezgâh için boşluk bırakılır, çünkü
// alıcılar oraya yanaşır; oyuncu o boşluktan geçemez, tezgâh onu kapatır.
// Çit modeli tek bir panel; kesintisiz görünmesi için panel genişliği kadar
// aralıklarla dizilir. Ayrı korkuluk eklenmez, yoksa model kendiyle çakışır.
const FENCE_PANEL_HEIGHT = 1.15;
// Panel modeli genişliği kendi yüksekliğine oranla sabit; bu orandan gelen
// gerçek genişlik, panelleri boşluksuz dizmek için gerekiyor.
const FENCE_PANEL_WIDTH = 1.1;
const createFenceRun = (from: THREE.Vector3, to: THREE.Vector3) => {
  const span = to.clone().sub(from);
  const length = span.length();
  const fence = new THREE.Group();
  if (length < 0.2) return fence;
  const panels = Math.max(1, Math.round(length / FENCE_PANEL_WIDTH));
  // Panelin kendi +X ekseni hat boyunca uzanacak şekilde döndürülür.
  const angle = Math.atan2(-span.z, span.x);
  for (let index = 0; index < panels; index += 1) {
    const panel = instantiate('fence', FENCE_PANEL_HEIGHT);
    panel.position.copy(from).addScaledVector(span, (index + 0.5) / panels);
    panel.rotation.y = angle;
    panel.scale.x = (length / panels) / FENCE_PANEL_WIDTH;
    fence.add(panel);
  }
  world.add(fence);
  return fence;
};

logTrader = createTradingPost(new THREE.Vector3(COMPOUND_EAST, 0, 6.5), false);
plankTrader = createTradingPost(new THREE.Vector3(COMPOUND_EAST, 0, -6.5), true);
plankTrader.group.visible = false;

// Tahta Tezgâhı henüz açılmamışken yoldaki boşluğu dolduran geçici çit.
const plankStallFillerFence = createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, -4.9), new THREE.Vector3(COMPOUND_EAST, 0, -8.1));

// Her parçanın kendi çiti var; parça açılınca aradaki bölme kaldırılır.
// Yalnızca yol sınırı çitle ayrılır. Oyuncunun arazisi batı, kuzey ve güneyde
// açık kalır — kafeste hissettirmemek için kasıtlı; oyuncuyu tutan şey çit
// değil, arazi sınırı.
const buildPlotFences = (plot: PlotData, index: number) => {
  const runs: THREE.Group[] = [];
  if (index === 0) {
    // Doğu hattı: Tezgâh boşlukları hariç milimetrik kesintisiz çit.
    runs.push(createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, plot.maxZ), new THREE.Vector3(COMPOUND_EAST, 0, 8.1)));
    runs.push(createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, 4.9), new THREE.Vector3(COMPOUND_EAST, 0, -4.9)));
    runs.push(createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, -8.1), new THREE.Vector3(COMPOUND_EAST, 0, plot.minZ)));
  } else if (index === 1) {
    // Kuzey Genişlemesi (Plot 1): Doğu çiti tam aynı açı ile güneyden kuzeye değil, kuzeyden güneye çizilir.
    runs.push(createFenceRun(new THREE.Vector3(-32, 0, -32), new THREE.Vector3(COMPOUND_EAST, 0, -32)));
    runs.push(createFenceRun(new THREE.Vector3(-32, 0, -32), new THREE.Vector3(-32, 0, -14)));
    runs.push(createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, -14), new THREE.Vector3(COMPOUND_EAST, 0, -32)));
  } else if (index === 2) {
    // Güney Genişlemesi (Plot 2): Doğu çiti tam aynı açı için (32 -> 14) yönünde çizilir.
    runs.push(createFenceRun(new THREE.Vector3(-32, 0, 32), new THREE.Vector3(COMPOUND_EAST, 0, 32)));
    runs.push(createFenceRun(new THREE.Vector3(-32, 0, 14), new THREE.Vector3(-32, 0, 32)));
    runs.push(createFenceRun(new THREE.Vector3(COMPOUND_EAST, 0, 32), new THREE.Vector3(COMPOUND_EAST, 0, 14)));
  } else if (index === 3) {
    // Batı Genişlemesi (Plot 3 - Tezgâhların Tam Karşısı!): Dış sınır çitleri (Batı X = -56, Kuzey & Güney uzantıları)
    runs.push(createFenceRun(new THREE.Vector3(-56, 0, -32), new THREE.Vector3(-56, 0, 32)));
    runs.push(createFenceRun(new THREE.Vector3(-56, 0, -32), new THREE.Vector3(-32, 0, -32)));
    runs.push(createFenceRun(new THREE.Vector3(-56, 0, 32), new THREE.Vector3(-32, 0, 32)));
  }
  plot.fences = runs;
  for (const run of runs) run.visible = plot.unlocked;
};

// Kilitli parçaları ayıran ara çitler; parça satın alınınca kaldırılır.
const dividerFences: THREE.Group[] = [
  createFenceRun(new THREE.Vector3(COMPOUND_WEST, 0, -14), new THREE.Vector3(COMPOUND_EAST, 0, -14)),
  createFenceRun(new THREE.Vector3(COMPOUND_WEST, 0, 14), new THREE.Vector3(COMPOUND_EAST, 0, 14)),
  createFenceRun(new THREE.Vector3(-32, 0, -14), new THREE.Vector3(-32, 0, 14)),
];

plots.forEach(buildPlotFences);
plots.forEach(populatePlot);

const createRock = (position: THREE.Vector3, scale: number) => {
  const rock = instantiate(seededRandom() > 0.5 ? 'rock-a' : 'rock-b', scale);
  rock.position.copy(position);
  rock.rotation.y = seededRandom() * Math.PI * 2;
  world.add(rock);
};

// Yolun doğusu oynanmayan manzara: seyrek ağaç ve kaya ile doldurulur.
for (let index = 0; index < 26; index += 1) {
  const position = new THREE.Vector3(6 + seededRandom() * 18, 0, (seededRandom() - 0.5) * 60);
  const scenery = instantiate(TIER_MODELS[index % 3], 3.4 + seededRandom() * 1.4);
  scenery.position.copy(position);
  scenery.rotation.y = seededRandom() * Math.PI * 2;
  world.add(scenery);
}
for (let index = 0; index < 18; index += 1) {
  const position = new THREE.Vector3(5.5 + seededRandom() * 19, 0, (seededRandom() - 0.5) * 62);
  createRock(position, 0.4 + seededRandom() * 0.5);
}

createBuildZone(
  stationBuildPosition,
  new THREE.Vector3(),
  { type: 'wood', amount: 1 },
  () => createStation(stationBuildPosition, true),
  'Kütük bırakma istasyonu kuruldu!',
);

// Parça açılınca aradaki bölme çiti kalkar, o parçanın ağaçları görünür olur
// ve oyuncunun gezebildiği alan genişler.
const unlockPlot = (index: number) => {
  const plot = plots[index];
  plot.unlocked = true;
  for (const run of plot.fences) run.visible = true;
  for (const tree of plot.trees) tree.group.visible = true;
  for (const tree of trees) {
    if (tree.plotIndex === index) {
      tree.group.visible = true;
    }
  }
  const divider = dividerFences[index - 1];
  if (divider) {
    world.remove(divider);
    divider.visible = false;
  }
  if (index === 3) {
    COMPOUND_WEST = -56.0;
    compoundGround.geometry.dispose();
    compoundGround.geometry = new THREE.PlaneGeometry(COMPOUND_EAST - COMPOUND_WEST, 68);
    compoundGround.position.set((COMPOUND_EAST + COMPOUND_WEST) / 2, 0.012, 0);
  }
  spawnParticles(new THREE.Vector3(index === 3 ? -35 : -18, 0.8, index === 1 ? -20 : (index === 2 ? 20 : 0)), 0x9fdc61, 22);
};

plots.forEach((plot, index) => {
  if (index === 0) return;
  // 3 Yöne Nizami Genişleme Kareleri: Çitin tam ortasında ve oyuncunun iç alanında
  const targetPos = index === 1
    ? new THREE.Vector3(-18.5, 0, -12.0)
    : index === 2
      ? new THREE.Vector3(-18.5, 0, 12.0)
      : new THREE.Vector3(-29.5, 0, 0);
  createBuildZone(
    targetPos,
    new THREE.Vector3(),
    { type: 'money', amount: plot.cost },
    () => unlockPlot(index),
    index === 1 ? 'Kuzey ormanı açıldı!' : (index === 2 ? 'Güney ormanı açıldı!' : 'Batı ormanı açıldı!'),
  );
});

// Bıçkıhane istasyondaki ham kütüğü zamanla tahtaya çevirir. Oyuncunun
// müdahalesi gerekmez; tek şartı istasyonda kütük olması.
const sawmillInputPile = new THREE.Group();
const plankPile = new THREE.Group();

const createSawmill = () => {
  const group = new THREE.Group();
  group.position.copy(sawmillBuildPosition);
  group.add(instantiate('workbench', 1.35));
  const logCrate = instantiate('crate', 0.8);
  logCrate.position.set(-1.25, 0, 0.4);
  group.add(logCrate);
  sawmillInputPile.position.set(-1.25, 0.4, 0.4);
  group.add(sawmillInputPile);
  plankPile.position.set(1.3, 0, 0);
  group.add(plankPile);
  world.add(group);
  registerStructureOccluder(group);
  group.scale.setScalar(0.02);
  addTween(0.7, (progress) => group.scale.setScalar(easeOutBack(progress)), () => group.scale.setScalar(1));
  state.sawmillBuilt = true;
  plankTrader.group.visible = true;
  showToast('Bıçkıhane ve Tahta Tezgâhı kuruldu!');
};

const rebuildSawmillInputPile = () => {
  sawmillInputPile.clear();
  const count = Math.min(state.sawmillInputLogs, 6);
  for (let i = 0; i < count; i += 1) {
    const log = makeLogMesh(0.5);
    log.position.set(0, i * 0.14, 0);
    sawmillInputPile.add(log);
  }
};

const rebuildPlankPile = () => {
  plankPile.clear();
  const shown = Math.min(state.sawmillOutputPlanks, 10);
  for (let index = 0; index < shown; index += 1) {
    const plank = instantiate('resource-wood', 0.28);
    plank.position.set(0, index * 0.16, (index % 2) * 0.12);
    plankPile.add(plank);
  }
};

let sawClock = 0;
let sawUnloadClock = 0;
let sawUnloadStreak = 0;
let sawCollectClock = 0;
let sawCollectStreak = 0;
const SAW_INTERVAL = 2.4;

const updateSawmill = (delta: number) => {
  if (!state.sawmillBuilt) return;
  const distance = player.position.distanceTo(sawmillBuildPosition);

  // 1. Oyuncu kütük bırakma: Bıçkıhaneye yakınsa ve elinde/sırtta kütük varsa üstel hızla bırakır.
  if (distance < 2.5 && state.carried > state.carriedPlanks) {
    sawUnloadClock += delta;
    const targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, sawUnloadStreak));
    if (sawUnloadClock >= targetInterval) {
      sawUnloadClock = 0;
      sawUnloadStreak += 1;
      state.carried -= 1;
      state.sawmillInputLogs += 1;
      rebuildPlayerStack();
      rebuildSawmillInputPile();
      audio.unload();
    }
  } else {
    sawUnloadClock = 0;
    sawUnloadStreak = 0;
  }

  // 2. Bıçkıhane işleme (girdide kütük varsa tahtaya dönüştürür)
  if (state.sawmillInputLogs > 0) {
    sawClock += delta;
    if (sawClock >= SAW_INTERVAL) {
      sawClock = 0;
      state.sawmillInputLogs -= 1;
      state.sawmillOutputPlanks += 1;
      rebuildSawmillInputPile();
      rebuildPlankPile();
      bounceGroup(plankPile);
    }
  } else {
    sawClock = 0;
  }

  // 3. Oyuncu tahta toplama: Oyuncu yakınsa, sırtında yer varsa ve tahta üretildiğinde üstel hızla alır.
  if (distance < 2.5 && state.carried < state.capacity && state.sawmillOutputPlanks > 0) {
    sawCollectClock += delta;
    const targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, sawCollectStreak));
    if (sawCollectClock >= targetInterval) {
      sawCollectClock = 0;
      sawCollectStreak += 1;
      state.sawmillOutputPlanks -= 1;
      state.carried += 1;
      state.carriedPlanks += 1;
      rebuildPlayerStack();
      rebuildPlankPile();
      audio.pickup();
    }
  } else {
    sawCollectClock = 0;
    sawCollectStreak = 0;
  }
};

const spawnLogCarrier = () => {
  const group = new THREE.Group();
  group.position.copy(stationBuildPosition).add(new THREE.Vector3(0, 0, 2.2));
  const visual = createCustomerVisual(5);
  group.add(visual);
  world.add(group);
  const mixer = visual.userData.mixer as THREE.AnimationMixer;
  mixer.clipAction(findClip(visual.userData.modelName, 'walk')).play();
  carriers.push({
    group,
    visual,
    type: 'log',
    state: 'toSource',
    carriedItem: null,
  });
  showToast('Kütük Taşıyıcısı işe alındı!');
};

const spawnPlankCarrier = () => {
  const group = new THREE.Group();
  group.position.copy(sawmillBuildPosition).add(new THREE.Vector3(0, 0, 2.2));
  const visual = createCustomerVisual(7);
  group.add(visual);
  world.add(group);
  const mixer = visual.userData.mixer as THREE.AnimationMixer;
  mixer.clipAction(findClip(visual.userData.modelName, 'walk')).play();
  carriers.push({
    group,
    visual,
    type: 'plank',
    state: 'toSource',
    carriedItem: null,
  });
  showToast('Tahta Taşıyıcısı işe alındı!');
};

const hireLogClerk = () => {
  const group = new THREE.Group();
  group.position.copy(logTrader.sellPosition);
  const visual = createCustomerVisual(2);
  group.add(visual);
  group.rotation.y = Math.PI / 2;
  world.add(group);
  const mixer = visual.userData.mixer as THREE.AnimationMixer;
  mixer.clipAction(findClip(visual.userData.modelName, 'idle')).play();
  state.clerkHired = true;
  showToast('Kütük Satıcısı işe alındı!');
};

const hirePlankClerk = () => {
  const group = new THREE.Group();
  group.position.copy(plankTrader.sellPosition);
  const visual = createCustomerVisual(3);
  group.add(visual);
  group.rotation.y = Math.PI / 2;
  world.add(group);
  const mixer = visual.userData.mixer as THREE.AnimationMixer;
  mixer.clipAction(findClip(visual.userData.modelName, 'idle')).play();
  showToast('Tahta Satıcısı işe alındı!');
};

const createStationAndUnlockZones = () => {
  createStation(stationBuildPosition, true);
  createBuildZone(
    logClerkBuildPosition,
    new THREE.Vector3(),
    { type: 'money', amount: 30 },
    hireLogClerk,
    'Kütük Satıcısı işe alındı!',
  );
  createBuildZone(
    logCarrierBuildPosition,
    new THREE.Vector3(),
    { type: 'money', amount: 25 },
    spawnLogCarrier,
    'Kütük Taşıyıcısı işe alındı!',
  );
  createBuildZone(
    sawmillBuildPosition,
    new THREE.Vector3(),
    { type: 'money', amount: 15 },
    createSawmillAndUnlockZones,
    'Bıçkıhane kuruldu! Kütükler tahtaya dönüşüyor.',
  );
};

const createSawmillAndUnlockZones = () => {
  createSawmill();
  if (plankStallFillerFence) {
    world.remove(plankStallFillerFence);
    plankStallFillerFence.visible = false;
  }
  createBuildZone(
    plankClerkBuildPosition,
    new THREE.Vector3(),
    { type: 'money', amount: 40 },
    hirePlankClerk,
    'Tahta Satıcısı işe alındı!',
  );
  createBuildZone(
    plankCarrierBuildPosition,
    new THREE.Vector3(),
    { type: 'money', amount: 35 },
    spawnPlankCarrier,
    'Tahta Taşıyıcısı işe alındı!',
  );
};

createBuildZone(
  stationBuildPosition,
  new THREE.Vector3(),
  { type: 'wood', amount: 1 },
  createStationAndUnlockZones,
  'Kütük bırakma istasyonu kuruldu!',
);

// Oyuncu araziden hiç çıkamaz; sınır açılmış parçaların birleşimidir.
const clampToCompound = (position: THREE.Vector3) => {
  position.x = THREE.MathUtils.clamp(position.x, COMPOUND_WEST + 0.7, COMPOUND_EAST - 0.8);
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const plot of plots) {
    if (!plot.unlocked) continue;
    minZ = Math.min(minZ, plot.minZ);
    maxZ = Math.max(maxZ, plot.maxZ);
  }
  position.z = THREE.MathUtils.clamp(position.z, minZ + 0.7, maxZ - 0.7);
};

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
  addTween(0.18, (progress) => {
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

const animateWoodToBuildZone = (zone: BuildZoneData, start: THREE.Vector3) => {
  const flyingLog = makeLogMesh(0.72);
  const target = zone.position.clone().add(new THREE.Vector3(0, 0.18, 0));
  flyingLog.position.copy(start);
  scene.add(flyingLog);
  addTween(0.18, (progress) => {
    flyingLog.position.lerpVectors(start, target, easeInOutCubic(progress));
    flyingLog.position.y += Math.sin(progress * Math.PI) * 0.82;
    flyingLog.rotation.y = progress * 0.28;
  }, () => scene.remove(flyingLog));
};

const updateTreeHealthBar = (tree: TreeData) => {
  const fill = tree.healthBar.getObjectByName('fill');
  if (!fill) return;
  const ratio = Math.max(0, tree.hp / tree.maxHp);
  fill.scale.x = ratio;
  fill.position.x = -(1.05 * (1 - ratio)) / 2;
  const isUnlocked = plots[tree.plotIndex]?.unlocked ?? false;
  tree.healthBar.visible = tree.alive && isUnlocked && tree.group.visible && tree.hp < tree.maxHp;
};

const spawnFallenLogs = (treePosition: THREE.Vector3, count: number, value: number) => {
  for (let index = 0; index < count; index += 1) {
    const mesh = makeLogMesh(0.94);
    const angle = (index / count) * Math.PI * 2 + seededRandom() * 0.55;
    const start = treePosition.clone().add(new THREE.Vector3(0, 1.1, 0));
    const target = treePosition.clone().add(new THREE.Vector3(Math.cos(angle) * (0.7 + seededRandom() * 0.65), 0.22, Math.sin(angle) * (0.7 + seededRandom() * 0.65)));
    mesh.position.copy(start);
    mesh.scale.setScalar(0.7);
    scene.add(mesh);
    const groundLog: GroundLog = { mesh, collecting: false, settled: false, value };
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
    spawnFallenLogs(treePosition, tree.logs, tree.logValue);
    world.remove(tree.group);
  });
};

let chopClock = 0;

const hitTree = (tree: TreeData) => {
  if (!tree.alive || !tree.group.visible || !plots[tree.plotIndex]?.unlocked) return;
  audio.chop();
  tree.hp = Math.max(0, tree.hp - state.damage);
  updateTreeHealthBar(tree);
  spawnParticles(tree.group.position, 0xc99248, 5);
  spawnChopDebris(tree.group.position);
  const startingRotation = tree.group.rotation.z;
  addTween(0.22, (progress) => {
    tree.group.rotation.z = startingRotation + Math.sin(progress * Math.PI) * 0.085;
  }, () => { if (tree.alive) tree.group.rotation.z = startingRotation; });
  // Her balta darbesi küçük, ağacı devirmek büyük XP verir; derin orman daha çok kazandırır.
  grantXp(1 + tree.tier);
  if (tree.hp <= 0) {
    grantXp(6 + tree.tier * 5);
    fellTree(tree);
  }
};

const collectLog = (log: GroundLog) => {
  if (!log.settled || log.collecting || state.carried + state.pendingCollection >= state.capacity) return;
  log.collecting = true;
  state.pendingCollection += 1;
  const stackIndex = state.carried + state.pendingCollection - 1;
  const start = log.mesh.position.clone();
  const startScale = log.mesh.scale.clone();
  const startRotation = log.mesh.rotation.clone();
  addTween(0.2, (progress) => {
    const target = new THREE.Vector3(0, 0.34 + stackIndex * 0.235, 0.75);
    player.localToWorld(target);
    const eased = easeOutCubic(progress);
    log.mesh.position.lerpVectors(start, target, eased);
    log.mesh.position.y += Math.sin(progress * Math.PI) * 1.05;
    // Kütük sırta gelirken yalnızca küçük bir yön düzeltmesi yapar; kare başına dönmez.
    log.mesh.rotation.x = THREE.MathUtils.lerp(startRotation.x, 0, eased);
    log.mesh.rotation.y = startRotation.y + progress * 0.24;
    log.mesh.rotation.z = THREE.MathUtils.lerp(startRotation.z, Math.PI / 2, eased);
    log.mesh.scale.copy(startScale).multiplyScalar(1 + Math.sin(progress * Math.PI) * 0.18);
  }, () => {
    scene.remove(log.mesh);
    const index = groundLogs.indexOf(log);
    if (index >= 0) groundLogs.splice(index, 1);
    state.pendingCollection -= 1;
    state.carried += 1;
    state.carriedValue += log.value;
    audio.pickup();
    rebuildPlayerStack();
    updateUI();
    bounceGroup(stackGroup);
  });
};

const bounceGroup = (group: THREE.Object3D) => {
  addTween(0.14, (progress) => {
    const scale = 1 + Math.sin(progress * Math.PI) * 0.12;
    group.scale.set(scale, scale, scale);
  }, () => group.scale.setScalar(1));
};

const unloadOneLog = (station: StationData) => {
  if (state.carried <= 0 || stackMeshes.length === 0) return;
  const topLog = stackMeshes[stackMeshes.length - 1];
  const start = new THREE.Vector3();
  topLog.getWorldPosition(start);
  // Sırttaki kütükler tek tek izlenmez; ortalama değer taşınır.
  const logValue = state.carriedValue / state.carried;
  state.carried -= 1;
  state.carriedValue = Math.max(0, state.carriedValue - logValue);
  rebuildPlayerStack();

  const flyingLog = makeLogMesh(0.78);
  flyingLog.position.copy(start);
  scene.add(flyingLog);
  const target = station.position.clone().add(new THREE.Vector3(
    -1.23 + (state.stock % 4) * 0.82,
    0.42 + Math.floor(state.stock / 4) * 0.34,
    0.45,
  ));
  addTween(0.18, (progress) => {
    flyingLog.position.lerpVectors(start, target, easeInOutCubic(progress));
    flyingLog.position.y += Math.sin(progress * Math.PI) * 0.95;
    flyingLog.rotation.y += 0.25;
  }, () => {
    scene.remove(flyingLog);
    state.stock += 1;
    state.stockValue += logValue;
    audio.unload();
    rebuildStationPiles();
    rebuildTraderStock();
    updateUI();
    bounceGroup(station.pile);
  });
  updateUI();
};

// Alıcının kafasındaki istek balonu: yalnızca kaç kütük/tahta istediği görünür.
const makeOfferBubble = (amount: number, planks: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 210;
  canvas.height = 110;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.fillStyle = 'rgba(255,255,255,.96)';
  context.strokeStyle = '#6c512f';
  context.lineWidth = 7;
  context.beginPath();
  context.roundRect(6, 6, 198, 98, 28);
  context.fill();
  context.stroke();

  // İstenen mal simgesi
  context.fillStyle = planks ? '#d8a55c' : '#b5713a';
  context.strokeStyle = '#7a4520';
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(22, 34, 46, 30, 10);
  context.fill();
  context.stroke();
  context.fillStyle = '#e1ad63';
  context.beginPath();
  context.ellipse(68, 49, 8, 15, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  // Miktar
  context.fillStyle = '#3a2414';
  context.font = '900 44px system-ui';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(`×${amount}`, 84, 52);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  bubble.position.set(0, 2.42, 0);
  bubble.scale.set(1.4, 0.73, 1);
  bubble.renderOrder = 300;
  return bubble;
};

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
  return false;
};

// Alıcı modelleri iskeletli; klip sürülmezse bağlama pozunda donarlar.
const playCustomerClip = (customer: CustomerData, clipName: string) => {
  if (customer.currentClip === clipName) return;
  const modelName = customer.visual.userData.modelName as Parameters<typeof findClip>[0];
  const mixer = customer.visual.userData.mixer as THREE.AnimationMixer;
  const next = mixer.clipAction(findClip(modelName, clipName));
  const previous = customer.currentClip
    ? mixer.clipAction(findClip(modelName, customer.currentClip))
    : null;
  next.reset().setEffectiveWeight(1).fadeIn(0.18).play();
  previous?.fadeOut(0.18);
  customer.currentClip = clipName;
};

// Seviye eğrisi: her seviye bir yetenek puanı verir.
const xpForLevel = (level: number) => 20 + (level - 1) * 16;

const grantXp = (amount: number) => {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level += 1;
    state.skillPoints += 1;
    leveled = true;
  }
  if (leveled) {
    audio.coin();
    spawnParticles(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffe066, 15);
    showToast(`Seviye ${state.level}! +1 yetenek puanı`);
  }
};

const haggleBonus = () => 1 + (state.skills.haggle - 1) * 0.1;

const removeCustomer = (customer: CustomerData) => {
  world.remove(customer.group);
  const index = customers.indexOf(customer);
  if (index >= 0) customers.splice(index, 1);
  advanceQueue();
};

// Tek sıra: öndeki ayrılınca arkadakiler birer basamak öne yürür.
const advanceQueue = () => {
  for (const wantsPlanks of [false, true]) {
    const queued = customers
      .filter((customer) => customer.wantsPlanks === wantsPlanks && customer.state !== 'leaving')
      .sort((a, b) => a.slotIndex - b.slotIndex);
    const targetTrader = wantsPlanks ? plankTrader : logTrader;
    queued.forEach((customer, position) => {
      if (customer.slotIndex === position) return;
      customer.slotIndex = position;
      customer.state = 'arriving';
      customer.bubble.visible = false;
      customer.path = [targetTrader.slots[position].clone()];
    });
  }
};

const spawnCustomer = () => {
  // Bıçkıhane kurulmadan tahta isteyen alıcı gelmez.
  const wantsPlanks = state.sawmillBuilt && seededRandom() < 0.5;
  const targetTrader = wantsPlanks ? plankTrader : logTrader;

  const slotIndex = [0, 1, 2, 3].find(
    (index) => !customers.some((customer) => customer.wantsPlanks === wantsPlanks && customer.slotIndex === index && customer.state !== 'leaving'),
  );
  if (slotIndex === undefined) return;

  const group = new THREE.Group();
  const visual = createCustomerVisual(customers.length + Math.floor(ambientTime));
  const wantAmount = wantsPlanks ? 2 + Math.floor(seededRandom() * 4) : 3 + Math.floor(seededRandom() * 5);
  const offerGold = Math.round(wantAmount * (wantsPlanks ? 60 : 25) * haggleBonus());
  const bubble = makeOfferBubble(wantAmount, wantsPlanks);
  bubble.visible = false;
  group.add(visual, bubble);
  group.position.copy(targetTrader.spawnPosition);
  world.add(group);

  const slot = targetTrader.slots[slotIndex];
  const maxPatience = 34 + seededRandom() * 12;
  customers.push({
    group,
    visual,
    state: 'arriving',
    path: [slot.clone()],
    slotIndex,
    wantsPlanks,
    wantAmount,
    offerGold,
    patience: maxPatience,
    maxPatience,
    walkClock: 0,
    bubble,
    served: false,
    currentClip: '',
  });
};

const sendCustomerAway = (customer: CustomerData) => {
  customer.bubble.visible = false;
  customer.state = 'leaving';
  const targetTrader = customer.wantsPlanks ? plankTrader : logTrader;
  customer.path = [targetTrader.exitPosition.clone()];
  advanceQueue();
};

// Ödeme banknotları müşteriden oyuncuya uçar.
const payoutToPlayer = (from: THREE.Vector3, gold: number) => {
  const notes = Math.min(5, Math.max(2, Math.round(gold / 9)));
  for (let index = 0; index < notes; index += 1) {
    const note = makeBanknoteMesh();
    note.position.copy(from).add(new THREE.Vector3(0, 1.15, 0));
    scene.add(note);
    const start = note.position.clone();
    const arc = 0.85 + seededRandom() * 0.7;
    addTween(0.44 + index * 0.06, (progress) => {
      const eased = easeOutCubic(progress);
      const target = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      note.position.lerpVectors(start, target, eased);
      note.position.y += Math.sin(progress * Math.PI) * arc;
      note.rotation.y = progress * 6.2;
    }, () => scene.remove(note));
  }
};

const availableFor = (customer: CustomerData) =>
  customer.wantsPlanks ? state.plankStallStock : state.logStallStock;

const sellToCustomer = (customer: CustomerData) => {
  if (customer.served || customer.state !== 'waiting') return false;
  if (availableFor(customer) < customer.wantAmount) return false;

  if (customer.wantsPlanks) {
    state.plankStallStock = Math.max(0, state.plankStallStock - customer.wantAmount);
  } else {
    state.logStallStock = Math.max(0, state.logStallStock - customer.wantAmount);
  }
  state.gold += customer.offerGold;
  customer.served = true;
  sendCustomerAway(customer);
  rebuildTraderStock();
  payoutToPlayer(customer.group.position.clone(), customer.offerGold);
  audio.coin();
  grantXp(Math.round(customer.wantAmount * (customer.wantsPlanks ? 3 : 1.5)));
  const goods = customer.wantsPlanks ? 'tahta' : 'kütük';
  showToast(`${customer.wantAmount} ${goods} satıldı · +${customer.offerGold} para`);
  updateUI();
  return true;
};

const updateCustomers = (delta: number) => {
  for (let index = customers.length - 1; index >= 0; index -= 1) {
    const customer = customers[index];
    (customer.visual.userData.mixer as THREE.AnimationMixer).update(delta);

    // Kafa üstü isteği balonu YALNIZCA en öndeki (slotIndex === 0) müşteri beklerken görünür.
    const isFrontWaiting = customer.slotIndex === 0 && customer.state === 'waiting' && !customer.served;
    customer.bubble.visible = isFrontWaiting;

    if (customer.state === 'leaving') {
      playCustomerClip(customer, 'walk');
      const target = customer.path[0];
      if (!target) {
        removeCustomer(customer);
        continue;
      }
      if (moveCustomerTowards(customer, target, delta, 2.7)) customer.path.shift();
      if (customer.path.length === 0) removeCustomer(customer);
      continue;
    }

    if (customer.state === 'arriving') {
      playCustomerClip(customer, 'walk');
      const target = customer.path[0];
      if (target && moveCustomerTowards(customer, target, delta)) customer.path.shift();
      if (customer.path.length === 0) {
        customer.state = 'waiting';
        // Tezgâha (-x yönüne) dönüp beklemeye geçer.
        customer.group.rotation.y = Math.PI / 2;
      }
      continue;
    }

    playCustomerClip(customer, 'idle');
    customer.patience -= delta;
    if (customer.patience <= 0) {
      sendCustomerAway(customer);
      showToast('Alıcı bekleyemedi ve gitti');
    }
  }
};

let playerStallUnloadClock = 0;

const updateTrader = (delta: number) => {
  customerSpawnClock -= delta;
  if (customerSpawnClock <= 0) {
    customerSpawnClock = 6 + seededRandom() * 5;
    spawnCustomer();
  }

  const nearLog = logTrader.sellPosition.distanceTo(player.position) < 1.6;
  const nearPlank = plankTrader.group.visible && plankTrader.sellPosition.distanceTo(player.position) < 1.6;

  // Oyuncunun tezgâha kütük veya tahta teslim etmesi
  if (nearLog && state.carried > state.carriedPlanks) {
    playerStallUnloadClock += delta;
    if (playerStallUnloadClock >= 0.08) {
      playerStallUnloadClock = 0;
      const perLogValue = state.carriedValue / state.carried;
      state.carried -= 1;
      state.carriedValue = Math.max(0, state.carriedValue - perLogValue);
      state.logStallStock += 1;
      rebuildPlayerStack();
      rebuildTraderStock();
      audio.unload();
    }
  } else if (nearPlank && state.carriedPlanks > 0) {
    playerStallUnloadClock += delta;
    if (playerStallUnloadClock >= 0.08) {
      playerStallUnloadClock = 0;
      state.carried -= 1;
      state.carriedPlanks -= 1;
      state.plankStallStock += 1;
      rebuildPlayerStack();
      rebuildTraderStock();
      audio.unload();
    }
  } else {
    playerStallUnloadClock = 0;
  }

  if (!nearLog && !nearPlank) return;

  const ready = customers.find((customer) => {
    if (customer.state !== 'waiting' || customer.served) return false;
    if (nearLog && !customer.wantsPlanks && availableFor(customer) >= customer.wantAmount) return true;
    if (nearPlank && customer.wantsPlanks && availableFor(customer) >= customer.wantAmount) return true;
    return false;
  });
  if (ready) sellToCustomer(ready);
};

const skillCap = 8;

const skillPreview = (kind: SkillKind) => {
  switch (kind) {
    case 'damage': return `${state.damage} → ${state.damage + 1}`;
    case 'axeSpeed': return `${state.axeInterval.toFixed(2)} sn → ${Math.max(0.4, state.axeInterval * 0.86).toFixed(2)} sn`;
    case 'capacity': return `${state.capacity} → ${state.capacity + 2}`;
    case 'speed': return `${state.speed.toFixed(1)} → ${(state.speed + 0.4).toFixed(1)}`;
    case 'haggle': return `%${Math.round(haggleBonus() * 100)} → %${Math.round((1 + state.skills.haggle * 0.1) * 100)}`;
  }
};

const resourceAmount = (type: CostType) => type === 'money' ? state.gold : state.carried;

const spendSkillPoint = (kind: SkillKind) => {
  if (state.skillPoints <= 0) {
    showToast('Yetenek puanın yok');
    return;
  }
  if (state.skills[kind] >= skillCap) {
    showToast('Bu yetenek zirvede');
    return;
  }
  state.skillPoints -= 1;
  state.skills[kind] += 1;
  // Balta hasarı belli bir seviyeye gelince elindeki balta da görsel olarak yükselir.
  if (kind === 'damage') {
    state.damage += 1;
    if (state.skills.damage >= 4) setAxeModel(true);
  }
  if (kind === 'axeSpeed') state.axeInterval = Math.max(0.4, state.axeInterval * 0.86);
  if (kind === 'capacity') state.capacity += 2;
  if (kind === 'speed') state.speed += 0.4;
  audio.coin();
  updateUI();
  showToast('Yetenek geliştirildi!');
};

const skillValueElements: Record<SkillKind, string> = {
  damage: 'damage-value',
  axeSpeed: 'axe-speed-value',
  capacity: 'capacity-value',
  speed: 'speed-value',
  haggle: 'haggle-value',
};

const updateUI = () => {
  goldCount.textContent = `${state.gold}`;
  woodCount.textContent = `${state.carried}/${state.capacity}`;
  stockCount.textContent = `${state.stock}`;

  const needed = xpForLevel(state.level);
  levelValue.textContent = `${state.level}`;
  levelFill.style.width = `${Math.min(100, (state.xp / needed) * 100)}%`;
  levelText.textContent = `${Math.floor(state.xp)} / ${needed} XP`;

  skillBadge.textContent = `${state.skillPoints}`;
  skillBadge.classList.toggle('hidden', state.skillPoints <= 0);

  skillPointsNote.textContent = state.skillPoints > 0
    ? `Dağıtılmamış puan: ${state.skillPoints}`
    : 'Ağaç kesip seviye atlayarak puan kazan';
  (Object.keys(skillValueElements) as SkillKind[]).forEach((kind) => {
    const maxed = state.skills[kind] >= skillCap;
    getElement<HTMLElement>(skillValueElements[kind]).textContent = maxed
      ? 'Zirvede'
      : `Sv ${state.skills[kind]} · ${skillPreview(kind)}`;
  });
  document.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => {
    const kind = button.dataset.skill as SkillKind;
    button.disabled = state.skillPoints <= 0 || state.skills[kind] >= skillCap;
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
  upgradePanel.classList.add('hidden');
  panel.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  joystickInput.set(0, 0);
  joystickPointer = null;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
  joystick.classList.remove('active');
};

const closePanels = () => {
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

upgradesButton.addEventListener('click', () => openPanel(upgradePanel));
backdrop.addEventListener('click', closePanels);
document.querySelectorAll<HTMLButtonElement>('.close-panel').forEach((button) => button.addEventListener('click', closePanels));
document.querySelectorAll<HTMLButtonElement>('.upgrade-card').forEach((button) => {
  button.addEventListener('click', () => spendSkillPoint(button.dataset.skill as SkillKind));
});

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

// Joystick yönleri kameranın hafif çaprazına otomatik uyar: yukarı her zaman
// ekranda yukarı, sağ da her zaman ekranda sağ hareket ettirir.
const movementForward = new THREE.Vector3(-cameraOffset.x, 0, -cameraOffset.z).normalize();
const movementRight = new THREE.Vector3(cameraOffset.z, 0, -cameraOffset.x).normalize();
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
  const playerRadius = 0.36;
  for (const trader of [logTrader, plankTrader]) {
    if (!trader || !trader.group.visible) continue;
    for (const collider of trader.colliders) {
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
    clampToCompound(nextPosition);
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
  }

  const nearest = nearestTreeInRange();
  axeHolder.visible = nearest !== null;
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
    if (chopClock >= state.axeInterval) {
      chopClock -= state.axeInterval;
      hitTree(nearest);
    }
  } else {
    chopClock = 0;
  }

  // Klip seçimi: kesim yürümeyi bastırır, sırtta yük varsa elleri öne uzatmak yerine normal yürüyüş/duruş yapılır.
  const chopping = nearest !== null && !isMoving;
  if (chopping) {
    const swing = playerAction('attack-melee-right');
    swing.timeScale = swing.getClip().duration / Math.max(0.2, state.axeInterval);
    playPlayerClip('attack-melee-right', 0.12);
  } else if (isMoving) {
    playPlayerClip('walk');
  } else {
    playPlayerClip('idle');
  }
  playerMixer.update(delta);

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
  collectionCooldown = 0.07;
};

let stationUnloadClock = 0;
let stationUnloadStreak = 0;

const updateStations = (delta: number) => {
  let nearest: StationData | null = null;
  for (const station of stations) {
    if (station.position.distanceTo(player.position) < 3.05) {
      nearest = station;
      break;
    }
  }
  if (nearest && state.carried > 0) {
    stationUnloadClock += delta;
    const targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, stationUnloadStreak));
    if (stationUnloadClock >= targetInterval) {
      stationUnloadClock = 0;
      stationUnloadStreak += 1;
      unloadOneLog(nearest);
    }
  } else {
    stationUnloadClock = 0;
    stationUnloadStreak = 0;
  }
};

const finishBuildZone = (zone: BuildZoneData) => {
  zone.built = true;
  zone.active = false;
  world.remove(zone.group);
  spawnParticles(zone.spawnPosition, 0xf2d06b, 16);
  zone.onComplete();
  audio.coin();
  showToast(zone.completeMessage);
};

const updateBuildZones = (delta: number) => {
  for (const zone of buildZones) {
    if (zone.built || !zone.active) continue;
    const distance = zone.position.distanceTo(player.position);
    if (distance < 1.45 && zone.paid < zone.cost.amount && resourceAmount(zone.cost.type) > 0) {
      zone.paymentClock += delta;
      const targetInterval = Math.max(0.015, 0.11 * Math.pow(0.85, zone.paid));
      if (zone.paymentClock >= targetInterval) {
        zone.paymentClock = 0;
        if (zone.cost.type === 'money') {
          state.gold -= 1;
          animateMoneyToBuildZone(zone);
        } else {
          const topLog = stackMeshes[stackMeshes.length - 1];
          if (!topLog) continue;
          const start = new THREE.Vector3();
          topLog.getWorldPosition(start);
          // İnşaata giden kütük sırttaki ortalama değeri de götürür; yoksa
          // ucuz odunla inşa edip pahalı odun değeri taşımaya devam edilirdi.
          const perLogValue = state.carriedValue / state.carried;
          state.carried -= 1;
          state.carriedValue = Math.max(0, state.carriedValue - perLogValue);
          rebuildPlayerStack();
          animateWoodToBuildZone(zone, start);
        }
        zone.paid += 1;
        const ratio = zone.paid / zone.cost.amount;
        zone.progressFill.scale.y = Math.max(0.001, ratio);
        const offsetLocalY = -(zone.progressWidth / 2) * (1 - ratio);
        zone.progressFill.position.set(
          -offsetLocalY,
          0.045,
          0,
        );
        updatePurchaseLabel(zone.label, zone.paid, zone.cost.amount, zone.cost.type);
        bounceGroup(zone.group);
        updateUI();
        if (zone.paid >= zone.cost.amount) finishBuildZone(zone);
      }
    } else {
      zone.paymentClock = 0;
    }
  }
};

const updateContextHint = () => {
  let message = '';
  const nearbyBuildZone = buildZones.find((zone) => zone.active && !zone.built && zone.position.distanceTo(player.position) < 1.9);
  const nearbyGroundLog = groundLogs.some((log) => !log.collecting && log.mesh.position.distanceTo(player.position) < 1.6);
  const nearLogSell = logTrader.sellPosition.distanceTo(player.position) < 1.6;
  const nearPlankSell = plankTrader.group.visible && plankTrader.sellPosition.distanceTo(player.position) < 1.6;
  const nearStation = stations.some((station) => station.position.distanceTo(player.position) < 3.05);

  if (nearbyBuildZone) {
    const resourceName = nearbyBuildZone.cost.type === 'money' ? 'para' : 'odun';
    const hasResource = resourceAmount(nearbyBuildZone.cost.type) > 0;
    message = hasResource
      ? `İnşa ediliyor · ${nearbyBuildZone.paid}/${nearbyBuildZone.cost.amount} ${resourceName}`
      : `${nearbyBuildZone.cost.amount - nearbyBuildZone.paid} ${resourceName} gerekli`;
  } else if (nearLogSell) {
    const logWaiting = customers.filter((c) => !c.wantsPlanks && c.state === 'waiting' && !c.served);
    message = logWaiting.length > 0
      ? `Kütük satılıyor · ${logWaiting[0].wantAmount} kütük → +${logWaiting[0].offerGold} para`
      : `Kütük tezgâhı hazır · stok ${state.stock} kütük`;
  } else if (nearPlankSell) {
    const plankWaiting = customers.filter((c) => c.wantsPlanks && c.state === 'waiting' && !c.served);
    message = plankWaiting.length > 0
      ? `Tahta satılıyor · ${plankWaiting[0].wantAmount} tahta → +${plankWaiting[0].offerGold} para`
      : `Tahta tezgâhı hazır · üretilen tahta ${state.sawmillOutputPlanks}`;
  } else if (state.sawmillBuilt && sawmillBuildPosition.distanceTo(player.position) < 2.8) {
    message = state.sawmillInputLogs > 0
      ? `Bıçkıhane çalışıyor · depoda ${state.sawmillInputLogs} kütük → ${state.sawmillOutputPlanks} tahta`
      : `Bıçkıhaneye kütük getir · üretilen tahta: ${state.sawmillOutputPlanks}`;
  } else if (nearStation && state.carried > 0) {
    message = `Kütükler bırakılıyor · istasyon stoğu ${state.stock}`;
  } else if (nearbyGroundLog && state.carried + state.pendingCollection >= state.capacity) {
    message = 'Sırt kapasiten dolu · istasyona bırak';
  }
  actionHint.textContent = message;
  actionHint.classList.toggle('hidden', message.length === 0);
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
    const isUnlocked = plots[tree.plotIndex]?.unlocked ?? false;
    tree.rangeIndicator.visible = tree.alive && isUnlocked && tree.group.visible && tree.group.position.distanceToSquared(player.position) < 3.6 * 3.6;
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

  // 2. Yapı (İstasyon, Bıçkıhane, Tezgâh) Şeffaflaşması (Occlusion)
  const occludingGroups = new Set<THREE.Group>();
  for (const hit of occlusionRaycaster.intersectObjects(structureOccluderMeshes, false)) {
    const group = hit.object.userData.structureGroup as THREE.Group | undefined;
    if (group) occludingGroups.add(group);
  }

  for (const mesh of structureOccluderMeshes) {
    const group = mesh.userData.structureGroup as THREE.Group;
    const shouldFade = occludingGroups.has(group);
    const material = mesh.material as THREE.Material;
    const baseOpacity = (mesh.userData.baseOpacity as number | undefined) ?? 1.0;
    const targetOpacity = shouldFade ? 0.32 : baseOpacity;
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.25);
    material.depthWrite = material.opacity > 0.6;
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

let clerkClock = 0;
const CLERK_INTERVAL = 3.2;
const updateClerk = (delta: number) => {
  clerkClock += delta;
  if (clerkClock < CLERK_INTERVAL) return;
  clerkClock = 0;
  if (state.clerkHired) {
    const ready = customers.find(
      (customer) => customer.state === 'waiting' && !customer.served && availableFor(customer) >= customer.wantAmount,
    );
    if (ready) sellToCustomer(ready);
  }
};

const updateCarriers = (delta: number) => {
  for (const carrier of carriers) {
    (carrier.visual.userData.mixer as THREE.AnimationMixer).update(delta);
    const sourcePos = carrier.type === 'log' ? stationBuildPosition : sawmillBuildPosition;
    const targetTrader = carrier.type === 'log' ? logTrader : plankTrader;
    const targetPos = targetTrader.sellPosition;

    const currentTarget = carrier.state === 'toSource' ? sourcePos : targetPos;
    const direction = currentTarget.clone().sub(carrier.group.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.5) {
      if (carrier.state === 'toSource') {
        if (carrier.type === 'log' && state.stock > 0) {
          state.stock -= 1;
          carrier.state = 'toTarget';
          if (!carrier.carriedItem) {
            const itemGroup = new THREE.Group();
            const log = makeLogMesh(0.75);
            log.position.set(0, 0.85, -0.42);
            log.rotation.set(0, 0, Math.PI / 2);
            itemGroup.add(log);
            carrier.group.add(itemGroup);
            carrier.carriedItem = itemGroup;
          }
          carrier.carriedItem.visible = true;
          rebuildStationPiles();
        } else if (carrier.type === 'plank' && state.sawmillOutputPlanks > 0) {
          state.sawmillOutputPlanks -= 1;
          carrier.state = 'toTarget';
          if (!carrier.carriedItem) {
            const itemGroup = new THREE.Group();
            const plank = instantiate('resource-wood', 0.45);
            plank.position.set(0, 0.85, -0.42);
            plank.rotation.set(0, 0, Math.PI / 2);
            itemGroup.add(plank);
            carrier.group.add(itemGroup);
            carrier.carriedItem = itemGroup;
          }
          carrier.carriedItem.visible = true;
          rebuildPlankPile();
        }
      } else {
        if (carrier.type === 'log') {
          state.logStallStock += 1;
          rebuildTraderStock();
        } else {
          state.plankStallStock += 1;
          rebuildTraderStock();
        }
        if (carrier.carriedItem) carrier.carriedItem.visible = false;
        carrier.state = 'toSource';
      }
    } else {
      direction.normalize();
      carrier.group.position.addScaledVector(direction, delta * 3.2);
      carrier.group.rotation.y = Math.atan2(-direction.x, -direction.z);
    }
  }
};

const clock = new THREE.Clock();
let uiClock = 0;

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
    updateSawmill(delta);
    updateTrader(delta);
    updateClerk(delta);
    updateCarriers(delta);
    updateCustomers(delta);
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
