import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Locale française par défaut pour tout le formatage de dates/heures de l'app.
dayjs.locale('fr');

// Plugins UTC + fuseau : les dates du backend (ex. created_at des messages) sont en UTC ;
// on les convertit en heure de Paris pour l'affichage.
dayjs.extend(utc);
dayjs.extend(timezone);

// Interprète une date UTC renvoyée par le backend et la ramène en heure de Paris.
export function parisFromUtc(isoUtc: string) {
  return dayjs.utc(isoUtc).tz("Europe/Paris");
}

// Interprète un coup d'envoi (stocké en HEURE DE PARIS, sans fuseau) comme instant absolu — pour
// planifier une notification au bon moment quel que soit le fuseau de l'appareil.
export function parisWall(isoParis: string) {
  return dayjs.tz(isoParis, "Europe/Paris");
}

export default dayjs;
