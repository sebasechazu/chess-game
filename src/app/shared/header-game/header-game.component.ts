import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header-game',
  templateUrl: './header-game.component.html',
})
export class HeaderGameComponent {
  @Input() currentTurn!: 'white' | 'black';
  @Input() onReset!: () => void;
  @Input() totalMovements!: number;
  @Input() whiteCaptures!: number;
  @Input() blackCaptures!: number;
  @Input() aiEnabled!: boolean;
  @Input() statsAnimationClass: string = '';
  @Input() isVertical: boolean = false;
  
  @Output() toggleAi = new EventEmitter<boolean>();

  onToggleAi(): void {
    this.toggleAi.emit(!this.aiEnabled);
  }
}
