import { Routes } from '@angular/router';

import { onboardedGuard, notOnboardedGuard, adminGuard } from './guards/onboarding-guards';

export const routes: Routes = [
  {
    path: 'onboarding',
    canActivate: [notOnboardedGuard],
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'home',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'matches',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/matches/matches.page').then((m) => m.MatchesPage),
  },
  {
    path: 'leaderboard',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/leaderboard/leaderboard.page').then((m) => m.LeaderboardPage),
  },
  {
    path: 'chat',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: 'profile',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'predictions',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/predictions/predictions.page').then((m) => m.PredictionsPage),
  },
  {
    path: 'user/:id',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/user/user.page').then((m) => m.UserPage),
  },
  {
    path: 'versions',
    canActivate: [onboardedGuard],
    loadComponent: () => import('./pages/versions/versions.page').then((m) => m.VersionsPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'admin/broadcast',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-broadcast/admin-broadcast.page').then((m) => m.AdminBroadcastPage),
  },
  {
    path: 'admin/results',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-results/admin-results.page').then((m) => m.AdminResultsPage),
  },
  {
    path: 'admin/bracket',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-bracket/admin-bracket.page').then((m) => m.AdminBracketPage),
  },
];
