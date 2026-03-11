import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import CameraControls from "camera-controls";
import lemonModel from "../assets/citrus.glb?url";

CameraControls.install({ THREE });

const ASSET_URL =
  typeof import.meta.env.VITE_3D_ASSET_URL === "string" &&
  import.meta.env.VITE_3D_ASSET_URL
    ? import.meta.env.VITE_3D_ASSET_URL
    : getAssetFromQuery() || lemonModel;

function getAssetFromQuery(): string {
  const url = new URL(window.location.href);
  return url.searchParams.get("model") ?? url.searchParams.get("asset") ?? "";
}

export function initViewer(): void {
  const container = document.getElementById("viewer-container");
  const canvas = document.getElementById("viewer-canvas") as HTMLCanvasElement;
  const loadingEl = document.getElementById("viewer-loading");
  const errorEl = document.getElementById("viewer-error");

  if (!container || !canvas || !loadingEl || !errorEl) return;

  const setLoading = (loading: boolean) => {
    container.setAttribute("data-loading", String(loading));
  };
  const setError = (message: string) => {
    errorEl.textContent = message;
    container.setAttribute("data-error", message ? "true" : "false");
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x18181c);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new CameraControls(camera, canvas);
  controls.dampingFactor = 0.1;
  controls.draggingDampingFactor = 0.25;
  controls.azimuthRotateSpeed = 0.5;
  controls.polarRotateSpeed = 0.5;
  controls.truckSpeed = 1;
  controls.minDistance = 0.5;
  controls.maxDistance = 20;
  controls.setFocalOffset(0, 0, 0);

  // Enable rotation around the model
  controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
  controls.mouseButtons.right = CameraControls.ACTION.NONE;
  controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
  controls.mouseButtons.middle = CameraControls.ACTION.NONE;

  // Enable touch controls
  controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
  controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY;

  // Enhanced lighting to show lemon color - using warmer tones
  const ambient = new THREE.AmbientLight(0xfff8e1, 1.0); // Warm white/light yellow
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff8e1, 1.2); // Warm key light
  key.position.set(4, 6, 5);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff8e1, 0.6); // Warm fill
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  // Additional rim light for better color visibility
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(-4, 3, -5);
  scene.add(rim);

  let currentModel: THREE.Group | null = null;
  let leaderLinesGroup: THREE.Group | null = null;
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  function createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 48px sans-serif";
    const metrics = ctx.measureText(text);
    const padding = 32;
    canvas.width = Math.max(128, Math.ceil(metrics.width) + padding);
    canvas.height = 64;
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xfde047,
    });
    const sprite = new THREE.Sprite(material);
    const aspectRatio = canvas.width / canvas.height;
    sprite.scale.set(0.05 * aspectRatio, 0.05, 1);
    return sprite;
  }

  function addLeaderLines(_group: THREE.Group, length: number): void {
    if (leaderLinesGroup) scene.remove(leaderLinesGroup);

    leaderLinesGroup = new THREE.Group();
    const yellow = 0xfde047;

    const directions: [number, number, number][] = [
      [1, 0.5, 0],
      [-0.7, 0.7, 0.5],
      [0.3, -0.8, 0.6],
    ];
    const labels = ["A: THE FUTURE", "B: THE PAST", "C: THE PRESENT"];

    const start = [
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, 0, -0.1),
      new THREE.Vector3(0, -0.1, 0),
    ];

    const end = [
      new THREE.Vector3(0.25, 0.7, 0),
      new THREE.Vector3(-0.25, 0, 0.7),
      new THREE.Vector3(0.25, -0.7, 0),
    ];

    // Calculate directions from start and end
    for (let i = 0; i < start.length; i++) {
      directions[i] = [
        end[i].x - start[i].x,
        end[i].y - start[i].y,
        end[i].z - start[i].z,
      ];
    }

    for (let i = 0; i < start.length; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        start[i],
        end[i],
      ]);
      const material = new THREE.LineBasicMaterial({
        color: yellow,
        linewidth: 2,
      });
      const line = new THREE.Line(geometry, material);
      leaderLinesGroup!.add(line);

      const sprite = createTextSprite(labels[i]);
      sprite.position.copy(end[i]);
      leaderLinesGroup!.add(sprite);
    }

    scene.add(leaderLinesGroup);
  }

  function fitCameraToModel(group: THREE.Group): void {
    box.setFromObject(group);
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;
    camera.position.set(
      center.x + distance * 0.5,
      center.y + distance * 0.4,
      center.z + distance,
    );
    controls.setLookAt(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      center.x,
      center.y,
      center.z,
      true,
    );
    controls.saveState();
  }

  function resize(): void {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  let lastTime = 0;
  function loop(time: number): void {
    requestAnimationFrame(loop);
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    lastTime = time;
    // Always update controls to keep them responsive
    controls.update(delta);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);

  function loadAsset(url: string): Promise<void> {
    setError("");
    setLoading(true);

    const clean = (url as string).trim();
    if (!clean) {
      setLoading(false);
      setError("No model URL. Set VITE_3D_ASSET_URL or use ?model=…");
      return Promise.resolve();
    }

    const lower = clean.toLowerCase();
    const isGlb = lower.endsWith(".glb") || lower.endsWith(".gltf");

    if (isGlb) {
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
      );
      loader.setDRACOLoader(draco);

      return new Promise((resolve, reject) => {
        loader.load(
          clean,
          (gltf: { scene: THREE.Group }) => {
            if (currentModel) scene.remove(currentModel);
            currentModel = gltf.scene;
            scene.add(currentModel);
            fitCameraToModel(currentModel);

            box.setFromObject(currentModel);
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            addLeaderLines(currentModel, maxDim * 0.8);

            setLoading(false);
            resolve();
          },
          undefined,
          (err: unknown) => {
            setLoading(false);
            setError(err instanceof Error ? err.message : "Failed to load GLB");
            reject(err);
          },
        );
      });
    }

    setLoading(false);
    setError(
      "Unsupported format. Use .glb or .gltf, or set VITE_3D_ASSET_URL.",
    );
    return Promise.resolve();
  }

  loadAsset(ASSET_URL);
}
