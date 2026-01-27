import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppService } from '../../../core/services/app.service';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';

@Component({
    selector: 'app-classification',
    imports: [CommonModule, NavbarComponent],
    templateUrl: './classification.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassificationComponent {
    private readonly chessService = inject(AppService);

    // Recent Matches (Moved from Home)
    recentMatches = computed(() => this.chessService.scoreHistory().slice(0, 10));

    // Mock Ranking Data
    rankingSignals = signal([
        { rank: 1, name: 'Magnus Carlsen', rating: 2853, games: 1540, winRate: '72%' },
        { rank: 2, name: 'Hikaru Nakamura', rating: 2810, games: 1230, winRate: '68%' },
        { rank: 3, name: 'Fabiano Caruana', rating: 2795, games: 980, winRate: '65%' },
        { rank: 4, name: 'Ian Nepomniachtchi', rating: 2770, games: 1100, winRate: '63%' },
        { rank: 5, name: 'Ding Liren', rating: 2762, games: 850, winRate: '60%' },
        { rank: 6, name: 'Alireza Firouzja', rating: 2755, games: 720, winRate: '62%' },
        { rank: 7, name: 'Anish Giri', rating: 2748, games: 930, winRate: '58%' },
        { rank: 8, name: 'Wesley So', rating: 2742, games: 1050, winRate: '59%' },
        { rank: 9, name: 'Richard Rapport', rating: 2735, games: 680, winRate: '61%' },
        { rank: 10, name: 'Levon Aronian', rating: 2730, games: 1400, winRate: '64%' },
    ]);

    getWinnerLabel(winner: string | null): string {
        if (winner === 'white') return 'Victoría Blancas';
        if (winner === 'black') return 'Victoría Negras';
        if (winner === 'draw') return 'Tablas';
        return 'Pendiente';
    }

    getWinnerClass(winner: string | null): string {
        if (winner === 'white') return 'text-app-accent bg-app-accent';
        if (winner === 'black') return 'text-gunmetal bg-app-muted';
        if (winner === 'draw') return 'text-text-secondary bg-app-muted';
        return 'text-text-muted bg-app-muted';
    }
}
