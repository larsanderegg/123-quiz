import { Routes } from '@angular/router';
import {QuestionListComponent} from './components/question-list/question-list.component';
import {QuestionFormComponent} from './components/question-new/question-form.component';
import {QuizPlayerComponent} from './components/quiz-player/quiz-player.component';
import {RoundListComponent} from './components/round-list/round-list.component';
import {RoundFormComponent} from './components/round-form/round-form.component';
import {QuizStartComponent} from './components/quiz-start/quiz-start.component';
import {RoundStartComponent} from './components/round-start/round-start.component';
import {LoginComponent} from './components/login/login.component';
import {UnauthorizedComponent} from './components/unauthorized/unauthorized.component';
import {ManageDashboardComponent} from './components/manage-dashboard/manage-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

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

  // Management Routes (admin users only)
  { path: 'manage', component: ManageDashboardComponent, canActivate: [adminGuard] },

  // Question Form Routes
  { path: 'manage/questions/new', component: QuestionFormComponent, canActivate: [adminGuard] },
  { path: 'manage/questions/:id/edit', component: QuestionFormComponent, canActivate: [adminGuard] },

  // Round Form Routes
  { path: 'manage/rounds/new', component: RoundFormComponent, canActivate: [adminGuard] },
  { path: 'manage/rounds/:id/edit', component: RoundFormComponent, canActivate: [adminGuard] },

  // Redirect old list routes to new dashboard
  { path: 'manage/questions', redirectTo: '/manage', pathMatch: 'full' },
  { path: 'manage/rounds', redirectTo: '/manage', pathMatch: 'full' },

  { path: '**', redirectTo: '/login' },
];
