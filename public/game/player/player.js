import * as THREE from '../lib/three/build/three.module.js'
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { RigidBody } from "../physics/rigidBody.js";
import { camera, coupe, scene } from '../game.js';
import { inputs } from './inputs.js';
import { physics } from '../physics/main.js';
import { GLTFLoader } from '../lib/three/examples/jsm/loaders/GLTFLoader.js';
import { Animator } from './animator.js';
import { StateManager } from './stateManager.js';
import { Gun } from '../weapons/gun.js';

const radius = 0.4;
const height = 1;

const loader = new GLTFLoader();

class Player {
    constructor () {
        const body = new CANNON.Body({
            mass: 75,
            fixedRotation: true
        })

        const cylinder = new CANNON.Cylinder(radius, radius, height, 8);
        body.addShape(cylinder, new CANNON.Vec3(0, 0, 0));

        const bottomSphere = new CANNON.Sphere(radius);
        body.addShape(bottomSphere, new CANNON.Vec3(0, - height / 2, 0));
        const topSphere = new CANNON.Sphere(radius);
        body.addShape(topSphere, new CANNON.Vec3(0, height / 2, 0));


        this.rigidBody = new RigidBody(undefined, body);
        this.rigidBody.setPosition(0, 5, 2);
        this.rigidBody.physicsBody.updateMassProperties();
        this.rigidBody.alive = false;

        this.onGround = false;
        this.isColliding = false;

        physics.world.addEventListener('postStep', () => {
            this.onGround = false;
            this.isColliding = false;

            physics.world.contacts.forEach(contact => {
                if ( contact.bi === this.rigidBody.physicsBody || contact.bj === this.rigidBody.physicsBody ) {
                    const contactNormal = contact.ni.clone();
                    if (contact.bi === this.rigidBody.physicsBody) contactNormal.negate();

                    if (Math.abs(contactNormal.dot(new CANNON.Vec3(0, 1, 0))) > 0.5) {
                        this.onGround = true;
                    }

                    this.isColliding = true;
                }
            });
        });

        this.skin = new THREE.Object3D();
        this.arms = new THREE.Object3D();

        this.gun = new Gun();

        this.bodyAnimator = new Animator();
        this.armsAnimator = new Animator();
        
        this.rightEyeBone = null;
        this.leftEyeBone = null;
        this.handBone = null;

        this.loaded = false;
        this.inCar = false;
        this.loadModel();
    }

    async loadModel() {
        const gltf = await loader.loadAsync("./lib/models/swat_fps.glb");
        this.skin = gltf.scene;
        this.skin.position.set(0, - radius - height / 2, 0);
        this.skin.rotation.x = - Math.PI / 2;

        this.bodyAnimator = new Animator(this.skin);

        this.skin.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
            if (obj.isBone && obj.name === "mixamorigRightEye") {
                this.rightEyeBone = obj;
            }
            if (obj.isBone && obj.name === "mixamorigLeftEye") {
                this.leftEyeBone = obj;
            }
        })

        this.rigidBody.object3d.add(this.skin);
        this.loadArms();
    }

    async loadArms() {
        const gltf = await loader.loadAsync("./lib/models/swat_arms.glb");
        this.arms = gltf.scene;
        this.arms.position.set(0, - radius - height / 2, 0);
        this.arms.rotation.x = - Math.PI / 2;

        this.armsAnimator = new Animator(this.arms);

        this.arms.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
            if (obj.isBone && obj.name === "mixamorigRightHand") {
                this.handBone = obj;
            }
        });

        this.rigidBody.object3d.add(this.arms);

        this.loadGun();
    }

    async loadGun() {
        const gltf = await loader.loadAsync("./lib/models/ar15.glb");
        this.gun.model = gltf.scene;
        this.gun.model.scale.multiplyScalar(0.07);

        this.gun.setTransform();

        this.gun.model.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
        });

        this.handBone.add(this.gun.model);

        this.gun.onModelLoaded();
        this.onLoaded();
    }

    onLoaded() {
        this.loaded = true;

        this.stateManager = new StateManager({arms: this.armsAnimator, body: this.bodyAnimator, gun: this.gun});
    }

    /* --- ACTION METHODS */

    jump() {
        if (this.onGround) {
            this.rigidBody.physicsBody.velocity.y += 2;
        }
    }

    shoot() {
        if (this.stateManager.weapon !== "ads") return;
        this.gun.recoil(camera);
        this.gun.shoot();
    }

    throw() {
        this.throwAction.setThrow("frag");

        setTimeout(() => {
            this.throwAction.executeThrow();
        }, 2100)
    }

    getInCar() {
        if (this.inCar) return;
        this.inCar = true;
        this.gun.setVisibility(false);
        coupe.wakeup();

        this.rigidBody.object3d.remove(this.skin);
        scene.add(this.skin);
        this.rigidBody.object3d.remove(this.arms);
        scene.add(this.arms);
    }

    getOutCar() {
        if (!this.inCar) return;
        this.inCar = false;
        this.gun.setVisibility(true);
        coupe.asleep();

        scene.remove(this.skin);
        this.rigidBody.object3d.add(this.skin);
        scene.remove(this.arms);
        this.rigidBody.object3d.add(this.arms);

        this.skin.position.set(0, - radius - height / 2, 0);
        this.skin.rotation.set(-Math.PI / 2, 0, 0);

        this.arms.position.set(0, - radius - height / 2, 0);
        this.arms.rotation.set(-Math.PI / 2, 0, 0);

    }

    /* --- UPDATE --- */

    applyInputs(keys = {}, forward = new THREE.Vector3(0, 1, 0)) {
        if (this.inCar) return;

        forward.y = 0;
        forward.normalize();
        const side = this.getSideVector();

        const maxSpeed = 25 * this.rigidBody.physicsBody.mass;
        
        const F = new THREE.Vector3();

        if (keys.w) F.add(forward);
        if (keys.s) F.add(forward.negate());
        if (keys.a) F.add(side);
        if (keys.d) F.add(side.negate());
        F.normalize().multiplyScalar(maxSpeed);

        if (!this.isColliding) F.multiplyScalar(0.01);

        const CF = new CANNON.Vec3(F.x, F.y, F.z);

        this.rigidBody.physicsBody.applyForce(CF);

        if (keys[" "]) this.jump();
    }

    updateState(keys = {}, mouse = {}) {
        let movement = "idle", action = "none", weapon = "hipfire";

        if (this.inCar) {
            this.stateManager.setAnimations("driving", action, "none");

            return;
        }

        if (!this.onGround) {
            if (this.rigidBody.physicsBody.velocity.y > 0) {
                movement = "jumpup";
            } else {
                movement = "jumpdown";
            }

            this.stateManager.setAnimations(movement, action, weapon);
            return;
        }

        if (keys.w) {
            movement = "run";
        } else if (keys.a || keys.s || keys.d) {
            movement = "walk";
        }

        if (keys.t) {
            action = "throw";
        }

        if (keys.r) {
            weapon = "reload";
        }


        if (mouse[2] ) {
            weapon = "ads";
        } else {
            weapon = "hipfire";
        }

        this.stateManager.setAnimations(movement, action, weapon);
    }

    updateInput() {
        if (inputs.mouse[0] && !this.gun.cooling) {
            this.gun.cooling = true;
            this.shoot();
            setTimeout(() => {
                this.gun.cooling = false;
            }, Gun.rate)
        }

        if (inputs.keys.f) {
            this.getInCar();
        }
        if (inputs.keys.v) {
            this.getOutCar();
        }
    }

    updateCamera(forward = new THREE.Vector3(0, 1, 0)) {
        if (!this.rightEyeBone || !this.leftEyeBone) return;

        const rightPos = new THREE.Vector3();
        this.rightEyeBone.getWorldPosition(rightPos);

        const leftPos = new THREE.Vector3();
        this.leftEyeBone.getWorldPosition(leftPos);

        const pos = rightPos.clone().lerp(leftPos, 0.5);

        forward.y = 0;
        forward.normalize().multiplyScalar(0.16);
        pos.add(forward);

        camera.position.copy(pos);

        if (this.inCar) {

            return;
        }

        camera.updateMatrixWorld(true);

        if (this.inCar) return;

        const localizer = this.rigidBody.object3d;
        if (this.stateManager.weapon === "ads") {
            localizer.remove(this.arms);
            scene.add(this.arms);

            this.arms.position.copy(camera.position);
            this.arms.quaternion.copy(camera.quaternion);

            this.arms.translateY(-1.521 + this.gun.recoilPos.x);
            this.arms.translateZ(0.1 + this.gun.recoilPos.y);
            this.arms.translateX(-0.153 + this.gun.recoilPos.z);

            this.arms.rotateX(Math.PI / 2 + this.gun.recoilRot.x);
            this.arms.rotateY(Math.PI + this.gun.recoilRot.y);
            this.arms.rotateZ(this.gun.recoilRot.z);
        } else {
            localizer.add(this.arms);
            scene.remove(this.arms);
            this.arms.position.set(0, - radius - height / 2, 0);
            this.arms.rotation.set(-Math.PI / 2, 0, 0);
        }
    }

    updateSkinTransform(forward) {
        if (this.inCar) {
            const vehicle = coupe.model;

            const pos = vehicle.position;
            const quat = vehicle.quaternion;

            const localOffset = new THREE.Vector3(-0.23, 0.13, -0.4);
            const rotatedOffset = localOffset.clone().applyQuaternion(quat);
            const finalPos = pos.clone().add(rotatedOffset);
            this.skin.position.copy(finalPos);
            this.arms.position.copy(finalPos);

            const localRot = new THREE.Quaternion();
            localRot.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));

            const finalQuat = quat.clone().multiply(localRot);
            this.skin.quaternion.copy(finalQuat);
            this.arms.quaternion.copy(finalQuat);

            return;
        };
        const yaw = Math.atan2(forward.x, forward.z);
        this.rigidBody.object3d.rotation.y = yaw;
    }

    update(dt) {
        if (!this.loaded) return;
        const forward = this.getForwardVector();
        const vel = this.rigidBody.physicsBody.velocity;
        if (this.onGround) vel.set(vel.x * 0.90, vel.y * 1, vel.z * 0.90);
        this.rigidBody.update(dt);

        this.applyInputs(inputs.keys, forward.clone());
        this.updateInput();
        this.updateState(inputs.keys, inputs.mouse);

        this.bodyAnimator.update(dt);
        this.armsAnimator.update(dt);

        this.gun.update(dt);

        this.updateSkinTransform(forward.clone());
        this.updateCamera(forward.clone());
    }

    /* --- GET METHODS --- */

    getForwardVector() {
        const vec = new THREE.Vector3();
        camera.getWorldDirection(vec);
        return vec.normalize();
    }

    getSideVector() {
        const vec = this.getForwardVector();
        return new THREE.Vector3(vec.z, 0, -vec.x).normalize();
    }
}



export const player = new Player();
