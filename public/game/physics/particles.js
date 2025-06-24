import * as THREE from "../lib/three/build/three.module.js"

export class ParticleSystem {
    constructor(count, size = 0.1, opacity = 1.0) {
        this.count = count;

        this.positions = new Float32Array(count * 3);
        this.velocities = new Array(count).fill().map(() => new THREE.Vector3());
        this.accelerations = new Array(count).fill().map(() => new THREE.Vector3());
        this.colors = new Array(count).fill().map(() => new THREE.Color());

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        const material = new THREE.PointsMaterial({
            size: size,
            vertexColors: true,
            transparent: true,
            opacity: opacity,
        });

        const colors = new Float32Array(count * 3);
        this.colorAttr = new THREE.BufferAttribute(colors, 3);
        geometry.setAttribute('color', this.colorAttr);

        this.points = new THREE.Points(geometry, material);

        this.opacityLerpFactor = 0;
        this.colorLerpFactor = 0;


        this.dead = false;
    }

    setParticle(i, position, color = new THREE.Color(1, 0, 1)) {
        this.positions[i * 3] = position.x;
        this.positions[i * 3 + 1] = position.y;
        this.positions[i * 3 + 2] = position.z;

        this.colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    setEndStateParticle(i, color = new THREE.Color()) {
        this.colors[i] = color;
    }

    applyForce(i, force) {
        this.accelerations[i].add(force);
    }

    applyImpulse(i, F = new THREE.Vector3(0, 0, 0), dt = 0) {
        const v = F.clone().multiplyScalar(dt);
        this.velocities[i].add(v);
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

            const currentColor = new THREE.Color().fromArray(this.colorAttr.array, i * 3);

            currentColor.lerp(this.colors[i], this.colorLerpFactor);
            this.colorAttr.setXYZ(i, currentColor.r, currentColor.g, currentColor.b);
        }
        this.colorAttr.needsUpdate = true;

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;

        const current = this.points.material.opacity;
        const target = 0;
        const lerpFactor = this.opacityLerpFactor;

        this.points.material.opacity = current + (target - current) * lerpFactor;
        if (this.points.material.opacity <= 0) this.dead = true;

    }
}
