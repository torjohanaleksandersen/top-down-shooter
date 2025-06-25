import * as THREE from "../lib/three/build/three.module.js"
import { camera, scene } from "../main.js";
import { KinematicBody } from "../physics/kinematicBody.js";
import { GLTFLoader } from "../lib/three/examples/jsm/loaders/GLTFLoader.js"
import { Animator } from "../animator.js";
import { Gun } from "../gun.js";
import { inputManager } from "./input-manager.js";
import { PlayerStateManager, IdleState, WalkState, JumpState, NoActionState, ThrowState, HipfireState, AimDownSightState, RunState, ReloadingState } from "./player-state-manager.js";

const loader = new GLTFLoader();

class Player extends KinematicBody {
    constructor() {
        super(2, 0.5, 90);
        this.skin = new THREE.Object3D();
        this.arms = new THREE.Object3D();
        this.gun = new Gun();
        this.animator = new Animator();
        this.handAnimator = new Animator();
        this.headBone = null;
        this.handBone = null;

        this.movementState = new PlayerStateManager(this, "movement");
        this.actionState = new PlayerStateManager(this, "action");
        this.weaponState = new PlayerStateManager(this, "weapon");

        this.movementState.setStates({
            idle: new IdleState(this),
            walk: new WalkState(this),
            run: new RunState(this),
            jumpup: new JumpState(this, "up"),
            jumpdown: new JumpState(this, "down"),
        });

        this.actionState.setStates({
            none: new NoActionState(this),
            throw: new ThrowState(this),
        });

        this.weaponState.setStates({
            hipfire: new HipfireState(this),
            reload: new ReloadingState(this),
            ads: new AimDownSightState(this),
        });

        this.actionState.setState("none");
        this.weaponState.setState("hipfire");
        this.movementState.setState("idle");

        this.loadModel();
    }

    async loadModel() {
        const gltf = await loader.loadAsync("./lib/models/swat_fps.glb");
        this.remove(this.skin);
        this.skin = gltf.scene;
        this.skin.position.set(0, -this.radius - this.cylinderHeight / 2, 0);
        this.animator = new Animator(this.skin);

        this.skin.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
            if (obj.isBone && obj.name === "mixamorigHeadTop_End") {
                this.headBone = obj;
            }
        });

        this.skin.rotation.x = - Math.PI / 2

        this.add(this.skin);

        this.loadArms();
    }

    async loadArms() {
        const gltf = await loader.loadAsync("./lib/models/swat_arms.glb");
        this.remove(this.arms);
        this.arms = gltf.scene;
        this.arms.position.set(0, -this.radius - this.cylinderHeight / 2, 0);
        this.handAnimator = new Animator(this.arms);

        this.arms.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
            if (obj.isBone && obj.name === "mixamorigRightHand") {
                this.handBone = obj;
            }
        });

        this.arms.rotation.x = - Math.PI / 2;

        this.add(this.arms);

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
    }

    getForwardVector() {
        const vec = new THREE.Vector3();
        camera.getWorldDirection(vec);
        return vec.normalize();
    }

    getSideVector() {
        const vec = this.getForwardVector();
        return new THREE.Vector3(vec.z, 0, -vec.x).normalize();
    }

    shoot() {
        if (!this.weaponState.is("ads")) return;
        this.gun.recoil(camera);
        this.gun.shoot();

        this.handAnimator.restart();
    }

    updateInput() {
        if (inputManager.mouse[0] && !this.gun.cooling) {
            this.gun.cooling = true;
            this.shoot();
            setTimeout(() => {
                this.gun.cooling = false;
            }, Gun.rate)
        }
    }

    updateState() {
        if (!this.onGround) {
            if (this.velocity.y > 0) {
                this.movementState.setState("jumpup")
            } else {
                this.movementState.setState("jumpdown")
            }
            this.weaponState.setState("hipfire");

            return;
        }

        if (inputManager.keys.w) {
            this.movementState.setState("run");
        } else if (inputManager.keys.s || inputManager.keys.a || inputManager.keys.d) {
            this.movementState.setState("walk");
        } else {
            this.movementState.setState("idle");
        }

        if (inputManager.keys.t) {
            this.actionState.setState("throw", this.movementState.forceUpdates);
        } else {
            this.actionState.setState("none", this.movementState.forceUpdates);
        }

        if (inputManager.keys.shift) {
            
        } else {

        }

        if (inputManager.keys.r && !this.weaponState.is("reload")) {
            this.weaponState.setState("reload", this.movementState.forceUpdates);

            setTimeout(() => {
                this.weaponState.setState("hipfire", this.movementState.forceUpdates);
            }, Gun.reloadTime)
        } else if (!this.weaponState.is("ads") && !this.weaponState.is("reload")) {
            this.weaponState.setState("hipfire", this.movementState.forceUpdates)
        }
        
        if (inputManager.mouse[2] && !this.weaponState.is("reload")) {
            this.weaponState.setState("ads", this.movementState.forceUpdates);
        } else if (!this.weaponState.is("reload")) {
            this.weaponState.setState("hipfire", this.movementState.forceUpdates);
        }

        this.movementState.forceUpdates = false;
    }

    updateCamera(forward) {
        const headPos = new THREE.Vector3();
        this.headBone.getWorldPosition(headPos);
        const f = forward.clone();
        f.y = 0;
        f.normalize().multiplyScalar(0.18);
        f.y = -0.15;
        headPos.add(f);

        camera.position.lerp(headPos, 0.95);

        if (this.weaponState.is("ads") || this.actionState.is("throw")) {
            const worldCamPos = new THREE.Vector3();
            camera.getWorldPosition(worldCamPos);
            this.arms.position.copy(this.worldToLocal(worldCamPos));

            this.arms.translateY(0.1 + this.gun.recoilPos.x);
            this.arms.translateZ(-1.521 + this.gun.recoilPos.y);
            this.arms.translateX(0.153 + this.gun.recoilPos.z);

            const worldCamQuat = new THREE.Quaternion();
            camera.getWorldQuaternion(worldCamQuat);
            this.arms.quaternion.copy(this.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldCamQuat));
        
            this.arms.rotateX(Math.PI / 2 + this.gun.recoilRot.x);
            this.arms.rotateY(Math.PI + this.gun.recoilRot.y);
            this.arms.rotateZ(this.gun.recoilRot.z);
        } else {
            this.arms.position.set(0, -this.radius - this.cylinderHeight / 2, 0);
            this.arms.rotation.x = - Math.PI / 2;
        }
    }

    update(dt) {
        const forward = this.getForwardVector();
        const fv = new THREE.Vector3(forward.x, 0, forward.z).normalize();
        this.applyInput(inputManager.keys, fv);
        this.updateState();
        this.updateInput();

        super.update(dt);

        if (this.headBone) {
            this.updateCamera(forward);
        }

        const yaw = Math.atan2(forward.x, forward.z);
        this.rotation.y = yaw;


        this.animator.update(dt);
        this.handAnimator.update(dt)
        this.gun.update(dt)
    }
}



export const player = new Player();