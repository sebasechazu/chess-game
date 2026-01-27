import { Component, input, ChangeDetectionStrategy, computed, model, inject } from '@angular/core';
import { PieceColor } from '../../core/helpers/interfaces';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header-game',
  templateUrl: './header-game.component.html',
  styleUrl: './header-game.component.css',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderGameComponent {
  private router = inject(Router);

  currentTurn = input.required<PieceColor>();
  onReset = input<() => void>();
  totalMovements = input<number>(0);
  whiteCaptures = input<number>(0);
  blackCaptures = input<number>(0);
  aiEnabled = model<boolean>(false);
  aiThinking = input<boolean>(false);
  whiteInCheck = input<boolean>(false);
  blackInCheck = input<boolean>(false);
  isVertical = input<boolean>(false);
  checkmateWarning = input<{ show: boolean, message: string }>({ show: false, message: '' });

  readonly PieceColor = PieceColor;

  /**
   * Devuelve información sobre si hay un aviso de jaque activo.
   */
  checkWarning = computed(() => {
    if (this.whiteInCheck()) return { show: true, text: 'Jaque sobre las Blancas' };
    if (this.blackInCheck()) return { show: true, text: 'Jaque sobre las Negras' };
    return { show: false, text: '' };
  });

  /**
   * Indica si el banner debe mostrarse de forma más prominente (es el turno del bando en jaque)
   */
  checkProminent = computed(() => {
    return (this.whiteInCheck() && this.currentTurn() === PieceColor.White) ||
      (this.blackInCheck() && this.currentTurn() === PieceColor.Black);
  });

  bannerState = computed(() => {
    if (this.checkmateWarning().show) return 'visible';
    if (this.checkProminent()) return 'prominent';
    if (this.checkWarning().show) return 'visible';
    return 'hidden';
  });

  onToggleAi(): void {
    this.aiEnabled.set(!this.aiEnabled());
  }

  handleReset(): void {
    const resetFn = this.onReset();
    if (resetFn) resetFn();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
