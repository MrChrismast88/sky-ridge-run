// Sky Ridge Run — input. Keyboard is the primary control; the mouse
// steers toward the pointer and the wheel sets the throttle. Every key
// press the game reacts to is exposed here, so main.js stays a loop.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseActive = false;
    this.mouseDown = false;
    this.wheelDelta = 0;
    this.pressed = new Set();
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) / rect.width - 0.5;
      this.mouseY = (e.clientY - rect.top) / rect.height - 0.5;
      this.mouseActive = true;
    });
    canvas.addEventListener('mousedown', () => {
      this.mouseDown = true;
      this.mouseActive = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.wheelDelta += -Math.sign(e.deltaY);
    }, { passive: false });
    canvas.addEventListener('mouseleave', () => {
      this.mouseActive = false;
    });
  }

  // True once for the frame after the key went down.
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
    this.wheelDelta = 0;
  }

  // Steering: -1..1 pitch (up positive) and roll (right positive).
  // Keyboard wins when its keys are held; otherwise the mouse steers.
  steering() {
    let pitch = 0;
    let roll = 0;
    if (this.keys.has('arrowup') || this.keys.has('w')) pitch += 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) pitch -= 1;
    if (this.keys.has('arrowleft') || this.keys.has('a')) roll -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) roll += 1;
    if (pitch === 0 && roll === 0 && this.mouseActive) {
      roll = Math.max(-1, Math.min(1, this.mouseX * 2.2));
      pitch = Math.max(-1, Math.min(1, -this.mouseY * 2.2));
    }
    let throttleDelta = 0;
    if (this.keys.has('shift')) throttleDelta += 1;
    if (this.keys.has('control')) throttleDelta -= 1;
    if (this.mouseDown) throttleDelta += 0.6;
    throttleDelta += this.wheelDelta * 2.5;
    const brake = this.keys.has(' ');
    return { pitch, roll, throttleDelta, brake };
  }
}
