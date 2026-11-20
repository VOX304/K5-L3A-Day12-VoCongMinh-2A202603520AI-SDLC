import type { Button, InputFrame, InputState } from './types.js';

export function defaultInput(): InputState {
  return { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
}

/** One cursor per run; applies only fields present, before step k. */
export class InputTimeline {
  private index = 0;
  private current = defaultInput();

  constructor(private readonly frames: readonly InputFrame[]) {}

  at(tick: number): InputState {
    while (this.frames[this.index] && this.frames[this.index]!.tick <= tick) {
      const { tick: _, ...patch } = this.frames[this.index++]!;
      this.current = { ...this.current, ...patch };
    }
    return { ...this.current, move: [...this.current.move] };
  }
}

export function pressedButtons(previous: InputState, current: InputState): Button[] {
  const buttons: Button[] = ['jump', 'interact', 'pulse', 'dash'];
  return buttons.filter((button) => current[button] && !previous[button]);
}
