import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChessGameComponent } from "./chess-game/chess-game.component";

@Component({
  selector: 'app-root',
  imports: [ ChessGameComponent],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('chess-game');
}
