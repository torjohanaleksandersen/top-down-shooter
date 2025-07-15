import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { RigidBody } from "./rigidBody.js";
import { scene, world } from "../game.js";
import { ParticleSystem } from "./particles.js";

class Physics {
    static dt = 1 / 60;

    constructor () {
        this.world = new CANNON.World({gravity: new CANNON.Vec3(0, -9.81, 0)});

        this.world.solver.iterations = 20;
        this.world.solver.tolerance = 0.001;

        this.rigidBodies = [];
        this.particleSystems = [];

        this.dt = Physics.dt;
    }

    /* --- ADDING AND REMOVING --- */

    addRigidBody(rigidBody = new RigidBody()) {
        scene.add(rigidBody.object3d);
        this.rigidBodies.push(rigidBody);
        this.world.addBody(rigidBody.physicsBody);
    }

    removeRigidBody(rigidBody = new RigidBody()) {
        this.rigidBodies = this.rigidBodies.filter(element => {return element !== rigidBody});
        scene.remove(rigidBody.object3d);
        this.world.removeBody(rigidBody.physicsBody);
    }

    addParticleSystem(particleSystem = new ParticleSystem()) {
        this.particleSystems.push(particleSystem)
        scene.add(particleSystem.points);
    }

    removeParticleSystem(particleSystem) {
        this.particleSystems = this.particleSystems.filter(element => {return element !== particleSystem});
        scene.remove(particleSystem.points);
    }





    /* --- BULLETS --- */

    simulateBulletTrajectory(p, velocity, bulletDamping, onhit) {
        const timeStep = this.dt;
        let previousPosition = p.clone();

        for (let t = 0; t <= 2; t += timeStep) {
            velocity.multiplyScalar(Math.pow(bulletDamping, this.dt));
            const currentPosition = this.getBulletPosition(t, p, velocity);

            const direction = new THREE.Vector3().subVectors(currentPosition, previousPosition);
            const length = direction.length();
            direction.normalize();

            const raycaster = new THREE.Raycaster(previousPosition, direction, 0, length);

            const result = this.rayIntersects(raycaster);

            if (result.hit) {
                if (onhit) onhit(result.result);
                break;
            }

            previousPosition.copy(currentPosition);
        }
    }

    getBulletPosition(t = 0, origin = new THREE.Vector3(0, 0, 0), velocity = new THREE.Vector3(0, 0, 0)) {
        const position = new THREE.Vector3();
        const gravityTerm = new THREE.Vector3(0, Physics.GRAVITY, 0).clone().multiplyScalar(-0.5 * t * t);
        const velocityTerm = velocity.clone().multiplyScalar(t);
        return position.copy(origin).add(velocityTerm).add(gravityTerm);
    }

    rayIntersects(raycaster) {
        const result = raycaster.intersectObjects([...world.get3DObjects(), ...world.getCivilians()], true);

        if (result.length > 0) {
            return { hit: true, result: result[0]};
        }
        return { hit: false };
    }


    /* --- UPDATE --- */

    update(dt) {
        this.dt = dt;
        this.world.step(Physics.dt, dt, 3);

        for (const rigidBody of this.rigidBodies) {
            if (!rigidBody.alive) continue;
            rigidBody.update(dt);

            if (rigidBody.timeToLive <= 0) {
                this.removeRigidBody(rigidBody);
            }
        }

        for (const particleSystem of this.particleSystems) {
            particleSystem.update(dt);

            if (particleSystem.dead) {
                this.removeParticleSystem(particleSystem);
            }
        }
    }
}

export const physics = new Physics();