class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {};

        window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);
        window.addEventListener("mousedown", e => this.mouse[e.button] = true);
        window.addEventListener("mouseup", e => this.mouse[e.button] = false);
    }

    isPressed(key) {
        return !!this.keys[key];
    }

    isMouseDown(button) {
        return !!this.mouse[button];
    }
}

export const inputs = new InputManager();