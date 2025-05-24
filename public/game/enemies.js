import { scene } from "./game.js";
import * as THREE from "./lib/three/build/three.module.js"


class Enemy extends THREE.Object3D {
    constructor () {
        super();
        const geometry = new THREE.SphereGeometry(0.5, 10, 10);
        const material = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
        const mesh = new THREE.Mesh( geometry, material );
        this.add( mesh );

        this.velocity = new THREE.Vector2(0, 0);
    }
}


export class Enemies extends Map {
    constructor () {
        super();
    }

    add(id) {
        if (this.has(id)) return;
        const enemy = new Enemy();
        scene.add( enemy );

        this.set(id, enemy);
    }

    remove(id) {
        if (this.has(id)) {
            scene.remove(this.get(id));
            this.delete(id);
        }
    }

    onServerUpdate(data, id) {
        const [position, velocity] = data;

        if (this.has(id)) {
            const enemy = this.get(id);

            enemy.position.set(...position);
            enemy.velocity.set(...velocity);
        }
    }

    update(dt) {
        this.forEach((enemy, id) => {
            enemy.position.x += enemy.velocity.x * dt;
            enemy.position.z += enemy.velocity.y * dt;
        })
    }
}

export const enemies = new Enemies();