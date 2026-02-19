import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject, combineLatest, forkJoin } from 'rxjs';
import { map, takeUntil, debounceTime } from 'rxjs/operators';
import { QuestionService } from '../../services/question.service';
import { RoundService } from '../../services/round.service';
import { Round, Question } from '../../models';
import { RoundSectionComponent, RoundWithQuestions } from './round-section/round-section.component';
import { LoadingSkeletonComponent } from '../shared/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '../shared/empty-state/empty-state.component';

@Component({
  selector: 'app-manage-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RoundSectionComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent
  ],
  templateUrl: './manage-dashboard.component.html',
  styleUrls: ['./manage-dashboard.component.scss']
})
export class ManageDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data streams
  private allRounds$ = new BehaviorSubject<Round[]>([]);
  private allQuestions$ = new BehaviorSubject<Question[]>([]);
  loading$ = new BehaviorSubject<boolean>(true);

  // UI state
  searchTerm$ = new BehaviorSubject<string>('');
  selectedRoundFilter$ = new BehaviorSubject<string>('all');
  expandedRounds = new Set<string>();

  // Computed data
  roundsWithQuestions$ = new BehaviorSubject<RoundWithQuestions[]>([]);
  filteredRounds$ = new BehaviorSubject<RoundWithQuestions[]>([]);

  // For template
  searchTerm = '';
  selectedRoundFilter = 'all';
  availableRounds: Round[] = [];

  constructor(
    private questionService: QuestionService,
    private roundService: RoundService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupFiltering();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all rounds and questions from Firestore
   */
  loadData(): void {
    this.loading$.next(true);

    forkJoin({
      rounds: this.roundService.getAllRounds(),
      questions: this.questionService.getAllQuestions()
    })
      .pipe(
        takeUntil(this.destroy$),
        map(({ rounds, questions }) => {
          // Sort rounds by order
          const sortedRounds = rounds.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          // Group questions by round
          const roundsWithQuestions: RoundWithQuestions[] = sortedRounds.map(round => ({
            ...round,
            questions: questions
              .filter(q => q.roundId === round.id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          }));

          // Add "Unassigned Questions" section if there are any
          const unassignedQuestions = questions
            .filter(q => !q.roundId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          if (unassignedQuestions.length > 0) {
            roundsWithQuestions.push({
              id: 'unassigned',
              name: 'Unassigned Questions',
              order: 9999,
              questions: unassignedQuestions,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }

          return { rounds: sortedRounds, questions, roundsWithQuestions };
        })
      )
      .subscribe({
        next: ({ rounds, questions, roundsWithQuestions }) => {
          this.allRounds$.next(rounds);
          this.allQuestions$.next(questions);
          this.roundsWithQuestions$.next(roundsWithQuestions);
          this.availableRounds = rounds;
          this.loading$.next(false);
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.snackBar.open('Failed to load data. Please try again.', 'Close', { duration: 5000 });
          this.loading$.next(false);
        }
      });
  }

  /**
   * Setup reactive filtering based on search term and round filter
   */
  setupFiltering(): void {
    combineLatest([
      this.roundsWithQuestions$,
      this.searchTerm$.pipe(debounceTime(300)),
      this.selectedRoundFilter$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([rounds, searchTerm, roundFilter]) => {
        let filtered = rounds;

        // Apply round filter
        if (roundFilter !== 'all') {
          filtered = filtered.filter(r => r.id === roundFilter);
        }

        // Apply search filter
        if (searchTerm.trim()) {
          const search = searchTerm.toLowerCase();
          filtered = filtered
            .map(round => ({
              ...round,
              questions: round.questions.filter(q =>
                q.text.toLowerCase().includes(search) ||
                q.category?.toLowerCase().includes(search) ||
                q.introduction?.toLowerCase().includes(search)
              )
            }))
            .filter(round => round.questions.length > 0);
        }

        this.filteredRounds$.next(filtered);
      });
  }

  /**
   * Handle search input changes
   */
  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  /**
   * Handle round filter changes
   */
  onRoundFilterChange(value: string): void {
    this.selectedRoundFilter = value;
    this.selectedRoundFilter$.next(value);
  }

  /**
   * Toggle round expansion
   */
  toggleRound(roundId: string): void {
    if (this.expandedRounds.has(roundId)) {
      this.expandedRounds.delete(roundId);
    } else {
      this.expandedRounds.add(roundId);
    }
  }

  /**
   * Check if round is expanded
   */
  isRoundExpanded(roundId: string): boolean {
    return this.expandedRounds.has(roundId);
  }

  /**
   * Navigate to create new question
   */
  onAddQuestion(roundId?: string): void {
    if (roundId && roundId !== 'unassigned') {
      this.router.navigate(['/manage/questions/new'], { queryParams: { roundId } });
    } else {
      this.router.navigate(['/manage/questions/new']);
    }
  }

  /**
   * Navigate to edit question
   */
  onEditQuestion(questionId: string): void {
    this.router.navigate(['/manage/questions', questionId, 'edit']);
  }

  /**
   * Delete question with confirmation
   */
  onDeleteQuestion(questionId: string): void {
    const question = this.allQuestions$.value.find(q => q.id === questionId);
    if (!question) return;

    if (confirm(`Are you sure you want to delete the question "${question.text}"? This action cannot be undone.`)) {
      this.questionService.deleteQuestion(questionId).subscribe({
        next: () => {
          this.snackBar.open('Question deleted successfully', 'Close', { duration: 3000 });
          this.loadData(); // Reload data
        },
        error: (error) => {
          console.error('Error deleting question:', error);
          this.snackBar.open('Failed to delete question. Please try again.', 'Close', { duration: 5000 });
        }
      });
    }
  }

  /**
   * Duplicate question
   */
  onDuplicateQuestion(questionId: string): void {
    const question = this.allQuestions$.value.find(q => q.id === questionId);
    if (!question) return;

    this.snackBar.open('Duplicating question...', '', { duration: 2000 });

    // Navigate to new question form with pre-filled data via state
    this.router.navigate(['/manage/questions/new'], {
      state: {
        duplicateFrom: question
      }
    });
  }

  /**
   * Navigate to create new round
   */
  onAddRound(): void {
    this.router.navigate(['/manage/rounds/new']);
  }

  /**
   * Navigate to edit round
   */
  onEditRound(roundId: string): void {
    if (roundId === 'unassigned') return; // Can't edit unassigned section
    this.router.navigate(['/manage/rounds', roundId, 'edit']);
  }

  /**
   * Delete round with confirmation
   */
  onDeleteRound(roundId: string): void {
    if (roundId === 'unassigned') return; // Can't delete unassigned section

    const round = this.allRounds$.value.find(r => r.id === roundId);
    if (!round) return;

    if (confirm(`Are you sure you want to delete the round "${round.name}"? Questions in this round will NOT be deleted.`)) {
      this.roundService.deleteRound(roundId).subscribe({
        next: () => {
          this.snackBar.open('Round deleted successfully', 'Close', { duration: 3000 });
          this.loadData(); // Reload data
        },
        error: (error) => {
          console.error('Error deleting round:', error);
          this.snackBar.open('Failed to delete round. Please try again.', 'Close', { duration: 5000 });
        }
      });
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoundFilter = 'all';
    this.searchTerm$.next('');
    this.selectedRoundFilter$.next('all');
  }

  /**
   * Expand all rounds
   */
  expandAll(): void {
    const rounds = this.filteredRounds$.value;
    rounds.forEach(round => this.expandedRounds.add(round.id));
  }

  /**
   * Collapse all rounds
   */
  collapseAll(): void {
    this.expandedRounds.clear();
  }

  /**
   * TrackBy function for rounds list
   */
  trackByRoundId(index: number, round: RoundWithQuestions): string {
    return round.id;
  }
}
