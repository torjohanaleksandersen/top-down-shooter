import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { GLTFLoader } from "../lib/three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "../lib/three/examples/jsm/loaders/DRACOLoader.js";
import { scene } from "../game.js";
import { Ragdoll } from "../physics/ragdoll.js";
import { Animator } from "../player/animator.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('../lib/three/examples/jsm/libs/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const colliders = [
    {
        name: "mixamorigHead",
        mesh: new THREE.Mesh(
            new THREE.SphereGeometry(13, 10, 10),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 9, 4)
    },
    {
        name: "mixamorigSpine1",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(30, 60, 20),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 0, 0)
    },
    {
        name: "mixamorigRightArm",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(7, 30, 7),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 10, 0)
    },
    {
        name: "mixamorigRightForeArm",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(7, 30, 7),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 13, 0)
    },
    {
        name: "mixamorigRightUpLeg",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(15, 40, 15),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 20, 0)
    },
    {
        name: "mixamorigRightLeg",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(13, 35, 13),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 15, 0)
    },

    {
        name: "mixamorigLeftArm",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(7, 30, 7),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 10, 0)
    },
    {
        name: "mixamorigLeftForeArm",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(7, 30, 7),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 13, 0)
    },
    {
        name: "mixamorigLeftUpLeg",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(15, 40, 15),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 20, 0)
    },
    {
        name: "mixamorigLeftLeg",
        mesh: new THREE.Mesh(
            new THREE.BoxGeometry(13, 35, 13),
            new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false})
        ),
        position: new THREE.Vector3(0, 15, 0)
    },
]


export class Civilian {
    constructor (name) {
        this.name = "brian";
        
        this.ragdoll = new Ragdoll();
        this.animator = new Animator();

        this.isRagdoll = false;
        this.loaded = false;
        this.dead = false;
        this.health = 3;

        this.model = new THREE.Object3D();
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.colliders = [];

        this.loadModel();
    }

    async loadModel() {
        const gltf = await loader.loadAsync(`./lib/models/civilians/${this.name}.glb`);
        this.model = gltf.scene;

        this.model.rotation.x = - Math.PI / 2;

        this.model.traverse(obj => {
            if (obj.isMesh) {
                const material = obj.material;
                material.depthWrite = true;
                material.depthTest = true;
                material.needsUpdate = true;

                obj.material = new THREE.MeshLambertMaterial(material);

                obj.frustumCulled = false;
                obj.geometry.computeBoundingBox();
                obj.geometry.computeBoundingSphere();
            }
        })

        this.ragdoll = new Ragdoll(this.model);
        this.ragdoll.disable();

        this.animator = new Animator(this.model);

        scene.add(this.model);
        this.onModelLoaded();
    }

    onModelLoaded() {
        this.loaded = true;

        this.createColliders()
    }

    createColliders() {
        this.model.traverse(obj => {
            colliders.forEach(collider => {
                const { name, mesh, position } = collider;
                if (obj.isBone && obj.name === name) {
                    mesh.position.copy(position);
                    mesh.userData.type = "civilian";
                    mesh.userData.this = this;
                    obj.add(mesh);
                    this.colliders.push(mesh);
                }
            })
        })
    }

    onHit() {
        if (this.dead) return;
        if (this.health <= 0) {
            this.dead = true;
            this.convertToRagdoll();
        }
        this.health--;
    }

    step() {
        this.animator.play("walk");
    }

    convertToRagdoll() {
        if (this.isRagdoll) return;
        this.isRagdoll = true;

        const v = this.velocity.clone();
        this.ragdoll.enable(new CANNON.Vec3(v.x, v.y, v.z));
    }

    update(dt) {
        if (!this.loaded) return;
        this.step();
        this.animator.update(dt);

        this.model.position.add(this.velocity.clone().multiplyScalar(dt));

        if (this.isRagdoll) this.ragdoll.update();
    }
}