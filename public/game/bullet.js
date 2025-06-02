import { world } from "./world.js";
import * as THREE from "./lib/three/build/three.module.js"
import { GLTFLoader } from "./lib/three/examples/jsm/loaders/GLTFLoader.js";
import { player } from "./player.js";

const loader = new GLTFLoader();
let model = new THREE.Object3D();

function loadModel() {
    return new Promise((resolve, reject) => {
        loader.load(
            "lib/models/5.56.glb",
            (gltf) => {
                model = gltf.scene;
                resolve();
            },
            undefined,
            (error) => reject(error)
        );
    });
}

await loadModel();

class Bullet extends THREE.Object3D {
    constructor() {
        super();
        this.add(model.clone()); 

        this.scale.setScalar(0.05);
    }
}


class Bullets extends THREE.Object3D {
    constructor () {
        super()
        this.speed = 20;
    }

    set(_origin, velocity, time, playerId = 0) {
        const mesh = new Bullet();

        const yaw = Math.atan2(velocity.x, velocity.y);
        mesh.rotation.y = yaw + Math.PI / 2;

        mesh.userData.velocity = new THREE.Vector2(...velocity);
        mesh.userData.time = time;
        mesh.userData.timeLeft = 100;
        mesh.userData.playerId = playerId;

        const dt = Date.now() - time;
        mesh.position.x += mesh.userData.velocity.x * dt * this.speed;
        mesh.position.z += mesh.userData.velocity.y * dt * this.speed;

        const origin = player.hand.gun.getEndPointPositionOfGun();

        mesh.position.copy(origin);
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

            const time = object.distance / this.speed;

            mesh.userData.collision = {
                time,
            }
        }
    }

    update(dt) {
        this.children.forEach(bullet => {
            bullet.position.x += bullet.userData.velocity.x * dt * this.speed;
            bullet.position.z += bullet.userData.velocity.y * dt * this.speed;

            bullet.userData.timeLeft --;
            if (bullet.userData.timeLeft <= 0) this.remove(bullet);

            const collision = bullet.userData.collision

            if (collision) {
                collision.time -= dt;
                if (collision.time <= 0) {
                    this.remove(bullet);
                }
            }
        })
    }
}

export const bullets = new Bullets();