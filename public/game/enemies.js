import { scene } from "./game.js";
import { Hand } from "./hand.js";
import * as THREE from "./lib/three/build/three.module.js"
import { FBXLoader } from "./lib/three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";

class Enemy extends THREE.Object3D {
    constructor () {
        super();
        this.position.set(0, 1, 0);

        this.velocity = new THREE.Vector2(0, 0);
        this.mixer = new THREE.AnimationMixer();

        this.animations = {};
        this.currentAnimation = "";

        this.rotateX(- Math.PI / 2)

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
        if (key === this.currentAnimation) return;

        Object.entries(this.animations).forEach(([key, value]) => {
            this.animations[key].fadeOut(0.15);
        })
 
        if (!this.animations[key]) return;
        this.animations[key].reset().fadeIn(0.15).play();
        this.currentAnimation = key;
    }

    update(dt) {
        this.mixer.update(dt);
    }
}


export class Enemies extends Map {
    constructor () {
        super();
    }

    add(id) {
        if (this.has(id)) return;
        const enemy = new Enemy();
        scene.add( enemy );

        this.set(id, enemy);
    }

    remove(id) {
        if (this.has(id)) {
            scene.remove(this.get(id));
            this.delete(id);
        }
    }

    onServerUpdate(data, id) {
        const [position, velocity, state, rotation] = data;

        if (this.has(id)) {
            const enemy = this.get(id);

            enemy.position.set(...position);
            enemy.velocity.set(...velocity);
            enemy.rotation.z = rotation;
            
            const animation = state[0] + "_rifle" + (state[1] ? "_ads" : "");
            enemy.playAnimation(animation);
        }
    }

    update(dt) {
        this.forEach((enemy, id) => {
            enemy.position.x += enemy.velocity.x * dt;
            enemy.position.z += enemy.velocity.y * dt;

            enemy.update(dt);
        })
    }
}

export const enemies = new Enemies();