import * as THREE from "./lib/three/build/three.module.js"
import { camera, scene } from "./main.js";
import { ParticleSystem } from "./physics/particles.js";
import { physics } from "./physics/physics.js";

const defaultTransform = {
    rotation: [Math.PI / 2 - 0.45, 0, - Math.PI / 2],
    position: [3, 25, -2]
}

const geometry = new THREE.BoxGeometry( 0.01, 0.01, 0.01 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const mesh = new THREE.Mesh( geometry, material );

export class Gun {
    static LERP_FACTOR = 1;
    constructor () {
        this.model = new THREE.Object3D();

        this.newTransform = {
            rotation: [Math.PI / 2 - 0.45, 0, - Math.PI / 2],
            position: [3, 25, -2]
        }
    }

    getPipeTransform() {
        const p = new THREE.Vector3();
        this.model.getWorldPosition(p);

        const d = new THREE.Vector3();
        this.model.getWorldDirection(d);
        d.negate().multiplyScalar(0.5);

        const up = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);
        up.multiplyScalar(- 0.1);

        p.add(d);
        p.add(up);

        return p;
    }


    getDirection() {
        const d = new THREE.Vector3();
        this.model.getWorldDirection(d);

        return d.negate().normalize();
    }

    setTransform(rotation = defaultTransform.rotation, position = defaultTransform.position) {
        this.newTransform.rotation = rotation;
        this.newTransform.position = position;
    }

    shoot() {
        /*
        const p = this.getPipeTransform();
        const d = this.getDirection();
        const count = 100;
        const particleSystem = new ParticleSystem(count);
        particleSystem.opacityLerpFactor = 0.10;

        const right = new THREE.Vector3(d.z, 0, -d.x);
        const up = new THREE.Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);

        for (let i = 0; i < count; i++) {
            const t = Math.pow(Math.random(), 3);
            const forwardOffset = d.clone().multiplyScalar(t * 1.5);

            const angle = Math.random() * Math.PI * 2;
            const radius = (1 - t) * 0.1;
            const radialOffset = right.clone().multiplyScalar(Math.cos(angle) * radius)
                .add(up.clone().multiplyScalar(Math.sin(angle) * radius));

            const position = p.clone().add(forwardOffset).add(radialOffset);
            position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
            ))

            const color = new THREE.Color(1 - t, 1 - t, 1 - t);
            if (t < 0.2) {
                color.setRGB(1 - t * 5, 0.20 - t * 2, 0);
            }
            particleSystem.setParticle(i, position, color);

            particleSystem.applyForce(i, radialOffset);
        }

        physics.addParticleSystem(particleSystem);
        */
    }





    update(dt) {
        const newPos = this.model.position.clone().lerp(new THREE.Vector3(...this.newTransform.position), Gun.LERP_FACTOR);
        this.model.position.copy(newPos);

        const currentRot = new THREE.Vector3(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z);
        const targetRot = new THREE.Vector3(...this.newTransform.rotation);
        const newRot = currentRot.lerp(targetRot, Gun.LERP_FACTOR);
        this.model.rotation.set(newRot.x, newRot.y, newRot.z);
    }
}