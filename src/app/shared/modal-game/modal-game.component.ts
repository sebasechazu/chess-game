import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-modal-game',
  templateUrl: './modal-game.component.html',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('modalBackdrop', [
      state('open', style({
        opacity: 1,
        visibility: 'visible'
      })),
      state('closed', style({
        opacity: 0,
        visibility: 'hidden'
      })),
      transition('closed => open', [
        animate('200ms ease-out')
      ]),
      transition('open => closed', [
        animate('150ms ease-in')
      ])
    ]),
    trigger('modalContent', [
      state('open', style({
        opacity: 1,
        transform: 'scale(1) translateY(0)',
        visibility: 'visible'
      })),
      state('closed', style({
        opacity: 0,
        transform: 'scale(0.95) translateY(-20px)',
        visibility: 'hidden'
      })),
      transition('closed => open', [
        animate('250ms ease-out')
      ]),
      transition('open => closed', [
        animate('200ms ease-in')
      ])
    ])
  ]
})
export class ModalGameComponent {
  @Input() modalData: import('../../helpers/interfaces').ModalData = { open: false, title: '', content: '' };
  @Input() showCloseButton: boolean = true;
  @Output() closeModal = new EventEmitter<void>();

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close() {
    this.closeModal.emit();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close();
    }
  }
}
