import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ScrollDetail, ViewDidEnter, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward, send } from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { ChatMessage, ChatService } from 'src/app/services/chat-service';
import { ThemeService } from 'src/app/services/theme-service';
import { Member, UserService } from 'src/app/services/user-service';

import { ChatMessageComponent } from 'src/app/components/chat-message/chat-message.component';
import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { MembersPanelComponent } from 'src/app/components/members-panel/members-panel.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

import dayjs, { parisFromUtc } from 'src/app/utils/dayjs';

// Taille d'un batch d'historique (aligné sur le défaut du backend).
const BATCH = 30;

// Un élément du fil affiché : soit un séparateur de jour, soit un message (avec ses métadonnées).
type ChatItem =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; message: ChatMessage; showHeader: boolean; isOwn: boolean; canDelete: boolean };

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  imports: [IonContent, IonHeader, IonIcon, FormsModule, ChatMessageComponent, ConfirmModalComponent, EmptyStateComponent, HeaderComponent, MembersPanelComponent, NavbarComponent]
})
export class ChatPage implements ViewWillEnter, ViewDidEnter, ViewWillLeave {

  @ViewChild(IonContent) private content!: IonContent;
  @ViewChild("inputBar") private inputBar!: ElementRef<HTMLElement>;
  @ViewChild("field") private field!: ElementRef<HTMLTextAreaElement>;

  items: ChatItem[] = [];
  draft = "";
  loading = true;
  loadingMore = false;

  // Réserve basse de l'ion-content : hauteur réelle de la barre de saisie + navbar + safe area (repli
  // avant la première mesure). Recalculée quand le champ grandit → le dernier message reste visible.
  contentPaddingBottom = "calc(64px + var(--navbar-height) + var(--safe-bottom))";

  // Message dont la suppression est en attente de confirmation (null = modale fermée).
  pendingDeleteId: number | null = null;

  // Panneau Membres.
  membersOpen = false;
  members: Member[] = [];
  myId = 0;

  private messages: ChatMessage[] = [];
  private hasMore = false;
  private atBottom = true;
  private isAdmin = false;
  private subs: Subscription[] = [];

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.init();
  }

  // Scroll de sécurité APRÈS la transition d'entrée (le chargement a pu finir pendant l'animation, où
  // la hauteur du fil n'est pas encore stabilisée — cas Firefox en venant de /home).
  ionViewDidEnter() {
    this.scrollToBottom(0);
  }

  ionViewWillLeave() {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
    // Le socket reste ouvert au niveau de l'app (détection des non-lus) : on signale juste la sortie.
    this.chat.setActive(false);
  }

  constructor(
    private theme: ThemeService,
    private chat: ChatService,
    private userService: UserService,
    private router: Router
  ) {
    addIcons({ "send": send, "chevron-forward": chevronForward });
  }

  get confirmOpen(): boolean {
    return this.pendingDeleteId !== null;
  }

  // Résout l'utilisateur, ouvre le socket, branche les events, charge le premier batch et les membres.
  private async init() {
    const me = this.userService.currentUser ?? await this.userService.fetchMe();
    this.myId = me?.id ?? 0;
    this.isAdmin = !!me?.is_admin;
    await this.chat.connect();
    this.subs.push(this.chat.onNew$.subscribe((m) => this.onNew(m)));
    this.subs.push(this.chat.onDeleted$.subscribe((p) => this.onDeleted(p.id)));
    await this.loadInitial();
    // Sur la page chat : tout est lu → efface la pastille et mémorise le repère.
    this.chat.setActive(true);
    this.members = await this.userService.getUsers();
  }

  // --- Panneau Membres ---
  openMembers() {
    this.membersOpen = true;
  }

  closeMembers() {
    this.membersOpen = false;
  }

  // Sélection d'un membre (panneau) ou clic sur un auteur (message) → ouvre le bon profil.
  openProfile(id: number) {
    this.membersOpen = false;
    if (id === this.myId) {
      this.router.navigateByUrl("/profile");
    } else {
      this.router.navigateByUrl(`/user/${id}`);
    }
  }

  private async loadInitial() {
    const batch = await this.chat.loadHistory();
    this.messages = batch;
    this.hasMore = batch.length >= BATCH;
    this.rebuild();
    this.loading = false;
    this.updateInputHeight();
    this.scrollToBottom(0);
  }

  // Réception d'un nouveau message : on l'ajoute et on suit le bas si l'utilisateur y était.
  private onNew(message: ChatMessage) {
    this.messages = [...this.messages, message];
    this.rebuild();
    if (this.atBottom || message.sender_id === this.myId) {
      this.scrollToBottom(250);
    }
  }

  // Suppression diffusée : on retire le message du fil.
  private onDeleted(id: number) {
    this.messages = this.messages.filter((m) => m.id !== id);
    this.rebuild();
  }

  // Suivi du défilement : détecte la proximité du bas et déclenche le chargement d'anciens messages.
  async onScroll(event: CustomEvent<ScrollDetail>) {
    const el = await this.content.getScrollElement();
    const top = event.detail.scrollTop;
    this.atBottom = el.scrollHeight - (top + el.clientHeight) < 80;
    if (top < 60 && this.hasMore && !this.loadingMore) {
      await this.loadOlder();
    }
  }

  // Charge un batch plus ancien en tête, puis compense le décalage pour ne pas « sauter ».
  private async loadOlder() {
    this.loadingMore = true;
    const el = await this.content.getScrollElement();
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    const batch = await this.chat.loadHistory(this.messages[0]?.id);
    this.hasMore = batch.length >= BATCH;
    this.messages = [...batch, ...this.messages];
    this.rebuild();
    setTimeout(() => {
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
      this.loadingMore = false;
    }, 0);
  }

  // Envoie le message ; il reviendra via l'event message:new (diffusion), donc rien à ajouter localement.
  async send() {
    const content = this.draft.trim();
    if (!content) {
      return;
    }
    this.draft = "";
    this.resetInputHeight(); // remet la zone de saisie à une ligne (vider le ngModel ne le fait pas).
    const ack = await this.chat.send(content);
    if (!ack.ok) {
      this.draft = content; // échec : on restaure le brouillon.
    }
  }

  // Remet le textarea à une ligne : autoGrow a posé une hauteur en style inline que le vidage du
  // ngModel ne réinitialise pas ; on l'efface puis on recalcule la réserve basse du fil.
  private resetInputHeight() {
    if (this.field?.nativeElement) {
      this.field.nativeElement.style.height = "auto";
    }
    this.updateInputHeight();
  }

  // Ajuste la hauteur du champ de saisie à son contenu (jusqu'à un maximum), puis réajuste la réserve
  // basse du fil pour que le dernier message ne passe pas derrière la barre de saisie qui grandit.
  autoGrow(event: Event) {
    const field = event.target as HTMLTextAreaElement;
    field.style.height = "auto";
    field.style.height = Math.min(field.scrollHeight, 120) + "px";
    this.updateInputHeight();
  }

  // Mesure la hauteur réelle de la barre de saisie et en déduit la réserve basse de l'ion-content
  // (barre + navbar + safe area + petit interstice).
  private updateInputHeight() {
    const height = this.inputBar?.nativeElement.offsetHeight ?? 64;
    this.contentPaddingBottom = `calc(${height}px + var(--navbar-height) + var(--safe-bottom) + 8px)`;
  }

  // --- Suppression (appui long sur une bulle → confirmation) ---
  askDelete(id: number) {
    this.pendingDeleteId = id;
  }

  cancelDelete() {
    this.pendingDeleteId = null;
  }

  async confirmDelete() {
    const id = this.pendingDeleteId;
    this.pendingDeleteId = null;
    if (id !== null) {
      await this.chat.remove(id);
    }
  }

  // Fait défiler jusqu'en bas. Double requestAnimationFrame : garantit que le layout du fil est vidé
  // (hauteur stabilisée) avant de défiler, y compris sur Firefox et pendant une transition de page.
  private scrollToBottom(duration: number) {
    requestAnimationFrame(() => requestAnimationFrame(() => this.content?.scrollToBottom(duration)));
  }

  // Reconstruit le fil : insère les séparateurs de jour et calcule le regroupement par auteur.
  private rebuild() {
    const items: ChatItem[] = [];
    let prev: ChatMessage | null = null;
    for (const m of this.messages) {
      const day = parisFromUtc(m.created_at).format("YYYY-MM-DD");
      const prevDay = prev ? parisFromUtc(prev.created_at).format("YYYY-MM-DD") : null;
      const newDay = day !== prevDay;
      if (newDay) {
        items.push({ type: "day", key: "day-" + day, label: this.dayLabel(m.created_at) });
      }
      items.push({
        type: "msg",
        key: "msg-" + m.id,
        message: m,
        showHeader: newDay || !prev || prev.sender_id !== m.sender_id,
        isOwn: m.sender_id === this.myId,
        canDelete: m.sender_id === this.myId || this.isAdmin
      });
      prev = m;
    }
    this.items = items;
  }

  // Libellé d'un séparateur de jour : « Aujourd'hui », « Hier », sinon la date en toutes lettres.
  private dayLabel(createdAt: string): string {
    const day = parisFromUtc(createdAt).startOf("day");
    const today = dayjs().startOf("day");
    if (day.isSame(today, "day")) {
      return "Aujourd'hui";
    }
    if (day.isSame(today.subtract(1, "day"), "day")) {
      return "Hier";
    }
    return parisFromUtc(createdAt).format("dddd D MMMM");
  }
}
