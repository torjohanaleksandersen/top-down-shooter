import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { GLTFLoader } from "../lib/three/examples/jsm/loaders/GLTFLoader.js";
import { camera, scene } from "../game.js";
import { ParticleSystem } from "../physics/particles.js";
import { physics } from "../physics/main.js";
import { RigidBody } from "../physics/rigidBody.js";
import { player } from "../player/player.js";

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
    static bulletDamping = 0.85; //15% loss every second

    constructor () {
        this.model = new THREE.Object3D();
        this.muzzle = new THREE.Object3D();
        this.ejectionPort = new THREE.Object3D();
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

    onModelLoaded() {
        this.model.add(this.muzzle);
        this.muzzle.position.set(0, 70, -600);

        this.model.add(this.ejectionPort);
        this.ejectionPort.position.set(0, 70, 0);
    }

    getMuzzlePosition() {
        const p = new THREE.Vector3();
        this.muzzle.getWorldPosition(p);

        const q = new THREE.Quaternion();
        const s = new THREE.Vector3();
    
        this.muzzle.updateMatrixWorld();
        this.muzzle.matrixWorld.decompose(p, q, s);

        return p;
    }

    getEjectionPortPosition() {
        const p = new THREE.Vector3();
        this.ejectionPort.getWorldPosition(p);
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
        const p = this.getMuzzlePosition();
        const ejectionPortP = this.getEjectionPortPosition();
        const d = this.getDirection();

        this.setMuzzleParticles(p, d);
        this.setCasingDrop(ejectionPortP, d);

        const localY = new THREE.Vector3(1, 0, 0);
        const globalY = localY.clone().applyMatrix4(this.muzzle.matrixWorld).sub(this.muzzle.getWorldPosition(new THREE.Vector3())).normalize();

        const theta = Math.asin(0.002);
        
        const q = new THREE.Quaternion(); 
        q.setFromAxisAngle(globalY, theta);

        const rotatedV = d.clone().applyQuaternion(q);

        this.setBullet(p, rotatedV.normalize());
    }

    recoil(camera) {
        let camProg = 0, camDist = 0.3, i = 0;

        const dir = new THREE.Vector3(0, 0, 0);
        camera.getWorldDirection(dir);
        const yaw = dir.y;

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

            if (yaw < 0.7) {
                camera.rotateX(camProg * 0.02);   
            }

            this.recoilRot.z = rotDist * 0.005;
            this.recoilRot.x = rotDist * 0.005;
            this.recoilPos.y = rotDist * 0.02;
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

        const rotationObject3d = new THREE.Object3D();
        rotationObject3d.position.copy(p);
        rotationObject3d.lookAt(p.clone().add(d));
        const q = rotationObject3d.quaternion.clone();

        const shape = new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0.03));
        const body = new CANNON.Body({
            mass: 0.01,
            shape: shape,
            position: new CANNON.Vec3(p.x, p.y, p.z),
            quaternion: new CANNON.Quaternion(q.x, q.y, q.z, q.w),
            angularDamping: 0.05
        });

        const pvel = player.rigidBody.physicsBody.velocity;

        const vel = new THREE.Vector3(-d.z, 0.2, d.x).sub(d.clone().multiplyScalar(0.5)).normalize().multiplyScalar(3);
        vel.add(new THREE.Vector3(pvel.x, pvel.y, pvel.z));
        body.velocity.copy(new CANNON.Vec3(vel.x, vel.y, vel.z));

        const angvel = new THREE.Vector3(-0.5 + Math.random(), -0.5 + Math.random(), -0.5 + Math.random()).multiplyScalar(10);
        body.angularVelocity = new CANNON.Vec3(angvel.x, angvel.y, angvel.z);

        const wrapper = new THREE.Object3D();
        casing.position.set(0, 0, -0.03);
        wrapper.add(casing);
        
        const rigidBody = new RigidBody(wrapper, body);
        rigidBody.timeToLive = 10;
        physics.addRigidBody(rigidBody);
    }

    setBullet(p, d) {
        const velocity = d.clone().multiplyScalar(this.getBulletStartSpeed());

        physics.simulateBulletTrajectory(p, velocity, Gun.bulletDamping, (result) => {
            if (result.object.userData.type === "civilian") {
                result.object.userData.this.onHit();
                return;
            }


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

        this.particleSystems = this.particleSystems.filter(element => {return !element.dead})
    }
}