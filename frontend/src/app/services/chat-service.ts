import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

import { MessageService } from './message-service';
import { StorageService } from './storage-service';
import { UserService } from './user-service';

// Clé de stockage du dernier message « lu » (repère de la pastille de non-lus).
const LAST_READ_KEY = "chat_last_read_id";

// Un message du chat global, enrichi côté backend du nom et de la photo de l'auteur.
export interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_photo: string | null;
  content: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // Seul service à connaître socket.io-client. L'envoi et la suppression passent par le socket
  // (events live diffusés à tous) ; l'historique passe par MessageService (REST). La connexion est
  // maintenue au niveau de l'app (pas seulement sur la page chat) pour détecter les messages non lus.

  private socket: Socket | null = null;

  // Flux d'événements temps réel consommés par la page de chat.
  readonly onNew$ = new Subject<ChatMessage>();
  readonly onDeleted$ = new Subject<{ id: number }>();

  // Vrai quand au moins un message non lu attend l'utilisateur → pastille sur l'onglet Chat.
  readonly hasUnread = signal(false);

  // Repères de non-lus : id du message le plus récent connu, id du dernier message lu, et présence
  // actuelle sur la page chat (où tout arrive « déjà lu »).
  private latestId = 0;
  private lastReadId = 0;
  private chatActive = false;

  constructor(
    private message: MessageService,
    private storage: StorageService,
    private userService: UserService
  ) { }

  // Démarrage de l'app (ou fin d'onboarding) : garantit l'identité, ouvre le socket et calcule l'état
  // non-lu depuis l'historique récent. Idempotent → appelable à chaque fois qu'un compte devient actif.
  async init() {
    await this.ensureIdentity();
    await this.connect();
    await this.refreshUnread();
  }

  // Garantit que le profil courant est en mémoire (nécessaire pour distinguer « mes » messages des autres).
  private async ensureIdentity() {
    if (!this.userService.currentUser && (await this.storage.get("auth_token"))) {
      await this.userService.fetchMe();
    }
  }

  // Ouvre la connexion socket authentifiée (token en handshake) et branche les listeners. Idempotent.
  async connect() {
    if (this.socket) {
      return;
    }
    const token = await this.storage.get("auth_token");
    if (!token) {
      return; // pas encore connecté (onboarding) : aucun socket
    }
    this.socket = io(environment.BACKEND_URL, { auth: { token } });
    this.socket.on("message:new", (message: ChatMessage) => {
      this.onNew$.next(message);
      this.handleIncoming(message);
    });
    this.socket.on("message:deleted", (payload: { id: number }) => this.onDeleted$.next(payload));
  }

  // Ferme la connexion (utilisé à la déconnexion du compte, pas à la sortie de la page chat).
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Signale l'entrée/sortie de la page chat. Sur la page, tout est considéré lu.
  setActive(active: boolean) {
    this.chatActive = active;
    if (active) {
      this.markRead();
    }
  }

  // Marque tout comme lu jusqu'au dernier message connu : efface la pastille et persiste le repère.
  async markRead() {
    this.hasUnread.set(false);
    if (this.latestId > this.lastReadId) {
      this.lastReadId = this.latestId;
      await this.storage.set(LAST_READ_KEY, this.lastReadId);
    }
  }

  // Nouveau message live : sur la page chat → lu ; sinon, s'il n'est pas de moi → pastille.
  private handleIncoming(message: ChatMessage) {
    this.latestId = Math.max(this.latestId, message.id);
    if (this.chatActive) {
      this.markRead();
      return;
    }
    if (message.sender_id !== this.userService.currentUser?.id) {
      this.hasUnread.set(true);
    }
  }

  // Au démarrage : compare le dernier message de l'historique récent au dernier lu mémorisé.
  private async refreshUnread() {
    const token = await this.storage.get("auth_token");
    if (!token) {
      return;
    }
    this.lastReadId = (await this.storage.get(LAST_READ_KEY)) ?? 0;
    const recent = await this.loadHistory();
    const newest = recent.reduce((max, m) => Math.max(max, m.id), 0);
    this.latestId = Math.max(this.latestId, newest);
    // Un non-lu = un message plus récent que le dernier lu et qui n'est pas de moi.
    const myId = this.userService.currentUser?.id;
    if (recent.some((m) => m.id > this.lastReadId && m.sender_id !== myId)) {
      this.hasUnread.set(true);
    }
  }

  // Envoie un message ; renvoie l'accusé du serveur ({ ok, reason? }).
  send(content: string): Promise<{ ok: boolean; reason?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        return resolve({ ok: false, reason: "Non connecté" });
      }
      this.socket.emit("message:send", { content }, resolve);
    });
  }

  // Demande la suppression d'un message ; renvoie l'accusé du serveur.
  remove(messageId: number): Promise<{ ok: boolean; reason?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) {
        return resolve({ ok: false, reason: "Non connecté" });
      }
      this.socket.emit("message:delete", { messageId }, resolve);
    });
  }

  // Charge un batch d'historique (les messages plus anciens que beforeId, ou les plus récents). Met à
  // jour au passage l'id du message le plus récent connu (pour le suivi des non-lus).
  async loadHistory(beforeId?: number): Promise<ChatMessage[]> {
    const response = await this.message.sendMessage("/messages", beforeId ? { beforeId } : {});
    const messages = response.ok ? (response.data as ChatMessage[]) : [];
    for (const message of messages) {
      this.latestId = Math.max(this.latestId, message.id);
    }
    return messages;
  }
}
