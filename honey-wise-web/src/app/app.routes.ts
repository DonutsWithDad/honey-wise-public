import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'HoneyWise',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Sign in · HoneyWise',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    title: 'Create account · HoneyWise',
  },
  {
    path: 'session-expired',
    loadComponent: () =>
      import('./pages/session-expired/session-expired').then((m) => m.SessionExpired),
    title: 'Session expired · HoneyWise',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
    title: 'Profile · HoneyWise',
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/recipes/recipes').then((m) => m.Recipes),
    title: 'Recipe Book · HoneyWise',
  },
  {
    path: 'recipes/new',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/recipes/recipe-form').then((m) => m.RecipeForm),
    title: 'New Recipe · HoneyWise',
  },
  {
    path: 'recipes/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/recipes/recipe-form').then((m) => m.RecipeForm),
    title: 'Edit Recipe · HoneyWise',
  },
  { path: '**', redirectTo: '' },
];
