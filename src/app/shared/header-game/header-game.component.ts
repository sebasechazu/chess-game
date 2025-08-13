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
  @Input() statsAnimationClass: string = '';
  @Input() isVertical: boolean = false;
  
  @Output() toggleAi = new EventEmitter<boolean>();

  // Hacer disponible el enum en el template
  readonly PieceColor = PieceColor;

  onToggleAi(): void {
    this.toggleAi.emit(!this.aiEnabled);
  }
}
