import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // Import Router and RouterModule
import { RoundService } from '../../services/round.service'; // Adjust path
import { Round } from '@quiz/shared'; // Adjust path

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider'; // Optional divider

@Component({
  selector: 'app-quiz-start',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material Modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './quiz-start.component.html',
  styleUrls: ['./quiz-start.component.scss']
})
export class QuizStartComponent implements OnInit {
  rounds: Round[] = [];
  isLoading = true;

  private introSound: HTMLAudioElement;

  constructor(
    private roundService: RoundService,
    private router: Router
  ) {
    this.introSound = new Audio('assets/sounds/intro-sound.mp3');
  }

  ngOnInit(): void {
    this.introSound.load();
    this.loadRounds();
  }

  loadRounds(): void {
    this.isLoading = true;
    this.roundService.getAllRounds().subscribe({
      next: (rounds) => {
        this.rounds = rounds.sort((a, b) => {
          const orderA = a.order ?? Infinity; // Treat null/undefined order as last
          const orderB = b.order ?? Infinity;
          if (orderA !== orderB) {
            return orderA - orderB; // Sort by order first
          }
          return a.name.localeCompare(b.name); // If orders are same, sort by name
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading rounds:', error);
        this.isLoading = false;
        // Handle error display (e.g., show a message)
      }
    });
  }

  startRound(roundId: string): void {
    console.log(`Starting quiz for round ID: ${roundId}`);
    // Navigate to the player, passing the roundId as a query parameter
    // The QuizPlayerComponent will need to be updated later to filter questions based on this ID.
    this.introSound.pause()
    this.router.navigate(['/quiz', roundId, 'start']);
  }
}
