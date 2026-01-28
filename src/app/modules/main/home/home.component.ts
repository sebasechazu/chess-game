import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { GameModeCard } from '../../../components/game-mode-card/game-mode-card';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
    selector: 'app-home',
    imports: [CommonModule, GameModeCard, NavbarComponent],
    templateUrl: './home.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
    ngOnInit(): void {
        initFlowbite();
    }
}
