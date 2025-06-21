import * as THREE from "./lib/three/build/three.module.js"
import { camera, scene } from "./main.js";
import { KinematicBody } from "./physics/kinematicBody.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"
import { Animator } from "./animator.js";
import { Gun } from "./gun.js";

const keys = {};
const mouse = {};

document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
})
document.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = false;
})

document.addEventListener("mousedown", (e) => {
    mouse[e.button] = true;
})
document.addEventListener("mouseup", (e) => {
    mouse[e.button] = false;
})

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

        this.aiming = false;
        this.shooting = false;
        this.movement = "idle";
        this.inHand = "rifle";

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

    handleInput() {
        this.gunAction = "";
        if (keys.w) {
            this.movement = "run";
        } else if (keys.s || keys.a || keys.d) {
            this.movement = "walk";
        } else {
            this.movement = "idle";
        }

        if (mouse[0]) {
            if (this.shooting) return;
            this.shooting = true;
            this.gun.shoot();

            setTimeout(() => {
                this.shooting = false;
            }, 100)
        }

        if (mouse[2]) {
            this.aiming = true;
        } else {
            this.aiming = false;
        }
    }

    animate() {
        let mainName = "";
        let handName = "";

        mainName = handName = this.movement + "_" + this.inHand;

        if (this.aiming) {
            mainName += "_ads"
            handName = "idle_rifle_ads";
        }

        if (this.movement === "walking" || this.aiming) this.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
        else this.gun.setTransform();

        this.animator.play(mainName);
        this.handAnimator.play(handName);
    }

    update(dt) {
        const forward = this.getForwardVector();
        this.applyInput(keys, forward);
        this.handleInput();
        super.update(dt);
        this.animate();

        if (this.headBone) {
            const headPos = new THREE.Vector3();
            this.headBone.getWorldPosition(headPos);
            const f = forward.clone();
            f.y = 0;
            f.normalize().multiplyScalar(0.16);
            f.y = -0.2;
            headPos.add(f)

            camera.position.copy(headPos)

            if (this.aiming) {
                // Position
                const worldCamPos = new THREE.Vector3();
                camera.getWorldPosition(worldCamPos);
                this.arms.position.copy(this.worldToLocal(worldCamPos)); // camera position in local player space

                this.arms.translateY(0.1)
                this.arms.translateZ(-1.521);
                this.arms.translateX(0.153);

                // Rotation
                const worldCamQuat = new THREE.Quaternion();
                camera.getWorldQuaternion(worldCamQuat);
                this.arms.quaternion.copy(this.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldCamQuat));
            
                this.arms.rotateX(Math.PI / 2);
                this.arms.rotateY(Math.PI);
            } else {
                this.arms.position.set(0, -this.radius - this.cylinderHeight / 2, 0);
                this.arms.rotation.x = - Math.PI / 2;
            }
        }


        const yaw = Math.atan2(forward.x, forward.z);
        this.rotation.y = yaw;

        this.animator.update(dt);
        this.handAnimator.update(dt)
        this.gun.update(dt)
    }
}



export const player = new Player();