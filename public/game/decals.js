import * as THREE from "./lib/three/build/three.module.js"
import { DecalGeometry } from "./lib/three/examples/jsm/geometries/DecalGeometry.js";

const textureLoader = new THREE.TextureLoader();

export class Blood {
    constructor () {
        this.texture = textureLoader.load("./lib/bloodTexture.png");
        this.texture.colorSpace = THREE.SRGBColorSpace;

        this.material = new THREE.MeshLambertMaterial( {
            specular: 0x444444,
            map: this.texture,
            normalScale: new THREE.Vector2( 1, 1 ),
            shininess: 0,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: - 4,
            wireframe: false
        } )
    }
}

class DecalsManager {
    constructor () {
        this.decals = new Map();
        
        
    }

    add(i, mesh, position, orientation, size, material) {
        const m = new THREE.Mesh( new DecalGeometry( mesh, position, orientation, size ), material);
        this.decals.set(i, m);
    }

    remove(i) {
        this.decals.delete(i);
    }

    get(i) {
        return this.decals.get(i) || new THREE.Object3D();
    }
}

export const decalsManager = new DecalsManager();