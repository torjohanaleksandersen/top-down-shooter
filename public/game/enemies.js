import { Body } from "./body.js";
import { bullets } from "./bullet.js";
import { scene } from "./game.js";
import * as THREE from "./lib/three/build/three.module.js"
import { particles } from "./particles.js";

class Enemy extends Body {
    constructor () {
        super();

        this.rotateX(- Math.PI / 2)

        this.loadSkin();
    }

    shoot(dir, time, id) {
        bullets.set(this, dir, time, id);

        particles.muzzleSmoke(this);
    }

    update(dt) {
        this.mixer.update(dt);
        if (this.hand && this.hand.gun) this.hand.gun.update(dt);
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

    shot(dir, time, id) {
        if (!this.has(id)) return;
        const enemy = this.get(id);

        enemy.shoot(dir, time, id);
    }

    onServerUpdate(data, id) {
        const [position, velocity, state, rotation] = data;
        const [movement, aiming] = state;

        if (this.has(id)) {
            const enemy = this.get(id);

            enemy.position.set(...position);
            enemy.velocity.set(...velocity);
            enemy.rotation.z = rotation;
            if (aiming) {
                enemy.aim();
            } else if (enemy.hand) {
                enemy.hand.gun.setDefaultTransform();
            }
            
            const animation = movement + "_rifle" + ((aiming) ? "_ads" : "");
            enemy.playAnimation(animation);
        }
    }

    update(dt) {
        this.forEach((enemy, id) => {
            enemy.position.x += enemy.velocity.x * dt;
            enemy.position.z += enemy.velocity.y * dt;

            enemy.update(dt);
        })
    }
}

export const enemies = new Enemies();