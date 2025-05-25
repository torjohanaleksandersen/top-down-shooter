import * as THREE from "./lib/three/build/three.module.js"
import socket, { PACKET_FREQ } from "../index.js"
import { camera, scene } from "./game.js";
import { world } from "./world.js";
import { bullets } from "./bullet.js";
import { enemies } from "./enemies.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"
import { FBXLoader } from "./lib/three/examples/jsm/loaders/FBXLoader.js"
import { Hand } from "./hand.js";

const reqVelocity = new THREE.Vector2(0, 0);
const forwardVec = new THREE.Vector2(1, 0);
const sideVec = new THREE.Vector2(0, 1);
const mouse = new THREE.Vector2(0, 0);

const camSpeed = 0.1;
let currentAnimation = "";

export class Player extends THREE.Object3D {
    constructor () {
        super()
        this.position.set(0, 1, 0);
        this.velocity = new THREE.Vector2(0, 0);

        this.speed = 5;
        this.accelerationMagnitude = 5;
        this.radius = 0.5;

        this.movement = "idle";
        this.shooting = false;

        this.animations = {};
        this.mixer = new THREE.AnimationMixer();
        this.keys = {};
        document.addEventListener("keydown", (e) => { this.keys[e.key.toLowerCase()] = true; });
        document.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });

        document.addEventListener("mousemove", (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        })

        document.addEventListener("mousedown", (e) => {
            if (e.button === 0) this.shoot();
        })

        setInterval(() => {
            this.sendTransformUpdate();
        }, PACKET_FREQ)

        this.loadSkin();
    }

    loadSkin() {
        const loader = new GLTFLoader();

        loader.load("./lib/models/swat.glb", (gltf) => {
            const model = gltf.scene;

            model.traverse(child => {
                if (child.isMesh) {
                    child.material.transparent = false;
                    child.material.opacity = 1.0;
                    child.material.depthWrite = true;
                    child.material.needsUpdate = true;

                    const mat = child.material.clone();
                    child.material = new THREE.MeshLambertMaterial(mat);
                }
            });

            model.position.z = -1;

            this.add(model);

            this.hand = new Hand(new THREE.SkeletonHelper(model));

            this.loadAnimations(model)
        })
    }

    loadAnimations(model) {
        this.mixer = new THREE.AnimationMixer(model);

        const loader = new FBXLoader();

        [
            "idle_rifle",
            "walk_rifle",
            "run_rifle",
            "idle_rifle_ads",
            "walk_rifle_ads",
            "run_rifle_ads"
        ]
        .forEach(key => {
            loader.load(`./lib/animations/${key}.fbx`, animation => {
                this.animations[key] = this.mixer.clipAction(animation.animations[0]);
            })
        })
    }

    playAnimation(key) {
        if (key === currentAnimation) return;
        Object.entries(this.animations).forEach(([key, value]) => {
            this.animations[key].fadeOut(0.15);
        })
 
        if (!this.animations[key]) return;
        this.animations[key].reset().fadeIn(0.15).play();
        currentAnimation = key;
    }

    shoot() {
        this.shooting = true;
        setTimeout(() => {
            this.shooting = false;
        }, 300);
        bullets.set(this.position.clone(), forwardVec.clone(), 0);

        const data = {};
        data.playerId = socket.id;
        data.position = [
            this.position.x,
            this.position.y,
            this.position.z
        ]
        data.direction = [
            forwardVec.x,
            forwardVec.y
        ]
        data.time = Date.now();

        socket.emit("shoot", data)
    }

    sendTransformUpdate() {
        const data = [];
        data.push(this.position.toArray());
        data.push(this.velocity.toArray());
        data.push([this.movement, this.shooting]);
        data.push(this.rotation.z);


        socket.emit("transform-update", data);
    }

    computeForwardVector() {
        const screenPos = this.position.clone().project(camera);

        const playerScreen = new THREE.Vector2(
            (screenPos.x + 1) / 2 * window.innerWidth,
            (-screenPos.y + 1) / 2 * window.innerHeight
        );

        const dir = new THREE.Vector2(mouse.x - playerScreen.x, mouse.y - playerScreen.y);
        dir.normalize();

        forwardVec.copy(dir);
        sideVec.set(-dir.y, dir.x);
    }

    updateMovement(dt) {
        const moveVec = new THREE.Vector2(0, 0);

        if (this.keys['w']) moveVec.add(forwardVec);
        if (this.keys['s']) moveVec.sub(forwardVec);
        if (this.keys['d']) moveVec.add(sideVec);
        if (this.keys['a']) moveVec.sub(sideVec);

        if (moveVec.lengthSq() > 0) {
            moveVec.normalize().multiplyScalar(this.speed);
        }

        reqVelocity.copy(moveVec);

        const dx = reqVelocity.x - this.velocity.x;
        const dz = reqVelocity.y - this.velocity.y;

        this.velocity.x += dx * this.accelerationMagnitude * dt;
        this.velocity.y += dz * this.accelerationMagnitude * dt;

        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.y * dt;

        const target = this.position.clone().add(new THREE.Vector3(forwardVec.x, 0, forwardVec.y));
        this.lookAt(target);
        this.rotateX(- Math.PI / 2);

    }

    updateCamera() {
        const target = camera.position.clone();
        target.x = this.position.x;
        target.z = this.position.z;

        const lerped = camera.position.clone().lerp(target, camSpeed);
        camera.position.x = lerped.x;
        camera.position.z = lerped.z;
    }

    updateStateAnimation() {
        let animation = "";
        if (this.keys["w"]) {
            animation = "run_rifle";
            this.movement = "run";
        } else if (this.keys["a"] || this.keys["s"] || this.keys["d"]) {
            animation = "walk_rifle";
            this.movement = "walk";
        } else {
            animation = "idle_rifle";
            this.movement = "idle";
        }

        if (this.shooting) {
            animation += "_ads";
        }

        this.playAnimation(animation);
    }

    checkCollision(dt) {
        enemies.forEach(enemy => {
            const distance = enemy.position.clone().sub(this.position);

            if (distance.length() < 2 * this.radius) {
                this.resolveCollision(enemy, dt);
            }
        })

        const directions = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
            [1, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ]

        directions.forEach(([dx, dz]) => {
            const raycaster = new THREE.Raycaster(this.position, new THREE.Vector3(dx, 0, dz).normalize(), 0, this.radius);

            const intersects = raycaster.intersectObject(world);
            if (intersects.length > 0) {
                const object = intersects[0];
                const localNormal = object.face.normal.clone();
                const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.object.matrixWorld);
                const r = localNormal.applyMatrix3(normalMatrix).normalize();

                this.position.add(r.multiplyScalar(dt));
            }
        })
    }

    resolveCollision(object, dt) {
        const r = this.position.clone().sub(object.position).normalize();

        this.position.add(r.multiplyScalar(dt));
    }

    update(dt) {
        this.computeForwardVector();
        this.updateMovement(dt);
        this.updateCamera();
        this.updateStateAnimation();

        for (let i = 0; i < 5; i++) {
            this.checkCollision(dt);
        }

        this.mixer.update(dt);
    }
}

export const player = new Player();