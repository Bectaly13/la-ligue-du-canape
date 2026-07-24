import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addCircleOutline, fileTrayOutline } from 'ionicons/icons';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  imports: [IonIcon]
})
export class EmptyStateComponent {
  // Icône (défaut : bac vide), titre requis, message et action optionnels.
  icon = input<string>("file-tray-outline");
  title = input.required<string>();
  message = input<string>("");
  actionLabel = input<string>("");
  action = output<void>();

  constructor() {
    addIcons({ "file-tray-outline": fileTrayOutline, "add-circle-outline": addCircleOutline });
  }

  onAction() {
    this.action.emit();
  }
}
