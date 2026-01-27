import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryMove } from '../../core/helpers/interfaces';

@Component({
    selector: 'app-history-game',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './history-game.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryGameComponent {
    moveHistory = input<HistoryMove[]>([]);
    isVertical = input<boolean>(false);
    protected readonly Math = Math;

    getPiecePath(piece: { type: string, color: string }): string {
        return `/assets/img/chess/${piece.color}-${piece.type}.svg`;
    }
}
