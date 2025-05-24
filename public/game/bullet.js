import { world } from "./world.js";
import * as THREE from "./lib/three/build/three.module.js"

class Bullets extends THREE.Object3D {
    constructor () {
        super()
        this.speed = 10;
        this.timesAllowedToCollide = 2;
    }

    set(origin, velocity, time, playerId = 0) {
        const geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
        const material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
        const mesh = new THREE.Mesh( geometry, material );

        mesh.userData.velocity = new THREE.Vector2(...velocity);
        mesh.userData.time = time;
        mesh.userData.timeLeft = 200;
        mesh.userData.playerId = playerId;
        mesh.userData.timesCollided = 0;

        const dt = Date.now() - time;
        mesh.position.x += mesh.userData.velocity.x * dt * this.speed;
        mesh.position.z += mesh.userData.velocity.y * dt * this.speed;

        mesh.position.set(...origin);
        this.add(mesh);

        this.computeTrajectory(origin, mesh.userData.velocity, mesh);
    }

    computeTrajectory(origin, velocity, mesh) {
        const position = new THREE.Vector3(...origin);
        const direction = new THREE.Vector3(velocity.x, 0, velocity.y).normalize(); // normalize!

        const raycaster = new THREE.Raycaster(position, direction, 0, 100); // near = 0 for immediate hits

        const intersects = raycaster.intersectObject(world, true);

        if (intersects.length > 0) {
            const object = intersects[0];

            const I = direction.clone().normalize();

            const localNormal = object.face.normal.clone();
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.object.matrixWorld);
            const N = localNormal.applyMatrix3(normalMatrix).normalize();

            if (I.dot(N) > 0) {
                N.negate();
            }

            const dot = I.dot(N);
            const R = I.clone().sub(N.multiplyScalar(2 * dot));

            const time = object.distance / this.speed;

            mesh.userData.collision = {
                R: mesh.userData.timesCollided < this.timesAllowedToCollide ? R : null,
                time,
                point: object.point
            }
        }
    }

    update(dt) {
        this.children.forEach(bullet => {
            bullet.position.x += bullet.userData.velocity.x * dt * this.speed;
            bullet.position.z += bullet.userData.velocity.y * dt * this.speed;

            bullet.timeLeft --;
            if (bullet.timeLeft <= 0) this.remove(bullet);

            const collision = bullet.userData.collision

            if (collision) {
                collision.time -= dt;
                if (collision.time <= 0) {
                    if (!collision.R) {
                        this.remove(bullet);
                        return;
                    }
                    bullet.userData.velocity.x = collision.R.x;
                    bullet.userData.velocity.y = collision.R.z;

                    bullet.userData.timesCollided ++;
                    this.computeTrajectory(collision.point.toArray(), new THREE.Vector2(collision.R.x, collision.R.z), bullet);
                }
            }
        })
    }
}

export const bullets = new Bullets();