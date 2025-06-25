

export class PlayerStateManager {
    constructor(player, layerName = "default") {
        this.player = player;
        this.layerName = layerName;
        this.currentState = null;
        this.states = {};

        this.forceUpdates = false;
    }

    setStates(statesObject = {}) {
        this.states = statesObject;
    }

    setState(name, force = false) {
        const nextState = this.states[name];
        if (!force) {
            if (!nextState) return;

            if (this.currentState && this.currentState.name === name) return;
        }

        if (!force) this.forceUpdates = true;

        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }

        this.currentState = nextState;

        if (this.currentState.enter) {
            this.currentState.enter();
        }
    }

    is(name) {
        return this.currentState && this.currentState.name === name;
    }

    get name() {
        return this.currentState ? this.currentState.name : null;
    }
}


class IdleState {
    constructor(player) {
        this.player = player;
        this.name = "idle";
    }

    enter() {
        const ws = this.player.weaponState.currentState.name;

        if (ws !== "hipfire") return;

        this.player.animator.play("idle");
        this.player.handAnimator.play("idle");
    }

    exit() {
        
    }
}

class WalkState {
    constructor(player) {
        this.player = player;
        this.name = "walk";
    }

    enter() {
        const ws = this.player.weaponState.currentState.name;

        if (ws !== "hipfire") return;

        this.player.animator.play("walk");
        this.player.handAnimator.play("walk");

        this.player.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
    }

    exit() {
        this.player.gun.setTransform()
    }
}

class RunState {
    constructor(player) {
        this.player = player;
        this.name = "run";
    }

    enter() {
        const ws = this.player.weaponState.currentState.name;

        if (ws !== "hipfire") return;

        this.player.animator.play("run");
        this.player.handAnimator.play("run");
    }

    exit() {
        
    }
}

class JumpState {
    constructor(player, dir = "") {
        this.player = player;
        this.dir = dir;
        this.name = "jump" + this.dir;
    }

    enter() {
        this.player.animator.play("jump" + this.dir);
        this.player.handAnimator.play("jump" + this.dir);

        this.player.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
    }

    exit() {
        this.player.gun.setTransform()
    }
}

class CrouchState {
    constructor(player) {
        this.player = player;
        this.name = "crouch";
    }

    enter() {
        const movement = this.player.weaponState.currentState.name;
        if (ads === "hipfire") {
            this.player.animator.play("crouch");
            this.player.handAnimator.play("crouch");
        } else if (ads === "ads") {
            this.player.animator.play("crouch-ads");
            this.player.handAnimator.play("crouch-ads");
        }
    }

    exit() {
        
    }
}

class NoActionState {
    constructor(player) {
        this.player = player;
        this.name = "none";
    }

    enter() {
    }

    exit() {
        
    }
}

class ThrowState {
    constructor(player) {
        this.player = player;
        this.name = "throw";
    }

    enter() {
        this.player.animator.play("idle-ads");
        this.player.handAnimator.play("throw");

        this.player.gun.setVisibility(false);
    }

    exit() {
        this.player.gun.setVisibility(true);
    }
}

class HipfireState {
    constructor(player) {
        this.player = player;
        this.name = "hipfire";
    }

    enter() {
        if (!this.player.movementState.currentState) return;
        const movement = this.player.movementState.currentState.name;
        
        this.player.animator.play(movement);
        this.player.handAnimator.play(movement);
    }

    exit() {
        
    }
}

class AimDownSightState {
    constructor(player) {
        this.player = player;
        this.name = "ads";
    }

    enter() {
        const movement = this.player.movementState.currentState.name;

        this.player.animator.play(movement + "-ads");
        this.player.handAnimator.play("idle-ads");

        this.player.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
    }

    exit() {
        this.player.gun.setTransform()
    }
}

class ReloadingState {
    constructor(player) {
        this.player = player;
        this.name = "reload";
    }

    enter() {
        const movement = this.player.movementState.currentState.name;

        this.player.animator.play("reload");
        this.player.handAnimator.play("reload");

        this.player.gun.setTransform([Math.PI / 2 - 0.05, - 0.02, - Math.PI / 2 + 0.1], [4, 25, 2]);
    }

    exit() {
        this.player.gun.setTransform()
    }
}


export { IdleState, WalkState, RunState, JumpState, NoActionState, ThrowState, HipfireState, AimDownSightState, ReloadingState }