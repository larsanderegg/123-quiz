import { Routes } from '@angular/router';
import {QuizPlayerComponent} from './components/quiz-player/quiz-player.component';
import {QuizStartComponent} from './components/quiz-start/quiz-start.component';
import {RoundStartComponent} from './components/round-start/round-start.component';
import {LoginComponent} from './components/login/login.component';
import {UnauthorizedComponent} from './components/unauthorized/unauthorized.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Auth Routes
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Quiz Routes (authenticated users only)
  { path: 'quiz/start', component: QuizStartComponent, canActivate: [authGuard] },
  { path: 'quiz/:roundId/start', component: RoundStartComponent, canActivate: [authGuard] },
  { path: 'quiz/:roundId/finished', component: QuizPlayerComponent, canActivate: [authGuard] },
  { path: 'quiz/:roundId/play/question/:questionIndex/step/:stepIndex', component: QuizPlayerComponent, canActivate: [authGuard] },
  { path: 'quiz/:roundId/play', redirectTo: 'quiz/:roundId/play/question/0/step/0', pathMatch: 'full' },

  // Management Routes (admin users only - lazy loaded)
  {
    path: 'manage',
    loadChildren: () => import('./management.routes').then(m => m.managementRoutes)
  },

  { path: '**', redirectTo: '/login' },
];
