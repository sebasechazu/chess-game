import { Component, Input } from '@angular/core';

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
  @Input() statsAnimationClass: string = '';
}
