import * as THREE from "./lib/three/build/three.module.js"
import { Body } from "./body.js";
import socket, { PACKET_FREQ } from "../index.js"
import { camera, scene } from "./game.js";
import { world } from "./world.js";
import { bullets } from "./bullet.js";
import { enemies } from "./enemies.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"
import { FBXLoader } from "./lib/three/examples/jsm/loaders/FBXLoader.js"
import { Hand } from "./hand.js";
import { particles } from "./particles.js";

const reqVelocity = new THREE.Vector2(0, 0);
export const forwardVec = new THREE.Vector2(1, 0);
const sideVec = new THREE.Vector2(0, 1);
const mouse = new THREE.Vector2(0, 0);

const camSpeed = 0.1;
let mouseDistance = 0;

export class Player extends Body {
    constructor () {
        super()
        this.position.set(0, 1, 0);
        this.velocity = new THREE.Vector2(0, 0);

        this.movement = "idle";

        this.keys = {};

        document.addEventListener("keydown", (e) => { this.keys[e.key.toLowerCase()] = true; });
        document.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });


        document.addEventListener("mousemove", (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        })

        document.addEventListener("mousedown", (e) => {
            if (e.button === 0) this.shoot();

            if (e.button === 2) this.aim();
        })

        document.addEventListener("mouseup", (e) => {
            if (e.button === 2) {
                this.aiming = false;
                this.hand.gun.setDefaultTransform();
            }
        })

        setInterval(() => {
            this.sendTransformUpdate();
        }, PACKET_FREQ)

        this.loadSkin();
    }

    shoot() {
        if (!this.aiming) return;
        this.shooting = true;
        setTimeout(() => {
            this.shooting = false;
        }, 300);
        bullets.set(this, forwardVec.clone(), 0);

        const data = {};
        data.playerId = socket.id;
        data.direction = [
            forwardVec.x,
            forwardVec.y
        ]
        data.time = Date.now();

        socket.emit("shoot", data)

        particles.muzzleSmoke(player);
    }

    sendTransformUpdate() {
        const data = [];
        data.push(this.position.toArray());
        data.push(this.velocity.toArray());
        data.push([this.movement, this.aiming]);
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
        mouseDistance = dir.length();
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
        this.rotateY(0.12);
    }

    updateCamera() {
        const target = new THREE.Vector3(0, 0, 0);
        target.x = this.position.x;
        target.z = this.position.z;

        if (forwardVec.length() > 0) {
            const forward = new THREE.Vector3(forwardVec.x, 0, forwardVec.y);
            forward.multiplyScalar(Math.min(mouseDistance / 300, 3))

            target.add(forward);
        }

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

        if (this.shooting || this.aiming) {
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
        if (this.hand && this.hand.gun) this.hand.gun.update(dt)
    }
}

export const player = new Player();