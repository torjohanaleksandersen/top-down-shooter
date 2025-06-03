import * as THREE from "./lib/three/build/three.module.js"
import { player } from "./player.js";

class Particle extends THREE.Points {
    constructor(positionArr = [0, 0, 0], color = 0xff00ff, size = 1) {
        const geometry = new THREE.BufferGeometry();
        const position = new Float32Array(positionArr);
        geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            depthWrite: false,
            transparent: true
        });

        super(geometry, material);

        this.userData = {
            lerp: {
                
            },
            velocity: new THREE.Vector3(0, 0, 0),
        }
        this.name = "particle";
    }
}


export class Particles extends THREE.Object3D {
    constructor() {
        super();
    }

    muzzleSmoke(body) {
        const position = body.hand.gun.getEndPointPositionOfGun();
        const pointlight = new THREE.PointLight(0xffffff, 1, 100, 0);

        pointlight.position.copy(position.clone());
        this.add(pointlight);

        setTimeout(() => {
            this.remove(pointlight);
        }, 100)



        for (let i = 0; i < 50; i++) {
            let pos = position.clone();
            const t = Math.pow(Math.random(), 2) * 0.5;

            const dir = new THREE.Vector3();
            body.hand.gun.getWorldDirection(dir).negate();
            pos.add(dir.clone().multiplyScalar(t));
            const spread = 0.1;
            pos.add(new THREE.Vector3(dir.z, 0, - dir.x).multiplyScalar(((Math.random() - 0.5) * spread) * (1 - t)));



            const size = 0.05 + (1 - t) * 0.02;
            const color = new THREE.Color(1 - t * 1.7, 1 - t * 1.7, 1 - t * 1.7);
            if (t < 0.2) {
                let r = 156;
                let g = 26;
                let b = 0;

                const s = t / 0.2;

                r += (232 - 156) * s;
                g += (178 - 26) * s;
                b += (86 - 0) * s;
                
                color.set(r / 255, g / 255, b / 255);
            }

            const particle = new Particle(pos.toArray(), color, size);

            particle.userData.lerp.opacity = {
                end: 0,
                factor: 10
            }

            //particle.userData.velocity.set(body.velocity.x, 0, body.velocity.y);

            this.add(particle);
        }
    }

    update(dt) {
        this.children.forEach(particle => {
            const ud = particle.userData;
            if (particle.name !== "particle") return;

            particle.material.opacity = THREE.MathUtils.lerp(
                particle.material.opacity,
                ud.lerp.opacity.end,
                ud.lerp.opacity.factor * dt
            );

            particle.position.add(ud.velocity.clone().multiplyScalar(dt));
        })
    }
}

export const particles = new Particles();
