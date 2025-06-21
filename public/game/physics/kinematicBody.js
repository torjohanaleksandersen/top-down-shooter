import * as THREE from "../lib/three/build/three.module.js"
import { RigidBody } from "./rigidBody.js";
import { physics } from "./physics.js";
import { scene } from "../main.js";

export class KinematicBody extends RigidBody {
    constructor (height, radius, mass) {
        super (height, radius, mass);

        this.moveForceMagnitude = 1000;
        this.jumpForceMagnitude = 4 * this.mass;
        this.crouchHeight = 1 / 4 * this.cylinderHeight;

        this.crouching = false;
    }

    applyInput(keys = {}, forwardVec = new THREE.Vector3(-1, 0, 0)) {
        const m = new THREE.Vector3(0, 0, 0);
        const sideVec = new THREE.Vector3(forwardVec.z, 0, -forwardVec.x);

        if (keys["w"]) m.add(forwardVec);
        if (keys["s"]) m.sub(forwardVec);
        if (keys["a"]) m.add(sideVec);
        if (keys["d"]) m.sub(sideVec);
        if (keys[" "]) this.jump();
        this.crouch(keys["shift"]);

        if (m.lengthSq() > 0) {
            m.normalize().multiplyScalar(this.moveForceMagnitude);
            if (!this.onGround) m.multiplyScalar(0.1);
            this.applyForce(m);
        }
    }

    jump() {
        if (this.onGround) {
            const F = new THREE.Vector3(0, 1, 0).multiplyScalar(this.jumpForceMagnitude);
            this.applyImpulse(F, 1);
        }
    }

    crouch(d) {
        if (d === this.crouching || d === undefined || (this.crouching && !this.canStandUp())) return;

        this.crouching = d;

        const prevHeight = this.cylinderHeight;
        if (this.crouching) {
            this.cylinderHeight = this.crouchHeight;
        } else {
            this.cylinderHeight = this.height - 2 * this.radius;
        }
        const heightDelta = this.cylinderHeight - prevHeight;
        this.position.y += heightDelta / 2;
    }

    canStandUp() {
        const positions = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ]

        let successfull = true;
        positions.forEach(position => {
            const raycaster = new THREE.Raycaster(
                this.end.clone().add(position.multiplyScalar(this.radius * 0.8)), 
                new THREE.Vector3(0, 1, 0), 
                0, 
                this.radius + (this.height / 2) - this.cylinderHeight
            );

            const result = physics.rayIntersectsStaticBodies(raycaster);

            if (result.hit) successfull = false;
        })

        return successfull;
    }
}