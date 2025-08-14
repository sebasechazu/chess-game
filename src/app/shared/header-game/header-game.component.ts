import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PieceColor, AiDifficulty } from '../../helpers/interfaces';
import { CommonModule, DatePipe } from '@angular/common';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  keyframes,
  query,
  stagger,
} from '@angular/animations';

@Component({
  selector: 'app-header-game',
  templateUrl: './header-game.component.html',
  standalone: true,
  imports: [CommonModule],
  animations: [
    // Banner de jaque: aparece desde arriba y puede tener estado prominente
    trigger('bannerAnim', [
      state('hidden', style({ opacity: 0, transform: 'translateY(-8px) scale(0.98)', height: '0px', padding: '0px', margin: '0px' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      state('prominent', style({ opacity: 1, transform: 'translateY(0) scale(1.02)' })),
      transition('hidden => visible', [
        animate('220ms ease-out', keyframes([
          style({ opacity: 0, transform: 'translateY(-12px) scale(0.98)', offset: 0 }),
          style({ opacity: 1, transform: 'translateY(4px) scale(1.01)', offset: 0.7 }),
          style({ opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 }),
        ])),
      ]),
      transition('hidden => prominent', [
        animate('260ms cubic-bezier(.2,.9,.2,1)', keyframes([
          style({ opacity: 0, transform: 'translateY(-16px) scale(0.96)', offset: 0 }),
          style({ opacity: 1, transform: 'translateY(6px) scale(1.03)', offset: 0.8 }),
          style({ opacity: 1, transform: 'translateY(0) scale(1.02)', offset: 1 }),
        ])),
      ]),
      transition('visible => hidden', [animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))]),
      transition('prominent => hidden', [animate('180ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))]),
    ]),

    // Lista de estadísticas: aparición con stagger y pop en los números
    trigger('statsList', [
      transition(':enter', [
        query('.stat-card', [
          style({ opacity: 0, transform: 'translateY(6px) scale(.98)' }),
          stagger(80, [animate('240ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))]),
        ], { optional: true }),
      ]),
    ]),

    // Pop animation para números cuando cambian (bind value)
    trigger('pop', [
      transition('* => *', [
        animate('260ms ease', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.18)', offset: 0.4 }),
          style({ transform: 'scale(0.98)', offset: 0.75 }),
          style({ transform: 'scale(1)', offset: 1 }),
        ])),
      ]),
    ]),

    // Rotación suave en el icono al activar/desactivar IA
    trigger('toggleRotate', [
      state('false', style({ transform: 'rotate(0deg)' })),
      state('true', style({ transform: 'rotate(0deg)' })),
      transition('false => true', [animate('360ms cubic-bezier(.2,.8,.2,1)', keyframes([
        style({ transform: 'rotate(0deg)', offset: 0 }),
        style({ transform: 'rotate(12deg)', offset: 0.3 }),
        style({ transform: 'rotate(-8deg)', offset: 0.6 }),
        style({ transform: 'rotate(0deg)', offset: 1 }),
      ]))]),
      transition('true => false', [animate('260ms ease-out')]),
    ]),
  ],
})
export class HeaderGameComponent {
  @Input() currentTurn!: PieceColor;
  @Input() onReset!: () => void;
  @Input() totalMovements!: number;
  @Input() whiteCaptures!: number;
  @Input() blackCaptures!: number;
  @Input() aiEnabled!: boolean;
  @Input() aiDifficulty!: 1 | 2 | 3 | 4;
  @Input() whiteInCheck!: boolean;
  @Input() blackInCheck!: boolean;
  @Input() scoreHistory: import('../../helpers/interfaces').ScoreEntry[] = [];
  @Input() statsAnimationClass: string = '';
  @Input() isVertical: boolean = false;
  
  @Output() toggleAi = new EventEmitter<boolean>();
  @Output() changeDifficulty = new EventEmitter<'easy' | 'medium' | 'hard' | AiDifficulty>();

  // Hacer disponible el enum en el template
  readonly PieceColor = PieceColor;

  // Estado local UI para desplegable de historial de puntajes
  public showScoreDropdown: boolean = false;

  toggleScoreDropdown(): void {
    this.showScoreDropdown = !this.showScoreDropdown;
  }

  getDifficultyLabel(): string {
    if (this.aiDifficulty === 1) return 'Fácil';
  if (this.aiDifficulty === 3) return 'Difícil';
  if (this.aiDifficulty === 4) return 'Muy difícil';
    return 'Medio';
  }

  /**
   * Maneja los cambios en la dificultad de la IA.
   * @param value La nueva dificultad, puede ser una etiqueta ('easy'|'medium'|'hard') o un valor numérico ('1'|'2'|'3').
   */
  onDifficultyChange(value: string): void {
    
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      this.changeDifficulty.emit(value);
      return;
    }

    const n = Number(value);
    if (!isNaN(n)) {
      const d = Math.max(1, Math.min(4, Math.floor(n))) as AiDifficulty;
      this.changeDifficulty.emit(d);
    }
  }

  /**
   * Devuelve información sobre si hay un aviso de jaque activo.
   */
  get checkWarning(): { show: boolean; text: string } {
    if (this.whiteInCheck) return { show: true, text: 'Jaque sobre las Blancas' };
    if (this.blackInCheck) return { show: true, text: 'Jaque sobre las Negras' };
    return { show: false, text: '' };
  }

  /**
   * Indica si el banner debe mostrarse de forma más prominente (es el turno del bando en jaque)
   */
  get checkProminent(): boolean {
    return (this.whiteInCheck && this.currentTurn === this.PieceColor.White) ||
           (this.blackInCheck && this.currentTurn === this.PieceColor.Black);
  }

  /**
   * Texto de sugerencia que se muestra bajo el banner cuando es prominente
   */
  get suggestionText(): string {
    if (!this.checkProminent) return '';
    // Texto más corto en móvil (isVertical === false)
    if (!this.isVertical) {
      return 'Jaque: mueve o bloquea.';
    }
    return 'Estás en jaque: mueve tu rey, captura la pieza atacante o interpón una pieza para bloquear.';
  }

  onToggleAi(): void {
    this.toggleAi.emit(!this.aiEnabled);
  }
}
