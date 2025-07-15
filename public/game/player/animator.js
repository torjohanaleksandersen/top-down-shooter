import * as THREE from "../lib/three/build/three.module.js"
import { FBXLoader } from "../lib/three/examples/jsm/loaders/FBXLoader.js"


export class Animator {
    static ANIMATION_TIME = 0.200;
    constructor (model = new THREE.Object3D()) {
        this.mixer = new THREE.AnimationMixer(model);
        this.animations = {};

        const loader = new FBXLoader();

        [
            "idle",
            "walk",
            "run",
            "idle-ads",
            "walk-ads",
            "run-ads",
            "reload",
            "shoot",
            "jumpup",
            "jumpdown",
            "throw",
            "dead",
            "driving",


            "civ-idle"
        ]
        .forEach(key => {
            loader.load(`./lib/animations/${key}.fbx`, animation => {
                this.animations[key] = this.mixer.clipAction(animation.animations[0]);
                

                if (key.includes("jump")) {
                    this.animations[key].setLoop(THREE.LoopOnce);
                    this.animations[key].clampWhenFinished = true;
                }
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

    restart() {
        if (!this.animations[this.currentAnimation]) return;
        this.animations[this.currentAnimation].reset();
        this.animations[this.currentAnimation].play();
    }

    stop() {
        Object.entries(this.animations).forEach(([name, value]) => {
            this.animations[name].fadeOut(Animator.ANIMATION_TIME);
        })
    }

    update(dt) {
        this.mixer.update(dt)
    }
}