import * as THREE from "../lib/three/build/three.module.js"
import * as CANNON from "../lib/cannon-es/dist/cannon.js"
import { GLTFLoader } from "../lib/three/examples/jsm/loaders/GLTFLoader.js";
import { scene, world } from "../game.js";
import { physics } from "../physics/main.js";
import { inputs } from "../player/inputs.js";

const loader = new GLTFLoader();

export class Coupe {
    constructor () {
        this.model = new THREE.Object3D();

        this.vehicle = null;
        this.built = false;

        this.wheelRadius = 0.35;
        this.wheelWidth = 0.2;
        this.wheelMass = 30;
        this.wheelMaterial = new CANNON.Material("wheel");
        this.wheelPosition = 0;

        this.mass = 1500;
        this.horsePower = 2000;
        this.throttleForce = 1 * this.horsePower;
        this.brakeForce = - 0.3 * this.horsePower;

        this.state = {
            throttling: false,
            braking: false,
            steering: false,
            awake: false
        }
    }

    async build() {
        await this.loadModel();
        this.createPhysicsBody();
        this.built = true;

        const contactMaterial = new CANNON.ContactMaterial(
            this.wheelMaterial,
            world.material,
            {
                friction: 0.4,
                restitution: 0.0
            }
        );
        physics.world.addContactMaterial(contactMaterial);

        this.chassisMaterial = new CANNON.Material("chassis");
        this.vehicle.chassisBody.material = this.chassisMaterial;

        const chassisGroundContact = new CANNON.ContactMaterial(
            this.chassisMaterial,
            world.material,
            {
                friction: 0.5,
                restitution: 0.0
            }
        );
        physics.world.addContactMaterial(chassisGroundContact);
    }

    async loadModel() {
        const gltf = await loader.loadAsync("./lib/models/vehicles/coupe.glb");
        this.model = gltf.scene;
        this.model.scale.setScalar(0.01);
        scene.add(this.model);
    }

    createPhysicsBody() {
        const body = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Box(new CANNON.Vec3(2.2, 0.35, 0.95)),
            position: new CANNON.Vec3(-7, 10, 0)
        });

        body.linearDamping = 0.6;
        body.angularDamping = 0.8;


        this.vehicle = new CANNON.RigidVehicle({
            chassisBody: body,
        })

        this.addWheel(new CANNON.Vec3(1.5, -0.35, 0.80));
        this.addWheel(new CANNON.Vec3(1.5, -0.35, -0.80));
        this.addWheel(new CANNON.Vec3(-1.35, -0.35, 0.80));
        this.addWheel(new CANNON.Vec3(-1.35, -0.35, -0.80));

        body.updateMassProperties();

        this.vehicle.addToWorld(physics.world);
    }

    addWheel(position = new CANNON.Vec3(0, 0, 0)) {
        const body = new CANNON.Body({
            mass: this.wheelMass,
            angularDamping: 0.4,
            material: this.wheelMaterial
        });

        const shape = new CANNON.Cylinder(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);

        const q = new CANNON.Quaternion();
        q.setFromEuler(Math.PI / 2, 0, 0);

        body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);


        const down = new CANNON.Vec3(0, - 1, 0);
        const axis = new CANNON.Vec3(0, 0, - 1);

        this.vehicle.addWheel({
            body: body,
            direction: down,
            axis: axis,
            position: position
        })
    }

    wakeup() {
        this.state.awake = true;
    }

    asleep() {
        this.state.awake = false;
    }

    throttle() {
        this.state.throttling = true;

        this.vehicle.setWheelForce(this.throttleForce, 0);
        this.vehicle.setWheelForce(this.throttleForce, 1);
        this.vehicle.setWheelForce(this.throttleForce, 2);
        this.vehicle.setWheelForce(this.throttleForce, 3);
    }

    brake() {
        this.state.braking = true;

        this.vehicle.setWheelForce(this.brakeForce, 0);
        this.vehicle.setWheelForce(this.brakeForce, 1);
        this.vehicle.setWheelForce(this.brakeForce, 2);
        this.vehicle.setWheelForce(this.brakeForce, 3);
    }

    noPedals() {
        this.state.throttling = false;
        this.state.braking = false;

        this.vehicle.setWheelForce(0, 0);
        this.vehicle.setWheelForce(0, 1);
        this.vehicle.setWheelForce(0, 2);
        this.vehicle.setWheelForce(0, 3);
    }

    steer(dir = "") {
        this.state.steering = true;

        if (dir === "left") {
            this.wheelPosition += 0.1;
        } else if (dir === "right") {
            this.wheelPosition -= 0.1;
        }

        this.wheelPosition = Math.min(Math.max(this.wheelPosition, - Math.PI * 0.33), Math.PI * 0.33);
    }

    noSteering() {
        this.state.steering = false;

        if (this.vehicle.chassisBody.velocity.length() < 0.5) return;
        const t = 0.05;
        this.wheelPosition = this.wheelPosition * (1 - t);
    }

    applyInputs(keys = {}) {
        if (!this.state.awake) return;
        if (keys["w"]) this.throttle();
        if (keys["s"]) this.brake();
        if (keys["a"]) this.steer("left");
        if (keys["d"]) this.steer("right");
        if (!keys["a"] && !keys["d"]) this.noSteering();
        if (!keys["w"] && !keys["s"]) this.noPedals();
    }

    update() {
        if (!this.built) return;

        this.applyInputs(inputs.keys);

        this.vehicle.setSteeringValue(this.wheelPosition, 0);
        this.vehicle.setSteeringValue(this.wheelPosition, 1);

        const chassisPos = this.vehicle.chassisBody.position;
        const chassisQuat = this.vehicle.chassisBody.quaternion;

        const localOffset = new CANNON.Vec3(0, -0.75, 0);
        const rotatedOffset = chassisQuat.vmult(localOffset);
        const finalPos = chassisPos.vadd(rotatedOffset);

        this.model.position.lerp(finalPos, 0.95);
        this.model.quaternion.copy(chassisQuat);
    }
}