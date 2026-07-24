// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // URL de base du backend (sans slash final). On développe désormais contre le backend DISTANT
  // (VM Oracle, HTTPS), pour tester en conditions réelles.
  // Pour repasser temporairement en backend local : "http://localhost:3000".
  BACKEND_URL: "https://mpp-bectaly.duckdns.org"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
