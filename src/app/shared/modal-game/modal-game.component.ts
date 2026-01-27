import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalData } from '../../core/helpers/interfaces';

@Component({
  selector: 'app-modal-game',
  templateUrl: './modal-game.component.html',
  styleUrl: './modal-game.component.css',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalGameComponent {
  modalData = input<ModalData>({ open: false, title: '', content: '' });
  showCloseButton = input<boolean>(true);
  closeModal = output<void>();

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
