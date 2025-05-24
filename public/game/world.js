import * as THREE from "./lib/three/build/three.module.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const modelNames = ["floor", "wall_inside"];
const models = {};

function loadModel(name) {
    return new Promise(resolve => {
        loader.load(`./lib/models/buildings/${name}.glb`, gltf => {
            const model = gltf.scene;
            model.scale.multiplyScalar(0.01);
            models[name] = model;
            resolve();
        });
    });
}

let world = null;

export async function initWorld() {
    await Promise.all(modelNames.map(loadModel));

    class World extends THREE.Object3D {
        constructor() {
            super();
            this.add(models["floor"]);

            this.position.y = 0;


            const wall1 = models["wall_inside"].clone()
            wall1.position.x = 1
            this.add(wall1);

            const wall2 = models["wall_inside"].clone()
            wall2.position.x = -1
            wall2.rotation.y = Math.PI
            this.add(wall2);
        }
    }

    world = new World();
}

export { world };
