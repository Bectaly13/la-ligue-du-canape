import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';

import { ChatService } from 'src/app/services/chat-service';
import { BackendResponse } from 'src/app/services/message-service';
import { ThemeService } from 'src/app/services/theme-service';
import { UserService } from 'src/app/services/user-service';

import { plural } from 'src/app/utils/plural';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  imports: [IonContent, FormsModule]
})
export class OnboardingPage implements ViewWillEnter {

  // Pseudo + code d'accès (création) et jeton de récupération (connexion), état de chargement, message
  // d'erreur, tentatives restantes et blocage. Le quota (5/jour) est PARTAGÉ entre création et connexion.
  name = "";
  code = "";
  token = "";
  loading = false;
  error = "";
  attemptsLeft: number | null = null;
  blocked = false;

  async ionViewWillEnter() {
    // Page sans app-header → la barre d'état prend la couleur du fond, pas celle d'un header.
    await this.theme.initTheme(false);
    this.reset();
  }

  constructor(
    private chat: ChatService,
    private theme: ThemeService,
    private user: UserService,
    private router: Router
  ) { }

  // Création soumettable : pseudo (≥ 2 car.) ET code saisis, pas en cours, pas bloqué (quota partagé).
  get canSubmit(): boolean {
    return !this.loading && !this.blocked && this.name.trim().length >= 2 && this.code.trim().length > 0;
  }

  // Connexion soumettable : jeton saisi, pas en cours, pas bloqué (même quota que la création).
  get canLogin(): boolean {
    return !this.loading && !this.blocked && this.token.trim().length > 0;
  }

  // Réinitialise le formulaire à l'entrée sur la page.
  private reset() {
    this.name = "";
    this.code = "";
    this.token = "";
    this.loading = false;
    this.error = "";
    this.attemptsLeft = null;
    this.blocked = false;
  }

  // Crée le compte (pseudo + code), puis redirige vers l'accueil ; sinon affiche l'échec.
  async submit() {
    if (!this.canSubmit) {
      return;
    }
    this.error = "";
    this.loading = true;
    const response = await this.user.createAccount(this.name, this.code);
    this.loading = false;
    if (response.ok) {
      await this.goHome();
      return;
    }
    this.handleFailure(response, "Impossible de créer le compte.");
  }

  // Se connecte à un compte existant via son jeton de récupération, puis redirige ; sinon affiche l'échec.
  async login() {
    if (!this.canLogin) {
      return;
    }
    this.error = "";
    this.loading = true;
    const response = await this.user.loginWithToken(this.token);
    this.loading = false;
    if (response.ok) {
      await this.goHome();
      return;
    }
    this.handleFailure(response, "Jeton invalide.");
  }

  // Le compte vient d'être activé : on démarre le chat (socket + non-lus) avant de rejoindre l'accueil.
  private async goHome() {
    await this.chat.init();
    await this.router.navigateByUrl("/home", { replaceUrl: true });
  }

  // Échec d'onboarding : 429 = quota épuisé (blocage jusqu'au lendemain) ; sinon message + tentatives restantes.
  private handleFailure(response: BackendResponse, fallback: string) {
    if (response.status === 429) {
      this.blocked = true;
      this.attemptsLeft = 0;
      this.error = response.reason || "Trop de tentatives. Réessaie demain.";
      return;
    }
    this.attemptsLeft = response.attemptsLeft ?? null;
    const suffix = this.attemptsLeft !== null
      ? ` — il te reste ${this.attemptsLeft} ${plural(this.attemptsLeft, "essai")}`
      : "";
    this.error = (response.reason || fallback) + suffix;
    if (this.attemptsLeft === 0) {
      this.blocked = true;
    }
  }
}
