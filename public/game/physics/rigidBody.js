import * as THREE from "../lib/three/build/three.module.js"

export class RigidBody extends THREE.Object3D {
    constructor (height, radius, mass = 1) {
        super();
        this.height = height;
        this.radius = radius;
        this.mass = mass;

        this.position.set(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.appliedForce = new THREE.Vector3(0, 0, 0);

        this.onGround = false;
        this.damping = 0.02;

        this.cylinderHeight = this.height - 2 * this.radius;
        this.start = this.position.clone().sub(new THREE.Vector3(0, this.cylinderHeight / 2, 0));
        this.end = this.position.clone().add(new THREE.Vector3(0, this.cylinderHeight / 2, 0));
    }

    applyForce(F = new THREE.Vector3(0, 0, 0)) {
        this.appliedForce.add(F);
    }

    applyImpulse(F = new THREE.Vector3(0, 0, 0), dt = 0) {
        const v = F.clone().multiplyScalar(dt).divideScalar(this.mass);
        this.velocity.add(v);
    }

    applyTransform(options) {
        for (const transform in options) {
            const value = options[transform];
            this[transform] = value;
        }
    }

    update(dt) {
        this.applyForce(new THREE.Vector3(0, -9.81 * this.mass, 0));

        this.acceleration.copy(this.appliedForce.divideScalar(this.mass));
        this.velocity.add(this.acceleration.clone().multiplyScalar(dt));
        if (this.onGround) this.velocity.multiply(new THREE.Vector3(1 - this.damping, 1, 1 - this.damping));

        this.position.add(this.velocity.clone().multiplyScalar(dt));

        this.start.copy(this.position.clone().sub(new THREE.Vector3(0, this.cylinderHeight / 2, 0)));
        this.end.copy(this.position.clone().add(new THREE.Vector3(0, this.cylinderHeight / 2, 0)));

        this.appliedForce.set(0, 0, 0);
    }
}