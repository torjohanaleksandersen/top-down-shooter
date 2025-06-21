import { StaticBody } from "./physics/staticBody.js";
import * as THREE from "./lib/three/build/three.module.js"
import { physics } from "./physics/physics.js";
import { player } from "./player.js";
import { PointerLockControls } from "./lib/three/examples/jsm/controls/PointerLockControls.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";




export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setClearColor(new THREE.Color(0.7, 0.7, 1));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
controls.minPolarAngle = THREE.MathUtils.degToRad(20);
controls.maxPolarAngle = THREE.MathUtils.degToRad(160);
controls.pointerSpeed = 0.5;
document.addEventListener("mousedown", (e) => {
    controls.lock();
})

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

const geometry = new THREE.PlaneGeometry(100, 100);
const material = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide})
const mesh = new THREE.Mesh(geometry, material)
mesh.rotation.x = Math.PI / 2
scene.add(mesh)
physics.addStaticBody(new StaticBody({mesh: mesh, complex: true}));

player.position.set(0, 10, 0)
physics.addRigidBody(player);


const geometry1 = new THREE.BoxGeometry(2, 2, 2);
const material1 = new THREE.MeshBasicMaterial({color: 0xff0000})
const mesh1 = new THREE.Mesh(geometry1, material1);
mesh1.position.y = 5;
mesh1.position.z = 5;
scene.add(mesh1)


let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);


    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    player.update(dt);
    physics.update(dt);

    renderer.render(scene, camera);
}

animate()