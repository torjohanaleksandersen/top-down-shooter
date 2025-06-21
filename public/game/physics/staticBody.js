import * as THREE from "../lib/three/build/three.module.js"
import { OBB } from "../lib/three/examples/jsm/math/OBB.js"

export class StaticBody extends THREE.Object3D {
    constructor(options = {
        complex: false,
        mesh: new THREE.Mesh(),
    }) {
        super();
        const mesh = options.mesh;
        this.add(mesh);
        this.complex = options.complex;

        if (!this.complex) {
            mesh.updateMatrixWorld(true);

            const geometry = mesh.geometry;
            geometry.computeBoundingBox();

            const box = geometry.boundingBox;
            const size = new THREE.Vector3();
            box.getSize(size);

            const center = new THREE.Vector3();
            box.getCenter(center);
            center.applyMatrix4(mesh.matrixWorld);

            const scale = new THREE.Vector3();
            mesh.getWorldScale(scale);

            const halfSize = size.multiply(scale).multiplyScalar(0.5);

            const rotationMatrix3 = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld);

            this.obb = new OBB();
            this.obb.center.copy(center);
            this.obb.halfSize.copy(halfSize);
            this.obb.rotation.copy(rotationMatrix3);
        }
    }

    get Collider() {
        return this.children[0] || null;
    }
}
