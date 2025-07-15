import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"

export class RigidBody {
    constructor (object3d = new THREE.Object3D(), physicsBody = new CANNON.Body({mass: 1})) {
        this.object3d = object3d;
        this.physicsBody = physicsBody;

        this.timeToLive = Infinity;
        this.alive = true;
    }

    setPosition(x, y, z) {
        this.object3d.position.set(x, y, z);
        this.physicsBody.position.copy(new CANNON.Vec3(x, y, z));
    }

    setQuaternion(x, y, z, w) {
        this.object3d.quaternion.set(x, y, z, w);
        this.physicsBody.quaternion.copy(new CANNON.Quaternion(x, y, z, w));
    }

    setRotation(x, y, z) {
        this.object3d.setRotationFromEuler(new THREE.Euler(x, y, z));
        this.physicsBody.quaternion.setFromEuler(x, y, z);
    }

    update(dt) {
        this.object3d.position.copy(this.physicsBody.position);
        this.object3d.quaternion.copy(this.physicsBody.quaternion);

        this.timeToLive -= dt;
    }
}