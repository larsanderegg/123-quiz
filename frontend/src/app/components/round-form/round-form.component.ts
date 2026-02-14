import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoundService } from '../../services/round.service'; // Adjust path
import { Round } from '@quiz/shared'; // Adjust path
import { finalize } from 'rxjs/operators';

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // For feedback


@Component({
  selector: 'app-round-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material Modules
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSnackBarModule, // Import SnackBar module
  ],
  templateUrl: './round-form.component.html',
  styleUrls: ['./round-form.component.scss']
})
export class RoundFormComponent implements OnInit {
  roundForm: FormGroup;
  isEditMode = false;
  roundId: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private roundService: RoundService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar // Inject MatSnackBar
  ) {
    this.roundForm = this.fb.group({
      name: ['', Validators.required],
      audioPath: ['', Validators.required],
      backgroundImagePath: [''],
      order: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.roundId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.roundId;
    this.isLoading = this.isEditMode;

    if (this.isEditMode && this.roundId) {
      this.loadRoundData(this.roundId);
    }
  }

  loadRoundData(id: string): void {
    this.roundService.getRoundById(id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (round) => {
          this.roundForm.patchValue({
            name: round.name,
            audioPath: round.audioPath,
            backgroundImagePath: round.backgroundImagePath ?? '',
            order: round.order ?? 0,
          });
        },
        error: (error) => {
          console.error('Error loading round:', error);
          this.snackBar.open('Error loading round data.', 'Close', { duration: 3000 });
          this.router.navigate(['/manage/rounds']); // Navigate back if load fails
        }
      });
  }

  onSubmit(): void {
    if (this.roundForm.invalid) {
      this.roundForm.markAllAsTouched(); // Mark fields for validation messages
      return;
    }

    this.isLoading = true;
    // getRawValue() includes all fields, including the new one
    const roundData: Partial<Round> = this.roundForm.getRawValue();

    // Ensure empty string becomes null if desired by backend for optional fields
    if (!roundData.backgroundImagePath) {
      roundData.backgroundImagePath = undefined;
    }

    const saveObservable = this.isEditMode && this.roundId
      ? this.roundService.updateRound(this.roundId, roundData)
      : this.roundService.createRound(roundData);

    saveObservable
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (savedRound) => {
          console.log(`Round ${this.isEditMode ? 'updated' : 'added'} successfully:`, savedRound);
          this.snackBar.open(`Round ${this.isEditMode ? 'updated' : 'saved'} successfully!`, 'Ok', { duration: 2500 });
          this.router.navigate(['/manage/rounds']); // Navigate back to the list
        },
        error: (error) => {
          console.error(`Error ${this.isEditMode ? 'updating' : 'adding'} round:`, error);
          this.snackBar.open(`Error ${this.isEditMode ? 'updating' : 'saving'} round. Please try again.`, 'Close', { duration: 3000 });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/manage/rounds']);
  }
}
