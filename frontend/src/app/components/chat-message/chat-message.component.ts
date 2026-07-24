import { Component, computed, input, output } from '@angular/core';

import { ChatMessage } from 'src/app/services/chat-service';

import { AvatarComponent } from 'src/app/components/avatar/avatar.component';

import { parisFromUtc } from 'src/app/utils/dayjs';

// Durée d'appui (ms) déclenchant la suppression d'un message.
const LONG_PRESS_MS = 500;

// Nombre max d'emojis pour l'effet « gros emojis sans bulle » (façon WhatsApp).
const MAX_BIG_EMOJI = 3;

// Caractères considérés comme emoji : pictogrammes, drapeaux régionaux (\u{1F1E6}-\u{1F1FF}),
// modificateurs de teinte (\u{1F3FB}-\u{1F3FF}), liant ZWJ (\u200D) et sélecteur de variation
// (\uFE0F) pour les séquences composées.
const EMOJI_CHARS = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u200D\uFE0F]/gu;

// Compte les « graphèmes » (une séquence emoji composée = 1) via Intl.Segmenter si disponible.
function graphemeCount(text: string): number {
  const Segmenter = (Intl as unknown as { Segmenter?: new () => { segment(s: string): Iterable<unknown> } }).Segmenter;
  if (Segmenter) {
    return [...new Segmenter().segment(text)].length;
  }
  return Array.from(text).length;
}

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
  imports: [AvatarComponent]
})
export class ChatMessageComponent {
  // Le message à afficher.
  message = input.required<ChatMessage>();
  // Message envoyé par l'utilisateur courant (bulle à droite) ?
  isOwn = input.required<boolean>();
  // Premier message d'un groupe (auteur/jour) → on affiche l'en-tête (avatar + nom).
  showHeader = input.required<boolean>();
  // L'utilisateur peut-il supprimer ce message (auteur ou admin) ?
  canDelete = input.required<boolean>();

  // Demande de suppression (l'appui long est confirmé par la page via une modale).
  remove = output<number>();
  // Ouverture du profil de l'auteur (clic sur l'avatar / le nom).
  openProfile = output<number>();

  // Message composé UNIQUEMENT d'emojis (≤ MAX_BIG_EMOJI) → affichage « gros, sans bulle ».
  readonly emojiOnly = computed(() => {
    const content = this.message().content.trim();
    if (!content) {
      return false;
    }
    const withoutEmoji = content.replace(EMOJI_CHARS, "").replace(/\s+/g, "");
    return withoutEmoji.length === 0 && graphemeCount(content) <= MAX_BIG_EMOJI;
  });

  // Taille des gros emojis, décroissante avec leur nombre (1 → 48px, 2 → 40px, 3 → 34px).
  readonly emojiSize = computed(() => {
    const n = graphemeCount(this.message().content.trim());
    return n <= 1 ? 48 : n === 2 ? 40 : 34;
  });

  private pressTimer: ReturnType<typeof setTimeout> | null = null;

  // Heure d'envoi en heure de Paris, format 24 h.
  time(): string {
    return parisFromUtc(this.message().created_at).format("HH:mm");
  }

  // Démarre le minuteur d'appui long (uniquement si la suppression est permise).
  onPressStart() {
    if (!this.canDelete()) {
      return;
    }
    this.pressTimer = setTimeout(() => this.remove.emit(this.message().id), LONG_PRESS_MS);
  }

  // Annule l'appui long (relâchement ou sortie du doigt avant la fin).
  onPressEnd() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  // Ouvre le profil de l'auteur du message.
  onOpenProfile() {
    this.openProfile.emit(this.message().sender_id);
  }
}
