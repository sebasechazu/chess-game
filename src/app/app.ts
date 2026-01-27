import { Component, signal, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { filter } from 'rxjs';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private router = inject(Router);
  protected readonly title = signal('chess-game');

  ngOnInit(): void {
    initFlowbite();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => initFlowbite(), 0);
    });
  }
}


