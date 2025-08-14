import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PieceColor } from '../../helpers/interfaces';

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
  @Input() aiDifficulty!: number;
  @Input() statsAnimationClass: string = '';
  @Input() isVertical: boolean = false;
  
  @Output() toggleAi = new EventEmitter<boolean>();
  @Output() changeDifficulty = new EventEmitter<'easy' | 'medium' | 'hard' | number>();

  // Hacer disponible el enum en el template
  readonly PieceColor = PieceColor;

  getDifficultyLabel(): string {
    if (this.aiDifficulty === 1) return 'Fácil';
    if (this.aiDifficulty === 3) return 'Difícil';
    return 'Medio';
  }

  onDifficultyChange(value: string): void {
    // aceptar tanto etiquetas ('easy'|'medium'|'hard') como valores numéricos ('1'|'2'|'3')
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      this.changeDifficulty.emit(value);
      return;
    }

    const n = Number(value);
    if (!isNaN(n)) {
      this.changeDifficulty.emit(n);
    }
  }

  onToggleAi(): void {
    this.toggleAi.emit(!this.aiEnabled);
  }
}
