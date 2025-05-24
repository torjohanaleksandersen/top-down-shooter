import * as THREE from "./lib/three/build/three.module.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js"

const loader = new GLTFLoader();

class Gun extends THREE.Object3D {
    constructor () {
        super();
        loader.load("lib/models/MP40.glb", gltf => {
            const model = gltf.scene;
            this.add(model);
        })

        this.scale.multiplyScalar(70);
        this.rotation.set(0, 0, 1 + Math.PI);
        this.position.y = 30;
        this.position.x = 13;
    }
}

const gun = new Gun();

export class Hand {
    constructor (skeleton) {

        skeleton.bones.forEach(bone => {
            if (bone.name === "mixamorigRightHand") {
                bone.add(gun);
            }
        })
    }
}