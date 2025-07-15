import { Gun } from "../weapons/gun.js";
import { Animator } from "./animator.js";



export class StateManager {
    constructor (options = {
        arms: new Animator(),
        body: new Animator(),
        full: new Animator(),
        gun: new Gun(),
        enemy: false
    }) {
        this.options = options;

        this.movement = "";
        this.weapon = "";
        this.action = "";
    }

    setAnimations(movement = "", action = "", weapon = "") {
        this.weapon = weapon;
        this.action = action;
        this.movement = movement;

        if (movement === "driving") {
            this.options.arms.play("driving");
            this.options.body.play("driving");

            return;
        }

        if (movement === "jumpup" || movement === "jumpdown") {
            this.options.arms.play(movement);
            this.options.body.play(movement);
            return;
        }

        if (weapon === "ads") {
            this.options.arms.play("idle-ads");
            this.options.body.play(movement + "-ads");

            this.options.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);

            return;
        }

        this.options.arms.play(movement);
        this.options.body.play(movement);

        if (movement === "walk") {
            this.options.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
        } else {
            this.options.gun.setTransform();
        }
    }
}