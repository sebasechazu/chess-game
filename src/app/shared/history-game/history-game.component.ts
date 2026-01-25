import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-history-game',
  templateUrl: './history-game.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryGameComponent {
  moveHistory = input<string[]>([]);
  isVertical = input<boolean>(false);
}
