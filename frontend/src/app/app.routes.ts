import { Routes } from '@angular/router';
import {QuestionListComponent} from './components/question-list/question-list.component';
import {QuestionFormComponent} from './components/question-new/question-form.component';
import {QuizPlayerComponent} from './components/quiz-player/quiz-player.component';
import {RoundListComponent} from './components/round-list/round-list.component';
import {RoundFormComponent} from './components/round-form/round-form.component';
import {QuizStartComponent} from './components/quiz-start/quiz-start.component';
import {RoundStartComponent} from './components/round-start/round-start.component';

export const routes: Routes = [
  { path: '', redirectTo: '/quiz/start', pathMatch: 'full' },

  // Quiz Routes
  { path: 'quiz/start', component: QuizStartComponent },
  { path: 'quiz/:roundId/start', component: RoundStartComponent },
  { path: 'quiz/:roundId/play', component: QuizPlayerComponent },

  { path: 'manage', component: QuestionListComponent },
  { path: 'manage/questions', component: QuestionListComponent },
  { path: 'manage/questions/new', component: QuestionFormComponent },
  { path: 'manage/questions/:id/edit', component: QuestionFormComponent },

  { path: 'manage/rounds', component: RoundListComponent },
  { path: 'manage/rounds/new', component: RoundFormComponent },
  { path: 'manage/rounds/:id/edit', component: RoundFormComponent },

  { path: '**', redirectTo: '/quiz/start' },
];
