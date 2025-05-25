import socket from "../index.js";
import { bullets } from "./bullet.js";
import { enemies } from "./enemies.js";
import * as THREE from "./lib/three/build/three.module.js"
import { player } from "./player.js";
import { world, initWorld } from "./world.js";

await initWorld();

const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
const scene = new THREE.Scene();

export { camera, scene, renderer };

let currentTime = performance.now();

export class Game {
    constructor () {
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setClearColor(new THREE.Color(0.3, 0.3, 0.3))
        document.body.appendChild( renderer.domElement );

        window.addEventListener("resize", this.onWindowResize);

        camera.position.set(0, 7, 0);
        camera.lookAt(0, 0, 0);

        scene.add(player);
        scene.add(bullets);
        scene.add(world);


        socket.on("update", data => { this.onServerUpdate(data) });
        socket.on("add-enemy", data => {
            if (data.id === socket.id) return;
            enemies.add(data.id);
        })
        socket.on("remove-player", socketId => { enemies.remove(socketId) });
        socket.on("shoot", data => { this.handleShootingFromEnemies(data) });

        this.environment();
        this.animate();
    }

    environment() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // soft base light
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(6, 10, 3); // position above and angled
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    onWindowResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    onServerUpdate(data) {

        for (const id in data) {
            if (id === socket.id) return;
            if (!enemies.has(id)) {
                enemies.add(id);
            }

            enemies.onServerUpdate(data[id], id);
        }
    }

    handleShootingFromEnemies(data) {
        if (data.playerId === socket.id) return;
        bullets.set(data.position, data.direction, data.time, data.playerId)
    }

    animate() {
        requestAnimationFrame(() => {this.animate()});

        const now = performance.now();
        const dt = (now - currentTime) / 1000; // convert ms to seconds
        currentTime = now;

        player.update(dt);
        enemies.update(dt);
        bullets.update(dt);

        renderer.render(scene, camera);
    }
}

new Game();