import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PieceColor, AiDifficulty } from '../../helpers/interfaces';

@Component({
  selector: 'app-header-game',
  templateUrl: './header-game.component.html',
})
export class HeaderGameComponent {
  @Input() currentTurn!: PieceColor;
  @Input() onReset!: () => void;
  @Input() totalMovements!: number;
  @Input() whiteCaptures!: number;
  @Input() blackCaptures!: number;
  @Input() aiEnabled!: boolean;
  @Input() aiDifficulty!: 1 | 2 | 3;
  @Input() whiteInCheck!: boolean;
  @Input() blackInCheck!: boolean;
  @Input() statsAnimationClass: string = '';
  @Input() isVertical: boolean = false;
  
  @Output() toggleAi = new EventEmitter<boolean>();
  @Output() changeDifficulty = new EventEmitter<'easy' | 'medium' | 'hard' | AiDifficulty>();

  // Hacer disponible el enum en el template
  readonly PieceColor = PieceColor;

  getDifficultyLabel(): string {
    if (this.aiDifficulty === 1) return 'Fácil';
    if (this.aiDifficulty === 3) return 'Difícil';
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
      const d = Math.max(1, Math.min(3, Math.floor(n))) as AiDifficulty;
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
