import { AfterViewInit, Component, ElementRef, ViewChild, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, removeOutline, scanOutline } from 'ionicons/icons';

import { BracketMatch, BracketRound, BracketSlot } from 'src/app/services/bracket-service';

import { FlagComponent } from 'src/app/components/flag/flag.component';

// Un nœud (une équipe) placé sur un anneau : position en % du carré, taille en %, et son drapeau.
interface CircleNode {
  x: number;
  y: number;
  size: number;
  slug: string | null;
  name: string;
  champion: boolean;
}

// Une arête reliant une équipe à celle du tour suivant (convergence vers le centre).
interface CircleEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Bracket « circulaire » : les participants du 1er tour forment le cercle extérieur ; à chaque tour,
// les vainqueurs se rapprochent du centre. L'équipe au centre est le vainqueur de la compétition.
// La zone est zoomable (pinch / molette / boutons) et déplaçable (glisser) → lisible même avec beaucoup
// d'équipes (16es…).
@Component({
  selector: 'app-bracket-circular',
  templateUrl: './bracket-circular.component.html',
  styleUrls: ['./bracket-circular.component.scss'],
  imports: [IonIcon, FlagComponent]
})
export class BracketCircularComponent implements AfterViewInit {
  rounds = input.required<BracketRound[]>();

  @ViewChild('viewport') private viewportRef!: ElementRef<HTMLElement>;

  // Transformation de la zone (pan + zoom).
  scale = 1;
  tx = 0;
  ty = 0;
  // Zoom minimal = niveau « fit » (tout le bracket visible) ; on ne peut pas dézoomer en deçà.
  private minScale = 1;

  // Géométrie (en % du carré : centre à 50/50, rayon extérieur RMAX).
  private readonly CX = 50;
  private readonly CY = 50;
  private readonly RMAX = 44;

  // Pointeurs actifs (multi-touch) et repères du geste en cours.
  private pointers = new Map<number, { x: number; y: number }>();
  private lastMid: { x: number; y: number } | null = null;
  private lastDist: number | null = null;

  constructor() {
    addIcons({ "add-outline": addOutline, "remove-outline": removeOutline, "scan-outline": scanOutline });
  }

  ngAfterViewInit() {
    this.reset();
  }

  get transform(): string {
    return `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
  }

  // Calcule les nœuds (équipes par anneau) et les arêtes (croisements) à partir des tours.
  layout = computed<{ nodes: CircleNode[]; edges: CircleEdge[] }>(() => {
    const rounds = this.rounds();
    if (!rounds.length) {
      return { nodes: [], edges: [] };
    }

    // Un anneau par tour : les 2 slots de chaque match, à plat.
    const rings: BracketSlot[][] = rounds.map((r) => {
      const slots: BracketSlot[] = [];
      for (const m of r.matches) {
        slots.push(m.slot1, m.slot2);
      }
      return slots;
    });
    const numRings = rings.length;

    // Angles : anneau extérieur réparti régulièrement ; chaque anneau intérieur au milieu de sa paire.
    const angles: number[][] = [];
    angles[0] = rings[0].map((_, i) => -90 + (i * 360) / rings[0].length);
    for (let r = 1; r < numRings; r++) {
      angles[r] = rings[r].map((_, m) => (angles[r - 1][2 * m] + angles[r - 1][2 * m + 1]) / 2);
    }

    const radius = (r: number) => (this.RMAX * (numRings - r)) / numRings; // anneau 0 = RMAX, centre = 0
    const point = (r: number, i: number) => {
      const a = (angles[r][i] * Math.PI) / 180;
      return { x: this.CX + radius(r) * Math.cos(a), y: this.CY + radius(r) * Math.sin(a) };
    };
    // Taille : petit à l'extérieur, un peu plus gros vers le centre (assez pour aérer, sans chevauchement).
    const sizeAt = (r: number) => 6 + (r / numRings) * 3;

    const nodes: CircleNode[] = [];
    for (let r = 0; r < numRings; r++) {
      rings[r].forEach((slot, i) => {
        const p = point(r, i);
        nodes.push({ x: p.x, y: p.y, size: sizeAt(r), slug: slot.team?.slug ?? null, name: slot.team?.name ?? "", champion: false });
      });
    }
    // Centre : le vainqueur de la finale (le dernier tour à un seul match).
    const champion = this.championTeam(rounds[numRings - 1].matches[0]);
    nodes.push({ x: this.CX, y: this.CY, size: sizeAt(numRings), slug: champion?.slug ?? null, name: champion?.name ?? "", champion: true });

    // Arêtes : chaque équipe rejoint le nœud du tour suivant (le vainqueur de sa paire), jusqu'au centre.
    const edges: CircleEdge[] = [];
    for (let r = 0; r < numRings; r++) {
      rings[r].forEach((_, i) => {
        const a = point(r, i);
        const b = r + 1 < numRings ? point(r + 1, Math.floor(i / 2)) : { x: this.CX, y: this.CY };
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      });
    }

    return { nodes, edges };
  });

  // --- Pan / zoom ---
  onDown(event: PointerEvent) {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.lastMid = null;
    this.lastDist = null;
  }

  onMove(event: PointerEvent) {
    if (!this.pointers.has(event.pointerId)) {
      return;
    }
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...this.pointers.values()];
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    if (pts.length === 1) {
      // Un doigt : déplacement.
      const p = pts[0];
      if (this.lastMid) {
        this.tx += p.x - this.lastMid.x;
        this.ty += p.y - this.lastMid.y;
      }
      this.lastMid = { x: p.x, y: p.y };
    } else {
      // Deux doigts : zoom autour du milieu + déplacement du milieu.
      const a = pts[0];
      const b = pts[1];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.lastMid && this.lastDist) {
        this.applyZoom(dist / this.lastDist, mid.x - rect.left, mid.y - rect.top);
        this.tx += mid.x - this.lastMid.x;
        this.ty += mid.y - this.lastMid.y;
      }
      this.lastMid = mid;
      this.lastDist = dist;
    }
    // On ne laisse jamais voir au-delà du bracket.
    this.clampTranslation();
  }

  onUp(event: PointerEvent) {
    this.pointers.delete(event.pointerId);
    this.lastMid = null;
    this.lastDist = null;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.applyZoom(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX - rect.left, event.clientY - rect.top);
  }

  // Boutons de zoom (autour du centre de la zone) et recentrage.
  zoom(factor: number) {
    const rect = this.viewportRef.nativeElement.getBoundingClientRect();
    this.applyZoom(factor, rect.width / 2, rect.height / 2);
  }

  reset() {
    const vp = this.viewportRef.nativeElement;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    // « Fit » : tout le bracket tient dans la zone. C'est aussi le zoom MINIMAL (pas de dézoom en deçà).
    // La toile est un carré de côté = largeur de la zone.
    this.minScale = Math.min(vpW, vpH) / vpW;
    this.scale = this.minScale;
    const size = vpW * this.scale;
    this.tx = (vpW - size) / 2;
    this.ty = (vpH - size) / 2;
  }

  // Zoom d'un facteur autour d'un point (cx, cy) exprimé dans le repère de la zone (borné à [min, 6]).
  private applyZoom(factor: number, cx: number, cy: number) {
    const ns = Math.min(6, Math.max(this.minScale, this.scale * factor));
    const ratio = ns / this.scale;
    this.tx = cx - ratio * (cx - this.tx);
    this.ty = cy - ratio * (cy - this.ty);
    this.scale = ns;
    this.clampTranslation();
  }

  // Empêche de paner au-delà de la toile : elle couvre toujours la zone (ou reste centrée si plus petite).
  private clampTranslation() {
    const vp = this.viewportRef.nativeElement;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const size = vp.clientWidth * this.scale;
    this.tx = size <= vpW ? (vpW - size) / 2 : Math.min(0, Math.max(vpW - size, this.tx));
    this.ty = size <= vpH ? (vpH - size) / 2 : Math.min(0, Math.max(vpH - size, this.ty));
  }

  // Équipe vainqueur de la finale (au cumul), ou null si la confrontation n'est pas tranchée.
  private championTeam(finale: BracketMatch): { slug: string; name: string } | null {
    if (!finale || finale.winner === 0) {
      return null;
    }
    return finale.winner === 1 ? finale.slot1.team : finale.slot2.team;
  }
}
