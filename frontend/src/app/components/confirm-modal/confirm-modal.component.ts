import { Component, input, output } from '@angular/core';

// Modale de confirmation applicative réutilisable (jamais AlertController natif).
// Pilotée par un état local de la page via l'input `open`.
@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss']
})
export class ConfirmModalComponent {
  open = input.required<boolean>();
  title = input.required<string>();
  message = input<string>("");
  confirmLabel = input<string>("Confirmer");
  cancelLabel = input<string>("Annuler");
  // Style « destructif » (rouge) pour le bouton de confirmation.
  danger = input<boolean>(false);

  // Noms non standard (confirmed/cancelled) pour éviter la collision avec les events DOM natifs.
  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}
