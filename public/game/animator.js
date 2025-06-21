import * as THREE from "./lib/three/build/three.module.js"
import { FBXLoader } from "./lib/three/examples/jsm/loaders/FBXLoader.js"


export class Animator {
    static ANIMATION_TIME = 0.200;
    constructor (model = new THREE.Object3D()) {
        this.mixer = new THREE.AnimationMixer(model);
        this.animations = {};

        const loader = new FBXLoader();

        [
            "idle_rifle",
            "walk_rifle",
            "run_rifle",
            "idle_rifle_ads",
            "walk_rifle_ads",
            "run_rifle_ads",
            "reloading",
            "shooting"
        ]
        .forEach(key => {
            loader.load(`./lib/animations/${key}.fbx`, animation => {
                this.animations[key] = this.mixer.clipAction(animation.animations[0]);
            })
        })

        this.currentAnimation = "";
    }

    play(name = "") {
        if (name === this.currentAnimation) return;
        Object.entries(this.animations).forEach(([name, value]) => {
            this.animations[name].fadeOut(Animator.ANIMATION_TIME);
        })
 
        if (!this.animations[name]) return;
        this.animations[name].reset().fadeIn(Animator.ANIMATION_TIME).play();
        this.currentAnimation = name;
    }

    update(dt) {
        this.mixer.update(dt * 0.5)
    }
}