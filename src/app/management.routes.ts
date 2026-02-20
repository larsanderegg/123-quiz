import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const managementRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/manage-dashboard/manage-dashboard.component')
          .then(m => m.ManageDashboardComponent)
      },
      {
        path: 'questions/new',
        loadComponent: () => import('./components/question-new/question-form.component')
          .then(m => m.QuestionFormComponent)
      },
      {
        path: 'questions/:id/edit',
        loadComponent: () => import('./components/question-new/question-form.component')
          .then(m => m.QuestionFormComponent)
      },
      {
        path: 'rounds/new',
        loadComponent: () => import('./components/round-form/round-form.component')
          .then(m => m.RoundFormComponent)
      },
      {
        path: 'rounds/:id/edit',
        loadComponent: () => import('./components/round-form/round-form.component')
          .then(m => m.RoundFormComponent)
      },
      // Redirect old list routes to dashboard
      {
        path: 'questions',
        redirectTo: '',
        pathMatch: 'full'
      },
      {
        path: 'rounds',
        redirectTo: '',
        pathMatch: 'full'
      }
    ]
  }
];