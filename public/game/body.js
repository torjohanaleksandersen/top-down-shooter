import { Hand } from "./hand.js";
import * as THREE from "./lib/three/build/three.module.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "./lib/three/examples/jsm/loaders/FBXLoader.js";

export class Body extends THREE.Object3D {
    constructor () {
        super()
        this.position.set(0, 1, 0);
        this.velocity = new THREE.Vector2(0, 0);

        this.speed = 5;
        this.accelerationMagnitude = 5;
        this.radius = 0.5;

        this.aiming = false;
        this.shooting = false;

        this.animations = {};
        this.mixer = new THREE.AnimationMixer();
        this.currentAnimation = "";
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
                    child.frustumCulled = false;

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
        if (key === this.currentAnimation) return;
        Object.entries(this.animations).forEach(([key, value]) => {
            this.animations[key].fadeOut(0.15);
        })
 
        if (!this.animations[key]) return;
        this.animations[key].reset().fadeIn(0.15).play();
        this.currentAnimation = key;
    }

    aim() {
        this.aiming = true;
        this.hand.gun.setTransform([Math.PI / 2, 0, - Math.PI / 2], [3, 25, 5])
    }

    update(dt) {
        this.mixer.update(dt);
        if (this.hand && this.hand.gun) this.hand.gun.update(dt)
    }
}