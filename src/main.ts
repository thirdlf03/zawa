import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'dat.gui';
import * as CANNON from 'cannon-es';
import cannonDebugger from 'cannon-es-debugger';

const GRAVITY = -9.82;
const FIXED_TIME_STEP = 1 / 60;
const MAX_SUB_STEPS = 10;
const BALL_RADIUS = 0.3;
const SPOTLIGHT_INTENSITY = 100;
const AMBIENT_LIGHT_INTENSITY = 0.5;

const bands = new URL('./assets/stageonly.glb', import.meta.url).href;
const ana = new URL('./assets/anaonly.glb', import.meta.url).href;
const ballCatch = new URL('./assets/catchv2.glb', import.meta.url).href;
const tunnel = new URL('./assets/tunnel.glb', import.meta.url).href;
const start = new URL('./assets/startv2.glb', import.meta.url).href;
const middleCatch = new URL('./assets/middleCatch.glb', import.meta.url).href;
const hdr1 = new URL('./assets/spin.hdr', import.meta.url).href;

const scene = new THREE.Scene();
scene.add(new THREE.AxesHelper(5));

new RGBELoader().load(hdr1, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
  animate();
});

function createSpotLight(x: number, y: number, z: number) {
  const light = new THREE.SpotLight(0xffffff, SPOTLIGHT_INTENSITY);
  light.position.set(x, y, z);
  light.angle = Math.PI / 4;
  light.penumbra = 0.5;
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 20;
  scene.add(light);
  return light;
}

const light1 = createSpotLight(2.5, 5, 5);
const light2 = createSpotLight(-2.5, 5, 5);

const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 4);

const canvasElement = document.querySelector('#myCanvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: canvasElement });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.y = 0.5;

const world = new CANNON.World();
world.gravity.set(0, GRAVITY, 0);

const ballMaterial = new CANNON.Material("ballMaterial");
ballMaterial.restitution = 1;
ballMaterial.friction = 0;

const gltfLoader = new GLTFLoader();

function loadGLTFModelAndCreateTrimesh(url: string, scale: { x: number, y: number, z: number }) {
  gltfLoader.load(
      url,
      (gltf) => {
        scene.add(gltf.scene);

        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            const meshChild = child as THREE.Mesh;
            const geometry = meshChild.geometry as THREE.BufferGeometry;
            const vertices = geometry.attributes.position.array;
            let indices: any = [];

            if (geometry.index) {
              indices = geometry.index.array;
            } else {
              indices = [];
              for (let i = 0; i < vertices.length / 3; i++) {
                indices.push(i);
              }
            }

            const cannonVertices = [];
            for (let i = 0; i < vertices.length; i += 3) {
              cannonVertices.push(new CANNON.Vec3(vertices[i], vertices[i + 1], vertices[i + 2]));
            }

            const cannonFaces = [];
            for (let i = 0; i < indices.length; i += 3) {
              cannonFaces.push([indices[i], indices[i + 1], indices[i + 2]]);
            }

            const trimeshShape = new CANNON.Trimesh(
                cannonVertices.flatMap((v) => [v.x * scale.x, v.y * scale.y, v.z * scale.z]),
                cannonFaces.flatMap((f) => f)
            );

            const stageMaterial = new CANNON.Material("stageMaterial");
            const stageBody = new CANNON.Body({ mass: 0 });
            stageBody.addShape(trimeshShape);
            stageBody.position.copy(meshChild.position as any);
            stageBody.quaternion.copy(meshChild.quaternion as any);
            world.addBody(stageBody);
          }
        });
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('An error happened', error);
      }
  );
}

const modelScales = {
  bands: { x: 3, y: 0.8, z: 3 },
  ana: { x: 0.49, y: 0.49, z: 0.49 },
  start: { x: 2.77, y: 1.64, z: 1.85 },
  tunnel: { x: 1.6, y: 1.77, z: 1.76 },
  ballCatch: { x: 0.48, y: 0.4, z: 0.48 },
  middleCatch: { x: 3, y: 0.8, z: 3 }
};

loadGLTFModelAndCreateTrimesh(bands, modelScales.bands);
loadGLTFModelAndCreateTrimesh(ana, modelScales.ana);
loadGLTFModelAndCreateTrimesh(start, modelScales.start);
loadGLTFModelAndCreateTrimesh(tunnel, modelScales.tunnel);
loadGLTFModelAndCreateTrimesh(ballCatch, modelScales.ballCatch);
loadGLTFModelAndCreateTrimesh(middleCatch, modelScales.middleCatch);

class Ball {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  name: string;

  constructor(r: number, x: number, y: number, z: number, name: string, color: string) {
    const sphereGeometry = new THREE.SphereGeometry(r);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      envMap: scene.environment,
      envMapIntensity: 1.5
    });
    this.mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.mesh.position.set(x, y, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    const sphereShape = new CANNON.Sphere(r);
    this.body = new CANNON.Body({
      mass: 1,
      material: ballMaterial,
      linearDamping: 0,
      angularDamping: 0
    });
    this.body.addShape(sphereShape);
    this.body.position.set(x, y, z);
    world.addBody(this.body);

    this.name = name;
  }

  update() {
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);
  }

  isIntersected(raycaster: THREE.Raycaster): boolean {
    const intersects = raycaster.intersectObject(this.mesh);
    return intersects.length > 0;
  }
}

const balls: Ball[] = [];

balls.push(new Ball(BALL_RADIUS, 1.3, 15, 4, 'sphere1', '#ff0000'));
balls.push(new Ball(BALL_RADIUS, 1.3, 30, 4, 'sphere2', '#00ff00'));
balls.push(new Ball(BALL_RADIUS, 1.3, 45, 4, 'sphere3', '#0000ff'));

const cannonDebugRenderer = cannonDebugger(scene, world, {
  color: 0xff0000,
  scale: 1.0,
});

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

const stats = new Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();
const physicsFolder = gui.addFolder('Physics');
physicsFolder.add(world.gravity, 'x', -10.0, 10.0, 0.1);
physicsFolder.add(world.gravity, 'y', -10.0, 10.0, 0.1);
physicsFolder.add(world.gravity, 'z', -10.0, 10.0, 0.1);
physicsFolder.open();

const ballInfo = {
  name: ''
};
const ballInfoFolder = gui.addFolder('Ball Info');
ballInfoFolder.add(ballInfo, 'name').name('Selected Ball');
ballInfoFolder.open();

renderer.domElement.addEventListener('mousedown', onMouseDown, false);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseDown(event: MouseEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  for (let i = 0; i < balls.length; i++) {
    if (balls[i].isIntersected(raycaster)) {
      ballInfo.name = balls[i].name;
      for (let j in ballInfoFolder.__controllers) {
        ballInfoFolder.__controllers[j].updateDisplay();
      }
      return;
    }
  }

  ballInfo.name = '';
  for (let j in ballInfoFolder.__controllers) {
    ballInfoFolder.__controllers[j].updateDisplay();
  }
}

const clock = new THREE.Clock();
let delta: number;

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  delta = Math.min(clock.getDelta(), 0.05);
  world.step(FIXED_TIME_STEP, delta, MAX_SUB_STEPS);

  for (let i = 0; i < balls.length; i++) {
    balls[i].update();
  }

  cannonDebugRenderer.update();

  render();

  stats.update();
}

function render() {
  renderer.render(scene, camera);
}