import { Component, OnInit } from '@angular/core';
import { QuestionService } from '../../services/question.service';
import { Question, Answer } from '@quiz/shared';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar'; // For header (optional)

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Add Material Modules here
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatToolbarModule, // Include if using mat-toolbar
  ],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss'] // Changed to .scss
})
export class QuestionListComponent implements OnInit {
  questions: Question[] = [];

  constructor(private questionService: QuestionService) {}

  ngOnInit(): void {
    this.loadQuestions();
  }

  loadQuestions(): void {
    this.questionService.getAllQuestions().subscribe({
      next: (questions) => {
        this.questions = questions.map(q => ({
          ...q,
          answers: [...q.answers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        }));
      },
      error: (error) => console.error('Error loading questions:', error)
    });
  }

  // getSortedAnswers method can be removed if sorting is done in loadQuestions

  deleteQuestion(id: string): void {
    // Consider using MatDialog for confirmation instead of confirm()
    if (confirm('Are you sure you want to delete this question?')) {
      this.questionService.deleteQuestion(id).subscribe({
        next: () => this.loadQuestions(),
        error: (error) => console.error('Error deleting question:', error)
      });
    }
  }
}
