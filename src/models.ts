import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type ModelName =
  | 'tree-near' | 'tree-mid' | 'tree-deep'
  | 'log' | 'resource-wood'
  | 'axe' | 'axe-upgraded'
  | 'workbench' | 'crate' | 'barrel' | 'fence' | 'signpost' | 'campfire' | 'grass'
  | 'rock-a' | 'rock-b'
  | 'player'
  | 'buyer-b' | 'buyer-c' | 'buyer-d' | 'buyer-e' | 'buyer-f' | 'buyer-g';

const MODEL_NAMES: ModelName[] = [
  'tree-near', 'tree-mid', 'tree-deep',
  'log', 'resource-wood',
  'axe', 'axe-upgraded',
  'workbench', 'crate', 'barrel', 'fence', 'signpost', 'campfire', 'grass',
  'rock-a', 'rock-b',
  'player',
  'buyer-b', 'buyer-c', 'buyer-d', 'buyer-e', 'buyer-f', 'buyer-g',
];

interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const loaded = new Map<ModelName, LoadedModel>();

export const loadModels = async (onProgress?: (done: number, total: number) => void) => {
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(MODEL_NAMES.map(async (name) => {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    loaded.set(name, { scene: gltf.scene, animations: gltf.animations });
    done += 1;
    onProgress?.(done, MODEL_NAMES.length);
  }));
};

// Modeller farklı paketlerden geldiği için ölçekleri tutmuyor. Her örneği
// istenen yüksekliğe göre normalize edip ayakları y=0'a oturtuyoruz, böylece
// sahnedeki boyutlar model dosyasına değil oyuna göre belirleniyor.
export const instantiate = (name: ModelName, targetHeight?: number) => {
  const source = loaded.get(name);
  if (!source) throw new Error(`Model "${name}" is not loaded.`);
  const clone = cloneSkinned(source.scene) as THREE.Group;
  const wrapper = new THREE.Group();
  wrapper.add(clone);

  if (targetHeight !== undefined) {
    const bounds = new THREE.Box3().setFromObject(clone);
    const height = bounds.max.y - bounds.min.y;
    if (height > 0.0001) {
      const scale = targetHeight / height;
      clone.scale.setScalar(scale);
      clone.position.y = -bounds.min.y * scale;
    }
  }
  return wrapper;
};

export const clipsFor = (name: ModelName) => loaded.get(name)?.animations ?? [];

// Karakter klipleri tek bir isim listesinden geliyor; eksik klip istendiğinde
// oyunun kırılmaması için idle'a düşüyoruz.
export const findClip = (name: ModelName, clipName: string) => {
  const clips = clipsFor(name);
  return clips.find((clip) => clip.name === clipName)
    ?? clips.find((clip) => clip.name === 'idle')
    ?? clips[0];
};
