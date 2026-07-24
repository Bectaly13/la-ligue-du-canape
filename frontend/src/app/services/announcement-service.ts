import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Message broadcast unique de l'organisateur, affiché sur l'accueil de tous les joueurs.
export interface Announcement {
  content: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  constructor(
    private message: MessageService
  ) { }

  // Récupère l'annonce courante (null si indisponible).
  async getAnnouncement(): Promise<Announcement | null> {
    const response = await this.message.sendMessage("/announcement");
    return response.ok ? response.data : null;
  }

  // Met à jour l'annonce (réservé à l'admin côté backend). UI d'édition à venir avec l'interface admin.
  async setAnnouncement(content: string): Promise<Announcement | null> {
    const response = await this.message.sendMessage("/setAnnouncement", { content });
    return response.ok ? response.data : null;
  }
}
