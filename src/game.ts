import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const GRAVITY = -9.8;
const FIXED_TIME_STEP = 1 / 60;
const MAX_SUB_STEPS = 10;
const BALL_RADIUS = 0.3;
const AMBIENT_LIGHT_INTENSITY = 0.5;

const scene = new THREE.Scene();
scene.add(new THREE.AxesHelper(5));

const world = new CANNON.World();
world.gravity.set(0, GRAVITY, 0);

const hdr1 = new URL('./assets/spin.hdr', import.meta.url).href;

new RGBELoader().load(hdr1, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
    animate();
});

const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
scene.add(ambientLight);

const holePositions: THREE.Vector3[] = [];

let cameraPositions = [
    new THREE.Vector3(-8, 25, 0),
    new THREE.Vector3(0, 13.5, 0),
    new THREE.Vector3(0, 8, 3),
    new THREE.Vector3(0, 3, 3.5)
];

const cameraMain = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.7) / window.innerHeight, 0.1, 1000);
cameraMain.position.set(cameraPositions[0].x, cameraPositions[0].y, cameraPositions[0].z);
cameraMain.lookAt(0, -5, 0);

const cameraSub1 = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.3) / (window.innerHeight * 0.33), 0.1, 1000);
cameraSub1.position.set(cameraPositions[1].x, cameraPositions[1].y, cameraPositions[1].z);
cameraSub1.lookAt(0, -90, 0);

const cameraSub2 = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.3) / (window.innerHeight * 0.33), 0.1, 1000);
cameraSub2.position.set(cameraPositions[2].x, cameraPositions[2].y, cameraPositions[2].z);
cameraSub2.lookAt(0, 0, 0);

const cameraSub3 = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.3) / (window.innerHeight * 0.33), 0.1, 1000);
cameraSub3.position.set(cameraPositions[3].x, cameraPositions[3].y, cameraPositions[3].z);
cameraSub3.lookAt(0, -2, 0);

const canvasElement = document.querySelector('#Game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: canvasElement });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const controls = new OrbitControls(cameraMain, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

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
                    if (url.includes('holes')) {
                        holePositions.push(child.position.clone());
                    }

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

                    const triMeshShape = new CANNON.Trimesh(
                        cannonVertices.flatMap((v) => [v.x * scale.x, v.y * scale.y, v.z * scale.z]),
                        cannonFaces.flatMap((f) => f)
                    );

                    const stageBody = new CANNON.Body({ mass: 0 });
                    stageBody.addShape(triMeshShape);
                    stageBody.position.copy(meshChild.position as any);
                    stageBody.quaternion.copy(meshChild.quaternion as any);
                    world.addBody(stageBody);
                }
            });
        },
    );
}

const modelScales = {
    stages: { x: 3, y: 0.8, z: 3 },
    holes: { x: 0.49, y: 0.49, z: 0.49 },
    start: { x: 2.7, y: 0.8, z: 2.7 },
    tunnel: { x: 1.6, y: 1.96, z: 1.74 },
    ballCatch: { x: 0.48, y: 0.4, z: 0.48 },
    middleCatch: { x: 3, y: 0.8, z: 3 },
    startTunnel: { x: 3, y: 3, z: 3 },
    lastTunnel: { x: 1.6, y: 1.42, z: 1.6 },
    box: { x: 0.139, y: 0.442, z: 0.442 },
};

const start = new URL('./assets/start.glb', import.meta.url).href;
const startTunnel = new URL('./assets/startTunnel.glb', import.meta.url).href;

const stages = new URL('./assets/stages.glb', import.meta.url).href;
const ballCatch = new URL('./assets/catch.glb', import.meta.url).href;
const holes = new URL('./assets/holes.glb', import.meta.url).href;
const tunnel = new URL('./assets/tunnel.glb', import.meta.url).href;

const middleCatch = new URL('./assets/middlecatch.glb', import.meta.url).href;

const lastTunnel = new URL('./assets/lastTunnel.glb', import.meta.url).href;
const box = new URL('./assets/box.glb', import.meta.url).href;

loadGLTFModelAndCreateTrimesh(stages, modelScales.stages);
loadGLTFModelAndCreateTrimesh(holes, modelScales.holes);
loadGLTFModelAndCreateTrimesh(start, modelScales.start);
loadGLTFModelAndCreateTrimesh(tunnel, modelScales.tunnel);
loadGLTFModelAndCreateTrimesh(ballCatch, modelScales.ballCatch);
loadGLTFModelAndCreateTrimesh(middleCatch, modelScales.middleCatch);
loadGLTFModelAndCreateTrimesh(box, modelScales.box);
loadGLTFModelAndCreateTrimesh(lastTunnel, modelScales.lastTunnel);
loadGLTFModelAndCreateTrimesh(startTunnel, modelScales.startTunnel);

class Ball {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    name: string;
    priority: number;
    isAttracted: boolean = false;

    constructor(r: number, x: number, y: number, z: number, name: string, color: string, priority: number) {
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
            linearDamping: 0,
            angularDamping: 0,
            material: ballMaterial
        });

        this.body.addShape(sphereShape);
        this.body.position.set(x, y, z);
        world.addBody(this.body);

        this.name = name;
        this.priority = priority;
    }

    update() {
        this.mesh.position.copy(this.body.position as any);
        this.mesh.quaternion.copy(this.body.quaternion as any);

        if (holePositions.length > 0) {
            let nearestHole = holePositions[0];
            let minDistance = Number.MAX_VALUE;

            holePositions.forEach(holePos => {
                const distance = this.mesh.position.distanceTo(holePos);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestHole = holePos;
                }
            });

            const directionToHole = new CANNON.Vec3(
                nearestHole.x - this.body.position.x,
                nearestHole.y - this.body.position.y,
                nearestHole.z - this.body.position.z
            );
            directionToHole.normalize();
            const attractionDistance = 1.5;

            if (minDistance <= attractionDistance && this.priority != 1) {
                this.isAttracted = true;
            } else {
                this.isAttracted = false;
            }

            if (this.isAttracted) {
                this.body.applyForce(
                    directionToHole.scale((this.priority - 1) * 0.1),
                    this.body.position
                );
            }
        }
    }

    isIntersected(raycaster: THREE.Raycaster): boolean {
        const intersects = raycaster.intersectObject(this.mesh, true);
        return intersects.length > 0;
    }
}
interface BallData {
    name: string;
    priority: number;
}

const ballsDict = sessionStorage.getItem('balls');
const parsedBalls: BallData[] = ballsDict ? JSON.parse(ballsDict) : [];

const balls: Ball[] = parsedBalls.map((ball: BallData, index: number) => {
    let randomColor = "rgb(" + (~~(256 * Math.random())) + ", " + (~~(256 * Math.random())) + ", " + (~~(256 * Math.random())) + ")";
    let angle = (index / parsedBalls.length) * 2 * Math.PI;
    let x = 1.6 + 1.3 * Math.cos(angle);
    let z = 5 + 1.3 * Math.sin(angle);
    return new Ball(BALL_RADIUS, x, 15, z, ball.name, randomColor, ball.priority);
});

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    cameraMain.aspect = (window.innerWidth * 0.7) / window.innerHeight;
    cameraMain.updateProjectionMatrix();

    cameraSub1.aspect = (window.innerWidth * 0.3) / (window.innerHeight * 0.33);
    cameraSub1.updateProjectionMatrix();

    cameraSub2.aspect = (window.innerWidth * 0.3) / (window.innerHeight * 0.33);
    cameraSub2.updateProjectionMatrix();

    cameraSub3.aspect = (window.innerWidth * 0.3) / (window.innerHeight * 0.33);
    cameraSub3.updateProjectionMatrix();

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

let num = 0;

const changeCamera = {
    changeMainCamera: () => {
        num = (num + 1) % 4;
        cameraMain.position.set(cameraPositions[num].x, cameraPositions[num].y, cameraPositions[num].z);
    }
}

const ballInfoFolder = gui.addFolder('Ball Info');
ballInfoFolder.add(ballInfo, 'name').name('ボール名');
ballInfoFolder.open();

const switchCamera = gui.addFolder('Switch Camera');
switchCamera.add(changeCamera, 'changeMainCamera').name('メインカメラを切り替える');

const resetButton = gui.addFolder('Reset');
resetButton.add({ reset: () => location.reload() }, 'reset').name('リセット');


const rayCaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('mousedown', onMouseDown, false);

function onMouseDown(event: MouseEvent) {
    const mainViewportX = window.innerWidth * 0.3;
    const x = ((event.clientX - mainViewportX) / (window.innerWidth * 0.7)) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;

    mouse.x = x;
    mouse.y = y;

    rayCaster.setFromCamera(mouse, cameraMain);

    for (let ball of balls) {
        if (ball.isIntersected(rayCaster)) {
            ballInfo.name = ball.name;

            ballInfoFolder.controllers.forEach(controller => {
                if (controller.property === 'name') {
                    controller.updateDisplay();
                }
            });

            return;
        }
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

    render();

    stats.update();
}

function render() {
    renderer.setScissorTest(true);

    renderer.setViewport(window.innerWidth * 0.3, 0, window.innerWidth * 0.7, window.innerHeight);
    renderer.setScissor(window.innerWidth * 0.3, 0, window.innerWidth * 0.7, window.innerHeight);
    renderer.render(scene, cameraMain);

    renderer.setViewport(0, window.innerHeight * 0.66, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.setScissor(0, window.innerHeight * 0.66, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.render(scene, cameraSub1);

    renderer.setViewport(0, window.innerHeight * 0.33, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.setScissor(0, window.innerHeight * 0.33, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.render(scene, cameraSub2);

    renderer.setViewport(0, 0, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.setScissor(0, 0, window.innerWidth * 0.3, window.innerHeight * 0.33);
    renderer.render(scene, cameraSub3);

    renderer.setScissorTest(false);
}