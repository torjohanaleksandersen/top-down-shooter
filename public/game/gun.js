import { Blood, decalsManager } from "./decals.js";
import * as THREE from "./lib/three/build/three.module.js"
import { DecalGeometry } from "./lib/three/examples/jsm/geometries/DecalGeometry.js";
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";
import { camera, scene } from "./main.js";
import { ParticleSystem } from "./physics/particles.js";
import { physics } from "./physics/physics.js";
import { RigidBody } from "./physics/rigidBody.js";

const defaultTransform = {
    rotation: [Math.PI / 2 - 0.45, 0, - Math.PI / 2],
    position: [3, 25, -2]
}

let casingModel = new THREE.Object3D();
const loader = new GLTFLoader();
loader.load("lib/models/7.62_casing.glb", (gltf) => {
    casingModel = gltf.scene;
    casingModel.scale.setScalar(0.25);
})

export class Gun {
    static LERP_FACTOR = 1;

    static rate = 100;
    static reloadTime = 2400;

    constructor () {
        this.model = new THREE.Object3D();
        this.cooling = false;

        this.recoilPos = new THREE.Vector3(0, 0, 0);
        this.recoilRot = new THREE.Vector3(0, 0, 0);

        this.casings = [];
        this.particleSystems = [];

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

    getBulletStartSpeed() {
        return 790 + Math.random() * 120;
    }

    setTransform(rotation = defaultTransform.rotation, position = defaultTransform.position) {
        this.newTransform.rotation = rotation;
        this.newTransform.position = position;
    }

    shoot() {
        
        const p = this.getPipeTransform();
        const d = this.getDirection();

        this.setMuzzleParticles(p, d);
        this.setCasingDrop(p, d);

        const theta = Math.asin(0.0016);
        
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), theta);

        const rotatedV = d.clone().applyQuaternion(q);

        this.setBullet(p, rotatedV.normalize());
    }

    recoil(camera) {
        let camProg = 0, camDist = 0.3, i = 0;

        let rotProg = 0, rotDist = 0;

        const iterations = 10;

        const interval = setInterval(() => {
            if (i >= iterations) {
                clearInterval(interval);
                this.recoilPos = new THREE.Vector3(0, 0, 0);
                this.recoilRot = new THREE.Vector3(0, 0, 0);
                return;
            }

            camProg += (camDist / 2);
            camDist /= 2;

            rotDist += (1 - rotProg);
            rotProg += 0.20;

            i++;

            if (camera.rotation.x < 1) {
                camera.rotateX(camProg * 0.02);   
            }

            this.recoilRot.x = rotDist * 0.02;
            this.recoilRot.y = rotDist * 0.02;
            this.recoilPos.x = rotDist * 0.02;
        }, 10)
    }

    setMuzzleParticles(p, d) {
        const count = 50;
        const particleSystem = new ParticleSystem(count, 0.1);
        particleSystem.opacityLerpFactor = 0.05;
        particleSystem.colorLerpFactor = 0.10;

        if (this.particleSystems.length > 5) {
            physics.removeParticleSystem(this.particleSystems[0]);
            this.particleSystems.shift();
        }
        this.particleSystems.push(particleSystem);

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

            const hotColor = new THREE.Color(
                0.95 - 0.05 + Math.random() * 0.1, 
                0.2 - 0.1 + Math.random() * 0.2, 
                0.0 + Math.random() * 0.1,
            );
            const s = - 0.1 + Math.random() * 0.2
            const smokeColor = new THREE.Color(
                0.2 + s, 
                0.2 + s, 
                0.2 + s,
            );

            const noise = Math.min(1 - t + Math.random() * 0.05, 1);

            const color = smokeColor.clone().lerp(hotColor, noise);
            particleSystem.setEndStateParticle(i, smokeColor);

            particleSystem.setParticle(i, position, color);

            particleSystem.applyImpulse(i, radialOffset.clone().multiplyScalar(1 + Math.random()), 1);
        }

        physics.addParticleSystem(particleSystem);
    }

    setCasingDrop(p, d) {
        const casing = casingModel.clone(true);

        const position = p.clone().add(d.clone().multiplyScalar(-0.4));

        const rb = new RigidBody(0, 0.05, 1);
        rb.add(casing);
        physics.addRigidBody(rb);

        rb.position.copy(position);
        rb.lookAt(position.clone().add(d));

        const side = new THREE.Vector3(d.z, -0.2, -d.x).add(new THREE.Vector3(-0.5 + Math.random(), -0.5 + Math.random(), -0.5 + Math.random()).multiplyScalar(0.2)).multiplyScalar(-5);
        rb.applyImpulse(side, 1);

        rb.userData.dr = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.01);
        rb.userData.TTL = 20;

        this.casings.push(rb);
    }

    setBullet(p, d) {
        const velocity = d.clone().multiplyScalar(this.getBulletStartSpeed());

        physics.simulateBulletTrajectory(p, velocity, (result) => {
            const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const material = new THREE.MeshBasicMaterial({color: 0x0000ff})
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(result.point);
            scene.add(mesh);
        })
    }

    setVisibility(visible = true) {
        this.model.traverse((obj) => {
            if (obj.isMesh) {
                obj.visible = visible;
            }
        })
    }

    update(dt) {
        const newPos = this.model.position.clone().lerp(new THREE.Vector3(...this.newTransform.position), Gun.LERP_FACTOR);
        this.model.position.copy(newPos);

        const currentRot = new THREE.Vector3(this.model.rotation.x, this.model.rotation.y, this.model.rotation.z);
        const targetRot = new THREE.Vector3(...this.newTransform.rotation);
        const newRot = currentRot.lerp(targetRot, Gun.LERP_FACTOR);
        this.model.rotation.set(newRot.x, newRot.y, newRot.z);

        this.casings.forEach(casing => {
            casing.userData.TTL -= dt;
            if (casing.userData.TTL < 0) {
                physics.removeRigidBody(casing);
            }
            if (casing.userData.doneRotating) return;
            if (casing.onGround) {
                const r = casing.position.clone().add(new THREE.Vector3(-0.5 + Math.random(), 0, -0.5 + Math.random()).normalize());
                casing.lookAt(r);
                casing.userData.doneRotating = true;
                return;
            }
            const dr = casing.userData.dr;
            casing.rotation.x += dr.x;
            casing.rotation.y += dr.y;
            casing.rotation.z += dr.z;
        })

        this.casings = this.casings.filter(casing => {
            return !(casing.userData.doneRotating && casing.userData.TTL < 0);
        });

        this.particleSystems = this.particleSystems.filter(element => {return !element.dead})
    }
}