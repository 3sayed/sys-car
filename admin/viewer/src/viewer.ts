import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
const $ = (id: string) => document.getElementById(id)!;
const canvas = $("scene") as HTMLCanvasElement;
try {
  boot();
} catch (e) {
  $("error").textContent =
    "3D rendering is unavailable in this browser. " +
    (e instanceof Error ? e.message : "");
}
function boot() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor("#0b1118");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(4, 2.7, 5);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 12;
  controls.target.set(0, 0.15, 0);
  scene.add(new THREE.HemisphereLight(0xbadfff, 0x24352a, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb4ef65, 2);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const grid = new THREE.GridHelper(12, 24, 0x263d48, 0x15242e);
  grid.position.y = -1.65;
  scene.add(grid);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const metal = new THREE.MeshStandardMaterial({
      color: 0x9eafbd,
      metalness: 0.85,
      roughness: 0.3,
    }),
    dark = new THREE.MeshStandardMaterial({
      color: 0x334452,
      metalness: 0.6,
      roughness: 0.6,
    }),
    green = new THREE.MeshStandardMaterial({
      color: 0xb4ef65,
      metalness: 0.35,
      roughness: 0.4,
    });
  const homes = new Map<THREE.Object3D, THREE.Vector3>();
  let mixers: THREE.AnimationMixer[] = [];
  let duration = 5,
    imported = false,
    step = 0,
    playing = false,
    progress = 0;
  const labels = [
    "Assembled view",
    "Caliper highlight",
    "Separate pads",
    "Component comparison",
    "Return to assembly",
  ];
  function mesh(
    name: string,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    pos: THREE.Vector3,
  ) {
    const obj = new THREE.Mesh(g, m);
    obj.name = name;
    obj.position.copy(pos);
    assembly.add(obj);
    homes.set(obj, pos.clone());
    return obj;
  }
  function concept() {
    const rotor = mesh(
      "rotor",
      new THREE.CylinderGeometry(1.18, 1.18, 0.17, 72),
      metal,
      new THREE.Vector3(),
    );
    rotor.rotation.x = Math.PI / 2;
    const hub = mesh(
      "hub",
      new THREE.CylinderGeometry(0.38, 0.38, 0.3, 40),
      dark,
      new THREE.Vector3(0, 0, 0.08),
    );
    hub.rotation.x = Math.PI / 2;
    const ring = mesh(
      "rotor_edge",
      new THREE.TorusGeometry(0.94, 0.018, 8, 72),
      dark,
      new THREE.Vector3(0, 0, 0.095),
    );
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const bolt = mesh(
        "bolt_" + i,
        new THREE.CylinderGeometry(0.065, 0.065, 0.32, 12),
        metal,
        new THREE.Vector3(Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, 0.15),
      );
      bolt.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 28; i++) {
      const a = (i * Math.PI * 2) / 28;
      mesh(
        "vent_" + i,
        new THREE.SphereGeometry(0.023, 6, 6),
        dark,
        new THREE.Vector3(Math.cos(a) * 0.92, Math.sin(a) * 0.92, 0.09),
      );
    }
    mesh(
      "caliper",
      new THREE.BoxGeometry(0.54, 1.16, 0.64),
      green,
      new THREE.Vector3(0.87, 0, 0.04),
    );
    mesh(
      "pad_inner",
      new THREE.BoxGeometry(0.4, 0.84, 0.11),
      dark,
      new THREE.Vector3(0.72, 0, -0.2),
    );
    mesh(
      "pad_outer",
      new THREE.BoxGeometry(0.4, 0.84, 0.11),
      dark,
      new THREE.Vector3(0.72, 0, 0.29),
    );
  }
  const model = new URLSearchParams(location.search).get("model");
  if (model) {
    const url = new URL(model, location.href);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Invalid model URL.");
    $("selection").textContent = "Loading assembly…";
    new GLTFLoader().load(
      url.href,
      (gltf) => {
        imported = true;
        assembly.add(gltf.scene);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = box.getSize(new THREE.Vector3()).length();
        if (size === 0) throw new Error("Empty model.");
        assembly.scale.setScalar(3 / size);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        const mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((clip) => {
          duration = Math.max(duration, clip.duration);
          mixer.clipAction(clip).play();
        });
        mixers = [mixer];
        $("selection").textContent = "Generated candidate · inspect before use";
        document.querySelector("h1")!.textContent = "Imported assembly";
      },
      undefined,
      () => {
        $("error").textContent =
          "Unable to load the model. Check the asset URL and storage CORS settings.";
      },
    );
  } else concept();
  function updateLabel() {
    ($("previous") as HTMLButtonElement).disabled = step === 0;
    ($("next") as HTMLButtonElement).disabled = step === 4;
    $("step").textContent =
      String(step + 1).padStart(2, "0") +
      " / 05 · " +
      (imported ? "Animation position" : labels[step]);
  }
  function setStep(n: number) {
    step = Math.max(0, Math.min(4, n));
    progress = step / 4;
    updateLabel();
  }
  $("previous").onclick = () => {
    playing = false;
    $("play").textContent = "Play";
    setStep(step - 1);
  };
  $("next").onclick = () => {
    playing = false;
    $("play").textContent = "Play";
    setStep(step + 1);
  };
  $("play").onclick = () => {
    playing = !playing;
    $("play").textContent = playing ? "Pause" : "Play";
    if (playing && progress >= 1) progress = 0;
  };
  $("reset").onclick = () => {
    playing = false;
    $("play").textContent = "Play";
    setStep(0);
    camera.position.set(4, 2.7, 5);
    controls.target.set(0, 0.15, 0);
  };
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let down = { x: 0, y: 0 };
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(assembly.children, true)[0];
    if (hit)
      $("selection").textContent =
        hit.object.name.replaceAll("_", " ") || "Component";
  });
  let last = performance.now();
  function frame(now: number) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (playing) {
      progress += delta / 9;
      if (progress >= 1) {
        progress = 1;
        playing = false;
        $("play").textContent = "Play";
      }
      step = Math.min(4, Math.floor(progress * 5));
      updateLabel();
    }
    if (imported) mixers.forEach((m) => m.setTime(progress * duration));
    else {
      const explode = Math.sin(progress * Math.PI);
      homes.forEach((home, obj) => {
        const target = home.clone();
        if (obj.name === "caliper") target.x += explode * 1.1;
        if (obj.name === "pad_outer") target.z += explode * 1.5;
        if (obj.name === "pad_inner") target.z -= explode * 1.5;
        obj.position.lerp(target, 0.12);
      });
    }
    controls.update();
    renderer.render(scene, camera);
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();
  updateLabel();
  requestAnimationFrame(frame);
}
