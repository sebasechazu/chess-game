import { Component, input, output, ChangeDetectionStrategy, ViewChild, ElementRef, signal, computed, model, inject, effect } from '@angular/core';
import { PieceColor, ScoreEntry } from '../../helpers/interfaces';
import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-header-game',
  templateUrl: './header-game.component.html',
  styleUrl: './header-game.component.css',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderGameComponent {
  private document = inject(DOCUMENT);
  
  currentTurn = input.required<PieceColor>();
  onReset = input<() => void>();
  totalMovements = input<number>(0);
  whiteCaptures = input<number>(0);
  blackCaptures = input<number>(0);
  aiEnabled = model<boolean>(false);
  isDarkMode = model<boolean>(false);
  aiThinking = input<boolean>(false);
  whiteInCheck = input<boolean>(false);
  blackInCheck = input<boolean>(false);
  scoreHistory = input<ScoreEntry[]>([]);
  statsAnimationClass = input<string>('');
  isVertical = input<boolean>(false);
  checkmateWarning = input<{show: boolean, message: string}>({show: false, message: ''});
  
  clearHistory = output<void>();

  readonly PieceColor = PieceColor;
  public showScoreDropdown = signal<boolean>(false);
  public dropdownPosition = signal<'left' | 'right'>('left');

  @ViewChild('scoreBtn', { static: false }) scoreBtn?: ElementRef<HTMLElement>;

  constructor() {
    // Efecto para sincronizar isDarkMode con la clase .dark en el documento
    effect(() => {
      const isDark = this.isDarkMode();
      if (isDark) {
        this.document.documentElement.classList.add('dark');
      } else {
        this.document.documentElement.classList.remove('dark');
      }
    });
  }

  toggleScoreDropdown(): void {
    this.showScoreDropdown.update(v => !v);
    // Solo calcular la posición dinámica en layout vertical (escritorio)
    if (this.showScoreDropdown() && this.isVertical()) {
      // Calcular en el siguiente tick para que el DOM esté disponible
      setTimeout(() => {
        try {
          const rect = this.scoreBtn?.nativeElement.getBoundingClientRect();
          const dropdownWidth = 256; // approx w-64 (16 * 16)
          const spaceRight = window.innerWidth - (rect?.right ?? 0);
          // si hay suficiente espacio a la derecha, abrimos hacia la derecha
          this.dropdownPosition.set((spaceRight > dropdownWidth + 12) ? 'right' : 'left');
        } catch (e) {
          // en caso de error no bloqueamos la UI
          this.dropdownPosition.set('left');
        }
      }, 0);
    }
  }

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

  /**
   * Texto de sugerencia que se muestra bajo el banner cuando es prominente
   */
  suggestionText = computed(() => {
    if (!this.checkProminent()) return '';
    if (!this.isVertical()) {
      return 'Jaque: mueve o bloquea.';
    }
    return 'Estás en jaque: mueve tu rey, captura la pieza atacante o interpón una pieza para bloquear.';
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
}
