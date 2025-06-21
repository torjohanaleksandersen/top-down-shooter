import * as THREE from "../lib/three/build/three.module.js"

export class ParticleSystem {
    constructor(count) {
        this.count = count;

        this.positions = new Float32Array(count * 3);
        this.velocities = new Array(count).fill().map(() => new THREE.Vector3());
        this.accelerations = new Array(count).fill().map(() => new THREE.Vector3());

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
        });

        const colors = new Float32Array(count * 3);
        this.colorAttr = new THREE.BufferAttribute(colors, 3);
        geometry.setAttribute('color', this.colorAttr);

        this.points = new THREE.Points(geometry, material);

        this.opacityLerpFactor = 0;


        this.dead = false;
    }

    setParticle(i, position, color = new THREE.Color(1, 0, 1)) {
        this.positions[i * 3] = position.x;
        this.positions[i * 3 + 1] = position.y;
        this.positions[i * 3 + 2] = position.z;

        this.colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    applyForce(i, force) {
        this.accelerations[i].add(force);
    }

    applyGlobalForce(force) {
        for (let i = 0; i < this.count; i++) {
            this.applyForce(i, force);
        }
    }

    update(dt) {
        for (let i = 0; i < this.count; i++) {
            this.velocities[i].addScaledVector(this.accelerations[i], dt);
            const index = i * 3;
            this.positions[index] += this.velocities[i].x * dt;
            this.positions[index + 1] += this.velocities[i].y * dt;
            this.positions[index + 2] += this.velocities[i].z * dt;
            this.accelerations[i].set(0, 0, 0);
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;

        const current = this.points.material.opacity;
        const target = 0;
        const lerpFactor = this.opacityLerpFactor;

        this.points.material.opacity = current + (target - current) * lerpFactor;
        if (this.points.material.opacity <= 0) this.dead = true;

    }
}
