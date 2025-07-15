import * as THREE from './lib/three/build/three.module.js'
import * as CANNON from "./lib/cannon-es/dist/cannon.js"
import { physics } from "./physics/main.js";
import { PointerLockControls } from "./lib/three/examples/jsm/controls/PointerLockControls.js"
import { RigidBody } from './physics/rigidBody.js';
import { player } from './player/player.js';
import CannonDebugger from "./lib/cannon-es-debugger/dist/cannon-debugger.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"
import { Ragdoll } from './physics/ragdoll.js';
import { World } from './world/world.js';
import { Civilian } from './world/civilian.js';
import { Coupe } from './vehicle/coupe.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setClearColor(new THREE.Color(0.7, 0.7, 1));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

export const controls = new PointerLockControls(camera, document.body);
controls.minPolarAngle = THREE.MathUtils.degToRad(20);
controls.maxPolarAngle = THREE.MathUtils.degToRad(160);
controls.pointerSpeed = 0.5;
document.addEventListener("mousedown", (e) => {
    controls.lock();
})

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

const ambient = new THREE.AmbientLight(0x404040, 2);
scene.add(ambient);

camera.position.set(7, 10, 5);
camera.lookAt(0, 0, 0);

export const world = new World()

physics.addRigidBody(player.rigidBody);



const playerMat = new CANNON.Material();
const worldMat = world.material;


player.rigidBody.physicsBody.material = playerMat;

const contactMaterial = new CANNON.ContactMaterial(playerMat, worldMat, {
    restitution: 0,
    friction: 0,
});
physics.world.addContactMaterial(contactMaterial);

/*
const loader = new GLTFLoader()
loader.load("./lib/models/swat.glb", gltf => {
    const model = gltf.scene;
    model.position.set(3, 10, 0);

    model.rotation.x = -1
    scene.add(model);

    model.traverse(obj => {
        if (obj.isMesh) {
            obj.frustumCulled = false;
            obj.material.transparent = true;
            obj.material.opacity = 1;
        }
    })

    setTimeout(() => {
        const ragdoll = new Ragdoll(model);

        setTimeout(() => {
            setInterval(() => {
                ragdoll.update();
            }, 1 / 60)
        }, 10);
    }, 0)
})
*/

/*
const civilian = new Civilian();
world.addCivilian(civilian);
*/

export const coupe = new Coupe();
coupe.build();


//const cannonDebugger = new CannonDebugger(scene, physics.world, {color: 0xffff00});

let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    physics.update(dt);
    player.update(dt);

    coupe.update();
    //civilian.update(dt);

    //cannonDebugger.update();

    renderer.render(scene, camera);
}

animate()