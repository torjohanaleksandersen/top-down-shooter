import * as THREE from "../lib/three/build/three.module.js"
import { scene } from "../main.js";

class Physics {
    static GRAVITY = 9.81;
    static SIMULATION_STEPS = 5;
    static RESOLUTION_STEPS = 10;

    constructor() {
        this.rigidBodies = [];
        this.staticBodies = [];
        this.particleSystems = [];

    }

    addRigidBody(rigidBody) {
        this.rigidBodies.push(rigidBody);
        scene.add(rigidBody);
    }

    addStaticBody(staticBody) {
        this.staticBodies.push(staticBody);
        scene.add(staticBody);
    }

    addParticleSystem(particleSystem) {
        this.particleSystems.push(particleSystem)
        scene.add(particleSystem.points);
    }

    pointInRigidBody(rigidBody, point) {
        const line = rigidBody.end.clone().sub(rigidBody.start);
        const pointToLine = point.clone().sub(rigidBody.start);

        const t = Math.max(0, Math.min(1, pointToLine.dot(line) / line.lengthSq()));
        const Q = rigidBody.start.clone().add(line.multiplyScalar(t));

        return point.distanceToSquared(Q) <= rigidBody.radius * rigidBody.radius;
    }

    closestPointToOBB(point, obb) {
        const result = new THREE.Vector3();
        
        const elements = obb.rotation.elements;
        const axes = [
            new THREE.Vector3(elements[0], elements[1], elements[2]).normalize(),
            new THREE.Vector3(elements[3], elements[4], elements[5]).normalize(),
            new THREE.Vector3(elements[6], elements[7], elements[8]).normalize()
        ];


        const d = new THREE.Vector3().subVectors(point, obb.center);
        result.copy(obb.center);

        for (let i = 0; i < 3; i++) {
            const axis = axes[i];
            const distance = d.dot(axis);
            const clamped = THREE.MathUtils.clamp(distance, -obb.halfSize.getComponent(i), obb.halfSize.getComponent(i));
            result.add(axis.clone().multiplyScalar(clamped));
        }

        return result;
    }

    closestPointSegmentOBB(p1, p2, obb) {
        const ab = new THREE.Vector3().subVectors(p2, p1);
        let minDistSq = Infinity;
        let bestPointOnOBB = new THREE.Vector3();
        let bestT = 0;

        const testPoint = new THREE.Vector3();


        for (let i = 0; i <= Physics.RESOLUTION_STEPS; i++) {
            const t = i / 10;
            testPoint.copy(p1).addScaledVector(ab, t);

            const closestPoint = this.closestPointToOBB(testPoint, obb);

            const distSq = testPoint.distanceToSquared(closestPoint);

            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestPointOnOBB.copy(closestPoint);
                bestT = t;
            }
        }

        const closestPointOnCapsule = new THREE.Vector3().copy(p1).addScaledVector(ab, bestT);

        return {
            closestPointOnCapsule,
            closestPointOnOBB: bestPointOnOBB,
            distanceSq: minDistSq
        };
    }

    closestSegmentToTriangle(segStart, segEnd, triangle) {
        const segDir = new THREE.Vector3().subVectors(segEnd, segStart);
        const steps = Physics.RESOLUTION_STEPS;

        let minDistSq = Infinity;
        const tmpPoint = new THREE.Vector3();
        const pointOnTriangle = new THREE.Vector3();
        const bestPointOnTriangle = new THREE.Vector3();
        const bestPointOnSegment = new THREE.Vector3();

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            tmpPoint.copy(segStart).addScaledVector(segDir, t);

            triangle.closestPointToPoint(tmpPoint, pointOnTriangle);

            const distSq = tmpPoint.distanceToSquared(pointOnTriangle);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestPointOnSegment.copy(tmpPoint);
                bestPointOnTriangle.copy(pointOnTriangle);
            }
        }

        return {
            pointOnSegment: bestPointOnSegment,
            pointOnTriangle: bestPointOnTriangle,
            distanceSq: minDistSq
        };
    }

    closestCapsuleSegmentToTriangle(rigidBody, a, b, c) {
        const triangle = new THREE.Triangle(a, b, c);
        const result = this.closestSegmentToTriangle(rigidBody.start, rigidBody.end, triangle);

        return result;
    }

    checkCapsuleVsTriangles(rigidBody, geometry, matrixWorld) {
        const posAttr = geometry.attributes.position;
        const indexAttr = geometry.index;

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();

        if (indexAttr) {
            // Indexed geometry — use index buffer
            for (let i = 0; i < indexAttr.count; i += 3) {
                const i0 = indexAttr.getX(i);
                const i1 = indexAttr.getX(i + 1);
                const i2 = indexAttr.getX(i + 2);

                a.fromBufferAttribute(posAttr, i0).applyMatrix4(matrixWorld);
                b.fromBufferAttribute(posAttr, i1).applyMatrix4(matrixWorld);
                c.fromBufferAttribute(posAttr, i2).applyMatrix4(matrixWorld);

                const result = this.closestCapsuleSegmentToTriangle(rigidBody, a, b, c);

                if (result.distanceSq <= rigidBody.radius * rigidBody.radius) {
                    this.resolveCollision(result.pointOnSegment, result.pointOnTriangle, rigidBody);
                }
            }
        } else {
            for (let i = 0; i < posAttr.count; i += 3) {
                a.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld);
                b.fromBufferAttribute(posAttr, i + 1).applyMatrix4(matrixWorld);
                c.fromBufferAttribute(posAttr, i + 2).applyMatrix4(matrixWorld);

                const result = this.closestCapsuleSegmentToTriangle(rigidBody, a, b, c);

                if (result.distanceSq <= rigidBody.radius * rigidBody.radius) {
                    this.resolveCollision(result.pointOnSegment, result.pointOnTriangle, rigidBody);
                }
            }
        }
    }

    findCollisionsForRigidBody(rigidBody) {
        this.staticBodies.forEach(staticBody => {
            if (!staticBody.complex && staticBody.obb) {
                const result = this.closestPointSegmentOBB(
                    rigidBody.start,
                    rigidBody.end,
                    staticBody.obb
                );

                if (result.distanceSq <= rigidBody.radius * rigidBody.radius) {
                    this.resolveCollision(result.closestPointOnCapsule, result.closestPointOnOBB, rigidBody);
                }
            } else if (staticBody.complex && !staticBody.obb) {
                this.checkCapsuleVsTriangles(rigidBody, staticBody.Collider.geometry, staticBody.Collider.matrixWorld);
            }
        });
    }

    broadphaseCollisions() {

    }

    resolveCollision(capsulePoint, trianglePoint, rigidBody) {
        if (!capsulePoint || !trianglePoint) return;

        const direction = new THREE.Vector3().subVectors(capsulePoint, trianglePoint);
        const distance = direction.length();
        if (distance === 0) return;

        const normal = direction.clone().normalize();
        const penetrationDepth = rigidBody.radius - distance;
        if (penetrationDepth <= 0) return;

        const correction = normal.clone().multiplyScalar(penetrationDepth);

        // Move position and recompute capsule endpoints
        rigidBody.position.add(correction);

        rigidBody.start.add(correction);
        rigidBody.end.add(correction);

        // Ground detection
        if (normal.y > 0.5 && rigidBody.velocity.y < 0) {
            rigidBody.onGround = true;
            rigidBody.velocity.y = 0;
        }
    }

    rayIntersectsStaticBodies(raycaster) {
        const result = raycaster.intersectObjects(this.staticBodies);

        if (result.length > 0) {
            return { hit: true, result: result};
        }
        return { hit: false };
    }

    update(dt) {
        for (let i = 0; i < Physics.SIMULATION_STEPS; i ++) {
            for (const rigidBody of this.rigidBodies) {
                rigidBody.onGround = false;
                this.findCollisionsForRigidBody(rigidBody);
                rigidBody.update(dt / Physics.SIMULATION_STEPS);
            }
        }

        const dummy = new THREE.Object3D(); // reuse dummy once

        this.particleSystems.forEach(particleSystem => {
            particleSystem.update(dt)

            if (particleSystem.dead) {
                scene.remove(particleSystem);
            }
        });

    }
}

export const physics = new Physics();