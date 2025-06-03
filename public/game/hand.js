import * as THREE from "./lib/three/build/three.module.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"
import { player, forwardVec } from "./player.js";

const loader = new GLTFLoader();

const defaultTransform = {
    rotation: [Math.PI / 2 - 0.45, 0, - Math.PI / 2],
    position: [3, 25, -2]
}

const lerpFactor = 0.50

class Gun extends THREE.Object3D {
    constructor () {
        super();

        this.newTransform = {
            rotation: [Math.PI / 2 - 0.45, 0, - Math.PI / 2],
            position: [3, 25, -2]
        }

        loader.load("lib/models/ar15.glb", gltf => {
            const model = gltf.scene;

            this.add(model);
        })

        this.scale.multiplyScalar(0.07);
        this.setDefaultTransform();
    }

    setDefaultTransform() {
        this.setTransform();
    }

    setTransform(rotation = defaultTransform.rotation, position = defaultTransform.position) {
        this.newTransform.rotation = rotation;
        this.newTransform.position = position;
    }

    getEndPointPositionOfGun() {
        const p = new THREE.Vector3();
        this.getWorldPosition(p);
        const d = new THREE.Vector3();
        this.getWorldDirection(d);
        d.negate().multiplyScalar(0.4)

        p.add(d);
        
        return p;
    }

    update() {
        const newPos = this.position.clone().lerp(new THREE.Vector3(...this.newTransform.position), lerpFactor);
        this.position.copy(newPos);

        const currentRot = new THREE.Vector3(this.rotation.x, this.rotation.y, this.rotation.z);
        const targetRot = new THREE.Vector3(...this.newTransform.rotation);
        const newRot = currentRot.lerp(targetRot, lerpFactor);
        this.rotation.set(newRot.x, newRot.y, newRot.z);
    }

}

export class Hand {
    constructor (skeleton) {
        this.gun = new Gun();
        this.bone = null;

        skeleton.bones.forEach(bone => {
            if (bone.name === "mixamorigRightHand") {
                bone.add(this.gun);
                this.bone = bone;
            }
        })
    }
}