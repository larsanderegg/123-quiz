import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize, take } from 'rxjs';
import { RoundService } from '../../services/round.service';
import { Round } from '../../models';

// Import necessary Angular Material Modules
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-round-start',
  standalone: true,
  imports: [
    CommonModule,
    // Material Modules
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './round-start.component.html',
  styleUrls: ['./round-start.component.scss']
})
export class RoundStartComponent implements OnInit, OnDestroy {
  isLoading = true;
  roundData: Round | null = null;
  roundId: string | null = null;
  backgroundImage: string | null = null;
  roundAudio: HTMLAudioElement | null = null;
  errorLoading: string | null = null;

  private routeSub: Subscription | undefined;
  private roundDataSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roundService: RoundService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.roundId = params.get('roundId');
      if (this.roundId) {
        this.loadRoundDetails(this.roundId);
      } else {
        this.errorLoading = 'Round ID not found in URL.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.roundDataSub?.unsubscribe();
    // Optional: Stop audio if it's playing when component is destroyed
    this.roundAudio?.pause();
  }

  loadRoundDetails(id: string): void {
    console.log('🔍 [RoundStart] Loading round details for ID:', id);
    this.isLoading = true;
    this.errorLoading = null;
    this.backgroundImage = null;
    this.roundAudio = null;

    this.roundDataSub = this.roundService.getRoundById(id)
      .pipe(
        take(1), // Complete after first emission
        finalize(() => {
          console.log('🏁 [RoundStart] Finalize called, setting isLoading = false');
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (round) => {
          console.log('✅ [RoundStart] Round data received:', round);
          this.roundData = round;
          // Set background image path
          if (round.backgroundImagePath) {
            this.backgroundImage = round.backgroundImagePath;
            console.log('Setting background image:', this.backgroundImage);
          }
          // Initialize audio object if path exists
          if (round.audioPath) {
            this.roundAudio = new Audio(round.audioPath);
            this.roundAudio.load(); // Preload audio
            console.log('Audio initialized:', round.audioPath);
          }
        },
        error: (err) => {
          console.error('❌ [RoundStart] Error loading round details:', err);
          this.errorLoading = 'Failed to load round details. Please try again later.';
          this.roundData = null;
        }
      });
  }

  playRoundAudio(): void {
    if (this.roundAudio) {
      console.log('Playing round audio');
      this.roundAudio.currentTime = 0; // Rewind
      this.roundAudio.play().catch(error => {
        console.error("Error playing round audio:", error);
        // Optionally inform user
      });
    } else {
      console.warn('No round audio path available.');
    }
  }

  startQuiz(): void {
    if (this.roundId) {
      console.log('Navigating to play round:', this.roundId);
      this.router.navigate(['/quiz', this.roundId, 'play', 'question', 0, 'step', 0]);
    } else {
      console.error('Cannot start quiz, roundId is missing.');
    }
  }

  // Helper function for ngStyle background URL formatting
  getBackgroundUrl(): string | null {
    return this.backgroundImage ? `url('/assets/images/${this.backgroundImage}')` : null;
  }
}
