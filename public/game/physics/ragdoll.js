import * as THREE from "../lib/three/build/three.module.js";
import * as CANNON from "../lib/cannon-es/dist/cannon.js";
import { scene } from "../game.js";
import { physics } from "./main.js";
import { RigidBody } from "./rigidBody.js";

const boneShapes = {
    mixamorigHead: { shape: () => new CANNON.Sphere(0.10), mass: 1, offset: 0.1 },
    mixamorigHips: { shape: () => new CANNON.Sphere(0.10), mass: 1, offset: 0.1 },  //new CANNON.Box(new CANNON.Vec3(0.18, 0.05, 0.1))
    mixamorigSpine1: { shape: () => new CANNON.Box(new CANNON.Vec3(0.18, 0.1, 0.1)), mass: 1, offset: 0.1 },
    mixamorigLeftShoulder: { shape: () => new CANNON.Sphere(0.05), mass: 1, offset: 0.1 },
    mixamorigRightShoulder: { shape: () => new CANNON.Sphere(0.05), mass: 1, offset: 0.1 },
    mixamorigLeftArm: { shape: () => new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05)), mass: 1, offset: 0.1 },
    mixamorigRightArm: { shape: () => new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05)), mass: 1, offset: 0.1 },
    mixamorigLeftForeArm: { shape: () => new CANNON.Sphere(0.05), mass: 1, offset: 0.1 },
    mixamorigRightForeArm: { shape: () => new CANNON.Sphere(0.05), mass: 1, offset: 0.1 },
    mixamorigLeftHand: { shape: () => new CANNON.Sphere(0.03), mass: 1, offset: 0.1 },
    mixamorigRightHand: { shape: () => new CANNON.Sphere(0.03), mass: 1, offset: 0.1 },

    mixamorigLeftUpLeg: { shape: () => new CANNON.Sphere(0.03), mass: 1, offset: 0.1 },
    mixamorigRightUpLeg: { shape: () => new CANNON.Sphere(0.03), mass: 1, offset: 0.1 },
    mixamorigLeftLeg: { shape: () => new CANNON.Sphere(0.07), mass: 1, offset: 0.1 },
    mixamorigRightLeg: { shape: () => new CANNON.Sphere(0.07), mass: 1, offset: 0.1 },
    mixamorigLeftFoot: { shape: () => new CANNON.Sphere(0.07), mass: 1, offset: 0.1 },
    mixamorigRightFoot: { shape: () => new CANNON.Sphere(0.07), mass: 1, offset: 0.1 },


};

export class Ragdoll {
    constructor(skinnedMesh = new THREE.SkinnedMesh()) {
        this.skinnedMesh = skinnedMesh;
        this.rigidBodies = {};
        this.enabled = false;
    }

    createRigidBodies(skeleton, vel) {

        skeleton.bones.forEach(bone => {
            const boneData = boneShapes[bone.name];
            if (!boneData) return;

            const body = new CANNON.Body({
                mass: boneData.mass,
                shape: boneData.shape(),
                angularDamping: 0.10,
                friction: 0.10
            });

            body.velocity.copy(vel);

            physics.world.addBody(body);

            const startPos = new THREE.Vector3();
            bone.getWorldPosition(startPos);

            if (bone.children.length === 0) {
                body.position.copy(startPos);
            } else {
                const childPos = new THREE.Vector3();
                bone.children[0].getWorldPosition(childPos);

                const midPos = startPos.clone().add(
                    childPos.clone().sub(startPos).multiplyScalar(boneData.offset)
                );

                body.position.copy(midPos);
            }

            body.quaternion.copy(this.getBoneWorldQuaternion(bone));

            const rb = new RigidBody(undefined, body);
            this.rigidBodies[bone.name] = { rigidBody: rb, bone };
            physics.addRigidBody(rb);
        });

        this.createConstraints()
    }

    createConstraints() {
        const get = name => this.rigidBodies[name]?.rigidBody?.physicsBody;

        const cone = (a, b, pivotA, pivotB, axis = new CANNON.Vec3(1, 0, 0), angle = Math.PI / 6) =>
            new CANNON.ConeTwistConstraint(a, b, {
                pivotA,
                pivotB,
                axisA: axis,
                axisB: axis,
                angle
            });

        const hinge = (a, b, pivotA, pivotB, axis = new CANNON.Vec3(1, 0, 0)) =>
            new CANNON.HingeConstraint(a, b, {
                pivotA,
                pivotB,
                axisA: axis,
                axisB: axis
            });

        const constraintPairs = [
            ["mixamorigHips", "mixamorigSpine1", 0],
            ["mixamorigSpine1", "mixamorigHead", 0],
            ["mixamorigSpine1", "mixamorigLeftShoulder", 0],
            ["mixamorigSpine1", "mixamorigRightShoulder", 0],
            ["mixamorigLeftShoulder", "mixamorigLeftArm", 0],
            ["mixamorigRightShoulder", "mixamorigRightArm", 0],
            ["mixamorigLeftArm", "mixamorigLeftForeArm", 1],
            ["mixamorigRightArm", "mixamorigRightForeArm", 1],
            ["mixamorigLeftForeArm", "mixamorigLeftHand", 1],
            ["mixamorigRightForeArm", "mixamorigRightHand", 1],

            ["mixamorigHips", "mixamorigLeftUpLeg", 1],
            ["mixamorigHips", "mixamorigRightUpLeg", 1],
            ["mixamorigLeftUpLeg", "mixamorigLeftLeg", 1],
            ["mixamorigRightUpLeg", "mixamorigRightLeg", 1],
            ["mixamorigLeftLeg", "mixamorigLeftFoot", 1],
            ["mixamorigRightLeg", "mixamorigRightFoot", 1],
            
        ];

        for (const [parentName, childName, type] of constraintPairs) {
            const parent = get(parentName);
            const child = get(childName);
            if (!parent || !child) continue;

            const j = this.rigidBodies[childName].rigidBody.physicsBody.position;
            const jointWorld = new THREE.Vector3(j.x, j.y, j.z)
            //this.rigidBodies[childName].bone.getWorldPosition(jointWorld);


            const pivotA = new CANNON.Vec3().copy(
                jointWorld.clone().sub(parent.position)
            );
            parent.quaternion.inverse().vmult(pivotA, pivotA);

            const pivotB = new CANNON.Vec3().copy(
                jointWorld.clone().sub(child.position)
            );
            child.quaternion.inverse().vmult(pivotB, pivotB);

            let constraint;
            if (type == 0) {
                constraint = cone(parent, child, pivotA, pivotB);
            } else if (type == 1) {
                constraint = hinge(parent, child, pivotA, pivotB);
            }
            

            physics.world.addConstraint(constraint);
        }
    }

    enable(vel = new CANNON.Vec3()) {
        this.enabled = true;

        const skeleton = new THREE.SkeletonHelper(this.skinnedMesh);
        this.createRigidBodies(skeleton, vel);
    }

    disable() {
        this.enabled = false;
    }


    update() {
        if (!this.enabled) return;
        
        for (const { rigidBody, bone } of Object.values(this.rigidBodies)) {
            const pos = rigidBody.physicsBody.position;
            const quat = rigidBody.physicsBody.quaternion;

            const worldPos = new THREE.Vector3(pos.x, pos.y, pos.z);
            const worldQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);

            this.applyWorldTransformToBone(bone, worldPos, worldQuat);
        }
    }

    applyWorldTransformToBone(bone = new THREE.Bone(), worldPos = new THREE.Vector3(), worldQuat = new THREE.Quaternion()) {
        const parent = bone.parent;
        if (!parent) return;

        parent.worldToLocal(worldPos);
        bone.position.copy(worldPos);

        const parentWorldQuat = new THREE.Quaternion();
        parent.getWorldQuaternion(parentWorldQuat);

        const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);

        bone.quaternion.copy(localQuat);
    }

    getBoneWorldPosition(bone) {
        const pos = new THREE.Vector3();
        bone.getWorldPosition(pos);
        return new CANNON.Vec3(pos.x, pos.y, pos.z);
    }

    getBoneWorldQuaternion(bone) {
        const q = new THREE.Quaternion();
        bone.getWorldQuaternion(q);
        return new CANNON.Quaternion(q.x, q.y, q.z, q.w);
    }
}