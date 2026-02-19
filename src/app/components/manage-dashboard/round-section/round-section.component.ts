import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Round, Question } from '../../../models';
import { QuestionItemComponent } from '../question-item/question-item.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

export interface RoundWithQuestions extends Round {
  questions: Question[];
}

@Component({
  selector: 'app-round-section',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    QuestionItemComponent,
    EmptyStateComponent
  ],
  templateUrl: './round-section.component.html',
  styleUrls: ['./round-section.component.scss']
})
export class RoundSectionComponent {
  @Input() round!: RoundWithQuestions;
  @Input() expanded: boolean = false;
  @Output() toggle = new EventEmitter<void>();
  @Output() editRound = new EventEmitter<string>();
  @Output() deleteRound = new EventEmitter<string>();
  @Output() addQuestion = new EventEmitter<string>();
  @Output() editQuestion = new EventEmitter<string>();
  @Output() deleteQuestion = new EventEmitter<string>();
  @Output() duplicateQuestion = new EventEmitter<string>();

  // Get answers for a specific question
  getAnswersForQuestion(question: Question): any[] {
    return question.answers || [];
  }

  onToggle(): void {
    this.toggle.emit();
  }

  onEditRound(): void {
    this.editRound.emit(this.round.id);
  }

  onDeleteRound(): void {
    if (confirm(`Are you sure you want to delete the round "${this.round.name}"? This will NOT delete the questions.`)) {
      this.deleteRound.emit(this.round.id);
    }
  }

  onAddQuestion(): void {
    this.addQuestion.emit(this.round.id);
  }

  trackByQuestionId(index: number, question: Question): string {
    return question.id;
  }
}
