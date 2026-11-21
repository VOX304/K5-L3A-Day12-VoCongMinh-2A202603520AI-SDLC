import type { Simulation } from '../sim/simulation.js';

export interface HudElements {
  flamesValue: HTMLElement;
  timerValue: HTMLElement;
  lanternsValue: HTMLElement;
  scoreValue: HTMLElement;
  carriedValue: HTMLElement;
  modal: HTMLElement;
  modalTitle: HTMLElement;
  modalMessage: HTMLElement;
  modalScore: HTMLElement;
  restartBtn: HTMLButtonElement;
}

export class HudController {
  private elements: HudElements;
  private onRestartCallback?: () => void;

  constructor() {
    this.elements = {
      flamesValue: document.querySelector('#hud-flames-icons')!,
      timerValue: document.querySelector('#hud-timer-value')!,
      lanternsValue: document.querySelector('#hud-lanterns-value')!,
      scoreValue: document.querySelector('#hud-score-value')!,
      carriedValue: document.querySelector('#hud-carried-value')!,
      modal: document.querySelector('#game-over-modal')!,
      modalTitle: document.querySelector('#modal-title')!,
      modalMessage: document.querySelector('#modal-message')!,
      modalScore: document.querySelector('#modal-score')!,
      restartBtn: document.querySelector('#restart-btn')!,
    };

    this.elements.restartBtn.addEventListener('click', () => {
      this.hideModal();
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    });
  }

  onRestart(cb: () => void): void {
    this.onRestartCallback = cb;
  }

  update(sim: Simulation, litCount: number, totalLanterns: number): void {
    // 1. Flames (with safe fallback)
    const flames = (sim.player && typeof sim.player.flames === 'number') ? sim.player.flames : 3;
    const flameIcons = '🔥'.repeat(Math.max(0, Math.min(flames, 3))) || '—';
    this.elements.flamesValue.textContent = flameIcons;

    // 2. Timer mm:ss (with safe fallback)
    const timeLeft = typeof sim.timeLeftSeconds === 'number' ? sim.timeLeftSeconds : 300;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.elements.timerValue.textContent = timeFormatted;

    if (timeLeft <= 30) {
      this.elements.timerValue.classList.add('danger-pulse');
    } else {
      this.elements.timerValue.classList.remove('danger-pulse');
    }

    // 3. Lanterns lit k / n
    this.elements.lanternsValue.textContent = `${litCount} / ${totalLanterns}`;

    // 4. Score (with safe fallback)
    const score = typeof sim.score === 'number' ? sim.score : 0;
    this.elements.scoreValue.textContent = String(score);

    // 5. Carried (with safe fallback)
    const carried = (sim.player && typeof sim.player.carried === 'number') ? sim.player.carried : 0;
    this.elements.carriedValue.textContent = `${carried} / 10`;

    // 6. Check Game Over
    if (sim.state === 'won') {
      this.showModal(
        'Chiến Thắng!',
        'Đêm 1 hoàn tất! Tất cả Đèn Lồng Lớn đã sáng soi sương mù.',
        score,
        '#F2C14E',
      );
    } else if (sim.state === 'lost') {
      const reasonText = flames <= 0 ? 'Mất hết Ngọn Lửa trong đêm đen.' : 'Bình minh đã đến nhưng đèn chưa kịp thắp sáng.';
      this.showModal(
        'Thất Bại',
        reasonText,
        score,
        '#FF5A5F',
      );
    } else {
      this.hideModal();
    }
  }

  showModal(title: string, message: string, score: number, titleColor: string): void {
    if (this.elements.modal.style.display !== 'flex') {
      this.elements.modal.style.display = 'flex';
      this.elements.modalTitle.textContent = title;
      this.elements.modalTitle.style.color = titleColor;
      this.elements.modalMessage.textContent = message;
      this.elements.modalScore.textContent = String(score);
    }
  }

  hideModal(): void {
    if (this.elements.modal.style.display !== 'none') {
      this.elements.modal.style.display = 'none';
    }
  }
}
