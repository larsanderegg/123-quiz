import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RoundService } from '../../services/round.service'; // Adjust path
import { QuestionService } from '../../services/question.service'; // <-- Import QuestionService
import { Round, Question } from '@quiz/shared'; // Adjust path, import Question
import { forkJoin } from 'rxjs'; // <-- Import forkJoin
import { map } from 'rxjs/operators'; // <-- Import map

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
    private questionService: QuestionService // Inject QuestionService
  ) {}

  ngOnInit(): void {
    this.loadRoundsAndCounts();
  }

  loadRoundsAndCounts(): void {
    this.isLoading = true;
    // Use forkJoin to fetch both data streams in parallel
    forkJoin({
      rounds: this.roundService.getAllRounds(),
      questions: this.questionService.getAllQuestions() // Assuming Question has roundId or round.id
    }).pipe(
      map(({ rounds, questions }) => {
        // Create a map to store counts: { roundId: count }
        const questionCounts = new Map<string, number>();

        // Count questions per round
        questions.forEach(question => {
          // Ensure question.roundId or question.round.id exists and is not null/undefined
          const roundId = question.round?.id; // Adjust if using question.roundId directly
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
        console.log("Rounds with counts:", this.rounds);
      },
      error: (error) => {
        console.error('Error loading rounds or questions:', error);
        this.isLoading = false;
        // Handle error display
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
