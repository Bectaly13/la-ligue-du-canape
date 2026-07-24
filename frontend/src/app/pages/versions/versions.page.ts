import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';

import { ThemeService } from 'src/app/services/theme-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
import { VersionNoteComponent } from 'src/app/components/version-note/version-note.component';

import { RELEASE_NOTES, ReleaseNote } from 'src/app/utils/release-notes';

@Component({
  selector: 'app-versions',
  templateUrl: './versions.page.html',
  styleUrls: ['./versions.page.scss'],
  imports: [IonContent, IonHeader, HeaderComponent, VersionNoteComponent]
})
export class VersionsPage implements ViewWillEnter {
  notes: ReleaseNote[] = RELEASE_NOTES;

  async ionViewWillEnter() {
    await this.theme.initTheme();
  }

  constructor(
    private theme: ThemeService,
    private location: Location
  ) { }

  goBack() {
    this.location.back();
  }
}
