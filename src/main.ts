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
  label: THREE.Sprite;
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
axePivot.position.set(-0.36, 1.15, -0.02);
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
axePivot.rotation.z = 0.35;

const stackGroup = new THREE.Group();
stackGroup.position.set(0, 0, 0.68);
player.add(stackGroup);

const stackMeshes: THREE.Mesh[] = [];

const rebuildPlayerStack = () => {
  for (const mesh of stackMeshes) stackGroup.remove(mesh);
  stackMeshes.length = 0;
  for (let index = 0; index < state.carried; index += 1) {
    const log = makeLogMesh(0.78);
    const row = Math.floor(index / 2);
    const column = index % 2;
    log.position.set(column === 0 ? -0.19 : 0.19, 0.32 + row * 0.24, 0);
    log.rotation.x = column === 0 ? 0.04 : -0.04;
    stackGroup.add(log);
    stackMeshes.push(log);
  }
};

const makeTree = (position: THREE.Vector3, variant: number): TreeData => {
  const group = new THREE.Group();
  group.position.copy(position);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.35, 7), trunkMaterial);
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leafMaterial = leafMaterials[variant % leafMaterials.length];
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
  trees.push(tree);
  return tree;
};

const makeCanvasSprite = (text: string, accent = '#f2c14d') => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.fillStyle = 'rgba(45, 42, 29, .88)';
  context.roundRect(12, 12, 232, 104, 28);
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = 'rgba(255,255,255,.85)';
  context.stroke();
  context.fillStyle = accent;
  context.font = '900 44px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(3.4, 1.7, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  return sprite;
};

const updateSpriteText = (sprite: THREE.Sprite, text: string, accent = '#f2c14d') => {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  const context = sprite.userData.context as CanvasRenderingContext2D;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(45, 42, 29, .88)';
  context.roundRect(12, 12, 232, 104, 28);
  context.fill();
  context.lineWidth = 7;
  context.strokeStyle = 'rgba(255,255,255,.85)';
  context.stroke();
  context.fillStyle = accent;
  context.font = '900 44px system-ui';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 64);
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
  addBox(group, new THREE.Vector3(0.2, 2.3, 0.2), new THREE.Vector3(-1.7, 1.15, -1.12), darkTrunkMaterial);
  addBox(group, new THREE.Vector3(0.2, 2.3, 0.2), new THREE.Vector3(1.7, 1.15, -1.12), darkTrunkMaterial);
  addBox(group, new THREE.Vector3(3.9, 0.25, 2.2), new THREE.Vector3(0, 2.2, -0.35), roofMaterial).rotation.x = -0.08;

  const pile = new THREE.Group();
  pile.position.set(0, 0.2, -0.15);
  group.add(pile);

  const deliveryRing = new THREE.Mesh(
    new THREE.RingGeometry(2.15, 2.34, 40),
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
  for (const station of stations) {
    station.pile.clear();
    const visibleLogs = Math.min(state.stock, 16);
    for (let index = 0; index < visibleLogs; index += 1) {
      const log = makeLogMesh(0.78);
      const column = index % 4;
      const row = Math.floor(index / 4);
      log.position.set(-0.85 + column * 0.56, 0.22 + row * 0.28, -0.2);
      station.pile.add(log);
    }
  }
};

const createBuildZone = (position: THREE.Vector3, spawnOffset: THREE.Vector3, cost: number) => {
  const group = new THREE.Group();
  group.position.copy(position);
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 40),
    new THREE.MeshBasicMaterial({ color: 0xe8c75f, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = 0.03;
  group.add(disk);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.47, 40),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = 'ring';
  group.add(ring);
  const label = makeCanvasSprite(`🔒 ${cost}`);
  label.position.y = 2.2;
  group.add(label);
  world.add(group);
  buildZones.push({
    group,
    position: position.clone(),
    spawnPosition: position.clone().add(spawnOffset),
    label,
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
  if (Math.abs(position.x + position.z * 0.13) < 5.2) return false;
  if (position.distanceTo(new THREE.Vector3(0, 0, 5)) < 5.5) return false;
  const reserved = [new THREE.Vector3(12, 0, -15), new THREE.Vector3(-13, 0, -9), new THREE.Vector3(-10, 0, 20)];
  return reserved.every((point) => position.distanceTo(point) > 3.7);
};

for (let index = 0; index < 58; index += 1) {
  let position = new THREE.Vector3();
  let attempts = 0;
  do {
    position = new THREE.Vector3((seededRandom() - 0.5) * 48, 0, (seededRandom() - 0.5) * 62);
    attempts += 1;
  } while (!isClearForTree(position) && attempts < 50);
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
    const groundLog: GroundLog = { mesh, collecting: false };
    groundLogs.push(groundLog);
    addTween(0.48 + index * 0.05, (progress) => {
      const eased = easeOutCubic(progress);
      mesh.position.lerpVectors(start, target, eased);
      mesh.position.y += Math.sin(progress * Math.PI) * 0.9;
      mesh.rotation.y = angle + progress * 1.8;
      mesh.scale.setScalar(0.7 + 0.3 * eased);
    });
  }
};

const fellTree = (tree: TreeData) => {
  tree.alive = false;
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

let axeSwingProgress = 0;
let axeSwinging = false;
let choppingTree: TreeData | null = null;
let chopClock = 0;

const hitTree = (tree: TreeData) => {
  if (!tree.alive) return;
  tree.hp = Math.max(0, tree.hp - state.damage);
  updateTreeHealthBar(tree);
  axeSwinging = true;
  axeSwingProgress = 0;
  spawnParticles(tree.group.position, 0xc99248, 5);
  const startingRotation = tree.group.rotation.z;
  addTween(0.22, (progress) => {
    tree.group.rotation.z = startingRotation + Math.sin(progress * Math.PI) * 0.085;
  }, () => { if (tree.alive) tree.group.rotation.z = startingRotation; });
  if (tree.hp <= 0) fellTree(tree);
};

const collectLog = (log: GroundLog) => {
  if (log.collecting || state.carried + state.pendingCollection >= state.capacity) return;
  log.collecting = true;
  state.pendingCollection += 1;
  const start = log.mesh.position.clone();
  const startScale = log.mesh.scale.clone();
  addTween(0.42, (progress) => {
    const target = new THREE.Vector3(0, 0.4 + state.carried * 0.23, 0.75);
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
    rebuildPlayerStack();
    updateUI();
    bounceGroup(stackGroup);
  });
};

const bounceGroup = (group: THREE.Group) => {
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
  offerPanel.classList.add('hidden');
  upgradePanel.classList.add('hidden');
  panel.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  joystickInput.set(0, 0);
  joystickKnob.style.transform = 'translate(-50%, -50%)';
};

const closePanels = () => {
  offerPanel.classList.add('hidden');
  upgradePanel.classList.add('hidden');
  backdrop.classList.add('hidden');
};

const isPanelOpen = () => !backdrop.classList.contains('hidden');

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

const updateJoystick = (event: PointerEvent) => {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = rect.width * 0.34;
  const delta = new THREE.Vector2(event.clientX - centerX, event.clientY - centerY);
  if (delta.length() > radius) delta.setLength(radius);
  joystickInput.set(delta.x / radius, -delta.y / radius);
  joystickKnob.style.transform = `translate(calc(-50% + ${delta.x}px), calc(-50% + ${delta.y}px))`;
};

joystick.addEventListener('pointerdown', (event) => {
  joystickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (joystickPointer === event.pointerId) updateJoystick(event);
});
const releaseJoystick = (event: PointerEvent) => {
  if (joystickPointer !== event.pointerId) return;
  joystickPointer = null;
  joystickInput.set(0, 0);
  joystickKnob.style.transform = 'translate(-50%, -50%)';
};
joystick.addEventListener('pointerup', releaseJoystick);
joystick.addEventListener('pointercancel', releaseJoystick);

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
    choppingTree = null;
    chopClock = 0;
  } else {
    playerVisual.position.y = THREE.MathUtils.lerp(playerVisual.position.y, 0, delta * 10);
    legs[0].rotation.x = THREE.MathUtils.lerp(legs[0].rotation.x, 0, delta * 10);
    legs[1].rotation.x = THREE.MathUtils.lerp(legs[1].rotation.x, 0, delta * 10);
    const nearest = nearestTreeInRange();
    if (nearest) {
      choppingTree = nearest;
      const direction = nearest.group.position.clone().sub(player.position);
      const targetRotation = Math.atan2(-direction.x, -direction.z);
      let difference = targetRotation - playerRotation;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      playerRotation += difference * Math.min(1, delta * 12);
      player.rotation.y = playerRotation;
      chopClock += delta;
      if (chopClock >= 0.62) {
        chopClock = 0;
        hitTree(nearest);
      }
    } else {
      choppingTree = null;
      chopClock = 0;
    }
  }

  const stackSway = isMoving ? -0.1 : 0.025;
  stackGroup.rotation.x = THREE.MathUtils.lerp(stackGroup.rotation.x, stackSway, delta * 7);

  if (axeSwinging) {
    axeSwingProgress += delta / 0.28;
    axePivot.rotation.z = 0.35 - Math.sin(Math.min(axeSwingProgress, 1) * Math.PI) * 1.65;
    if (axeSwingProgress >= 1) {
      axeSwinging = false;
      axePivot.rotation.z = 0.35;
    }
  }
};

const updateCollection = () => {
  for (const log of [...groundLogs]) {
    if (!log.collecting && log.mesh.position.distanceTo(player.position) < 1.45) collectLog(log);
  }
};

const updateStations = (delta: number) => {
  let nearest: StationData | null = null;
  for (const station of stations) {
    if (station.position.distanceTo(player.position) < 2.35) {
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
  showToast('Yeni odun istasyonu kuruldu!');
};

const updateBuildZones = (delta: number) => {
  for (const zone of buildZones) {
    if (zone.built) continue;
    const distance = zone.position.distanceTo(player.position);
    const ring = zone.group.getObjectByName('ring');
    if (ring) ring.rotation.z += delta * 0.35;
    if (distance < 1.45 && zone.paid < zone.cost && state.gold > 0) {
      zone.paymentClock += delta;
      if (zone.paymentClock >= 0.32) {
        zone.paymentClock = 0;
        state.gold -= 1;
        zone.paid += 1;
        updateSpriteText(zone.label, `● ${zone.paid}/${zone.cost}`);
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
  const nearbyStation = stations.find((station) => station.position.distanceTo(player.position) < 2.5);
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
  } else if (choppingTree) {
    message = `Ağaç kesiliyor · ${choppingTree.hp}/3 can`;
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

const animate = () => {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(delta);
  updateCollection();
  updateStations(delta);
  updateBuildZones(delta);
  updateOffer(delta);
  updateTweens(delta);
  updateCamera(delta);
  updateBillboards();
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
