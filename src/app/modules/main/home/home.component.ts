import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { GameModeCardComponent } from '../../../components/game-mode-card/game-mode-card.component';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
    selector: 'app-home',
    imports: [CommonModule, GameModeCardComponent, NavbarComponent],
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
    ngOnInit(): void {
        initFlowbite();
    }
}
