import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { physics } from "../physics/main.js";
import { RigidBody } from "../physics/rigidBody.js";
import { Civilian } from "./civilian.js";



export class World {
    constructor () {
        this.rigidBodies = [];
        this.civilians = [];
        this.material = new CANNON.Material();

        this.build();
    }

    addCivilian(civilian = new Civilian()) {
        this.civilians.push(civilian);
    }

    build() {
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);

        const groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.material,
        })

        const ground = new RigidBody(groundMesh, groundBody);
        ground.setRotation(- Math.PI / 2, 0, 0);

        physics.addRigidBody(ground);
        this.rigidBodies.push(ground);
    }

    get3DObjects() {
        const objects = [];
        this.getRigidBodies().forEach(rb => {
            objects.push(rb.object3d);
        })
        return objects;
    }

    getRigidBodies() {
        return this.rigidBodies;
    }

    getCivilians() {
        const objects = [];
        this.civilians.forEach(civ => {
            civ.model.updateMatrixWorld(true);
            objects.push(...civ.colliders);
        })
        return objects;
    }
}