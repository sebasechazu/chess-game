import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-history-game',
  templateUrl: './history-game.component.html'
})
export class HistoryGameComponent {
  @Input() moveHistory: string[] = [];
}
