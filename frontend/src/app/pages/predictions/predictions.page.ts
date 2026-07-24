import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';

import { Competition, CompetitionService } from 'src/app/services/competition-service';
import { MyPredictions, PredictionContext, PredictionService } from 'src/app/services/prediction-service';
import { ThemeService } from 'src/app/services/theme-service';

import { CompetitionSelectorComponent } from 'src/app/components/competition-selector/competition-selector.component';
import { EmptyStateComponent } from 'src/app/components/empty-state/empty-state.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { PredictionItemComponent } from 'src/app/components/prediction-item/prediction-item.component';
import { PredictionModalComponent } from 'src/app/components/prediction-modal/prediction-modal.component';

// Type de prono affiché (segment).
type PredType = 'toPredict' | 'predicted' | 'archived';

// Page dédiée « Mes pronos » : sélection de la compétition + segment (à faire / posés / archivés).
@Component({
  selector: 'app-predictions',
  templateUrl: './predictions.page.html',
  styleUrls: ['./predictions.page.scss'],
  imports: [IonContent, IonHeader, CompetitionSelectorComponent, EmptyStateComponent, HeaderComponent, PredictionItemComponent, PredictionModalComponent]
})
export class PredictionsPage implements ViewWillEnter {

  competitions: Competition[] = [];
  selectedCompetitionId: number | null = null;
  predictions: MyPredictions | null = null;
  type: PredType = 'toPredict';

  // Modale d'édition d'un prono.
  predictionOpen = false;
  predictionContext: PredictionContext | null = null;

  async ionViewWillEnter() {
    await this.theme.initTheme();
    await this.load();
  }

  constructor(
    private theme: ThemeService,
    private competition: CompetitionService,
    private prediction: PredictionService,
    private location: Location
  ) { }

  goBack() {
    this.location.back();
  }

  setType(type: PredType) {
    this.type = type;
  }

  // Charge les compétitions, garantit une sélection, puis les pronos de celle-ci.
  private async load() {
    // On repart toujours sur « À faire » (Ionic réutilise l'instance de page → sinon le segment garderait
    // son dernier état, avec un comportement qui diffère selon le navigateur).
    this.type = "toPredict";
    await this.competition.loadCompetitions();
    this.competitions = this.competition.getCompetitions();
    this.selectedCompetitionId = await this.competition.ensureSelection();
    await this.loadPredictions();
  }

  private async loadPredictions() {
    this.predictions = this.selectedCompetitionId
      ? await this.prediction.getMyPredictions(this.selectedCompetitionId)
      : null;
  }

  async onCompetitionChange(id: number) {
    this.selectedCompetitionId = id;
    await this.competition.setSelectedId(id);
    await this.loadPredictions();
  }

  // --- Édition d'un prono (poser ou modifier) ---
  async openPrediction(matchId: number) {
    this.predictionContext = await this.prediction.getPrediction(matchId);
    if (this.predictionContext) {
      this.predictionOpen = true;
    }
  }

  closePrediction() {
    this.predictionOpen = false;
  }

  async onPredictionSaved() {
    this.predictionOpen = false;
    await this.loadPredictions();
  }
}
