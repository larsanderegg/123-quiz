import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RoundService } from '../../services/round.service'; // Adjust path
import { QuestionService } from '../../services/question.service'; // <-- Import QuestionService
import { Round, Question } from '../../models'; // Adjust path, import Question
import { forkJoin } from 'rxjs'; // <-- Import forkJoin
import { map, take } from 'rxjs/operators'; // <-- Import map and take

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // For loading indicator

// Extend Round type locally for display purposes (optional but good practice)
interface RoundWithCount extends Round {
  _questionCount?: number; // Temporary property for display
}


@Component({
  selector: 'app-round-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatToolbarModule,
    MatProgressSpinnerModule, // Import spinner module
  ],
  templateUrl: './round-list.component.html',
  styleUrls: ['./round-list.component.scss']
})
export class RoundListComponent implements OnInit {
  // Use the extended type
  rounds: RoundWithCount[] = [];
  isLoading = true;

  constructor(
    private roundService: RoundService,
    private questionService: QuestionService, // Inject QuestionService
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoundsAndCounts();
  }

  loadRoundsAndCounts(): void {
    this.isLoading = true;

    // Use forkJoin with take(1) to complete observables after first emission
    forkJoin({
      rounds: this.roundService.getAllRounds().pipe(take(1)),
      questions: this.questionService.getAllQuestions().pipe(take(1))
    }).pipe(
      map(({ rounds, questions }) => {
        // Create a map to store counts: { roundId: count }
        const questionCounts = new Map<string, number>();

        // Count questions per round
        questions.forEach(question => {
          // Use Firestore field directly (not TypeORM relation)
          const roundId = question.roundId;
          if (roundId) {
            questionCounts.set(roundId, (questionCounts.get(roundId) || 0) + 1);
          }
        });

        // Add the count to each round object
        const roundsWithCounts: RoundWithCount[] = rounds.map(round => ({
          ...round,
          _questionCount: questionCounts.get(round.id) || 0 // Add count, default to 0
        }));

        return roundsWithCounts.sort((a,b) => a.name.localeCompare(b.name)); // Sort rounds alphabetically
      })
    ).subscribe({
      next: (processedRounds) => {
        this.rounds = processedRounds;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading rounds or questions:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteRound(id: string): void {
    if (confirm('Are you sure you want to delete this round? This might affect associated questions.')) {
      this.roundService.deleteRound(id).subscribe({
        next: () => {
          this.loadRoundsAndCounts(); // Reload data after delete
        },
        error: (error) => {
          console.error('Error deleting round:', error);
          // Add error feedback
        }
      });
    }
  }
}
