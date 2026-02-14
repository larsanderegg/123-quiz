import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router, NavigationEnd } from '@angular/router'; // Import NavigationEnd
import { CommonModule, Location } from '@angular/common'; // Import Location
import { forkJoin, interval, of, Subscription, filter, takeWhile, distinctUntilChanged, map, switchMap, tap } from 'rxjs'; // Import operators
// Removed first() operator as we need ongoing updates

import { QuestionService } from '../../services/question.service';
import { LedControlMode, Question } from '@quiz/shared';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RoundService } from '../../services/round.service';
import { LedControlService } from '../../services/led-control.service';

interface QuizState {
  roundId: string | null;
  questionIndex: number;
  revealStep: number;
}

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './quiz-player.component.html',
  styleUrls: ['./quiz-player.component.scss']
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  questions: Question[] = [];
  currentQuestion: Question | null = null;
  showCorrectHighlight = false;
  showExplanation = false;
  currentRevealStep = 0;
  currentQuestionIndex = 0;
  isLoading = true;
  quizFinished = false;
  // isInitialLoad = true; // Replaced by distinctUntilChanged logic

  activeRoundBackgroundImage: string | null = null;
  activeRoundId: string | null = null; // Store active round ID

  isBlinkingStepActive = false;
  blinkingState = new Map<number, boolean>();
  private blinkingIntervalSubscription: Subscription | null = null;
  private blinkingSound: HTMLAudioElement;

  private currentlyBlinkingIndex: number = -1;
  private blinkingDirection: 'forward' | 'backward' = 'forward';

  private dataLoadSub: Subscription | undefined;
  // private queryParamSub: Subscription | undefined; // Replaced by combined subscription
  private routeSub: Subscription | undefined; // Main subscription to handle route changes
  private ledControlSub: Subscription | undefined;
  private navigationTriggeredByApp = false; // Flag to prevent loops

  private revealSound1: HTMLAudioElement;
  private revealSound2: HTMLAudioElement;
  private revealSound3: HTMLAudioElement;
  private playRevealSoundIndex = 0;

  private correctAnswerSound: HTMLAudioElement;


  constructor(
    private questionService: QuestionService,
    private roundService: RoundService,
    private ledControlService: LedControlService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location // Inject Location service
  ) {
    // Sounds setup remains the same...
    this.revealSound1 = new Audio('assets/sounds/reveal1.mp3');
    this.revealSound1.load();
    this.revealSound2 = new Audio('assets/sounds/reveal2.mp3');
    this.revealSound2.load();
    this.revealSound3 = new Audio('assets/sounds/reveal3.mp3');
    this.revealSound3.load();
    this.blinkingSound = new Audio('assets/sounds/answerTimeV2.wav');
    this.blinkingSound.load();
    this.correctAnswerSound = new Audio('assets/sounds/answered.mp3');
  }

  ngOnInit(): void {
    this.ledControlService.changeLedMode(LedControlMode.OFF);

    // Combine paramMap (for roundId) and queryParamMap (for question/step) handling
    this.routeSub = this.route.paramMap.pipe(
      switchMap(params => {
        const roundId = params.get('roundId');
        // Store roundId when it changes
        if (this.activeRoundId !== roundId) {
          this.activeRoundId = roundId;
          this.isLoading = true; // Trigger loading when round changes
          console.log(`Round ID changed to: ${roundId}`);
        }
        // Combine with query params observable for this roundId
        return this.route.queryParamMap.pipe(
          map(queryParams => ({
            roundId: this.activeRoundId, // Use stored roundId
            questionIndex: queryParams.get('question') ? parseInt(queryParams.get('question')!, 10) : 0,
            revealStep: queryParams.get('step') ? parseInt(queryParams.get('step')!, 10) : 0
          }))
        );
      }),
      // Use distinctUntilChanged to only react when state *actually* changes
      distinctUntilChanged((prev, curr) =>
        prev.roundId === curr.roundId &&
        prev.questionIndex === curr.questionIndex &&
        prev.revealStep === curr.revealStep
      ),
      tap(state => console.log('[Route State Change Detected]', state))
    ).subscribe(state => {
      // If the state change was triggered by internal navigation (advanceQuizStep), ignore it.
      if (this.navigationTriggeredByApp) {
        console.log('[Route State Change Ignored] Triggered by app.');
        this.navigationTriggeredByApp = false; // Reset flag
        return;
      }

      console.log('[Route State Change Handling] Updating component state from URL.');
      // Update component state based on URL
      this.handleStateUpdate(state);
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.dataLoadSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.ledControlSub?.unsubscribe();
    this.blinkingIntervalSubscription?.unsubscribe();

    this.stopBlinking(); // Ensure blinking stops
    this.ledControlService.changeLedMode(LedControlMode.OFF).subscribe({ // Ensure LEDs turn off
      next: () => console.log('LEDs turned off on destroy'),
      error: (err) => console.error('Failed to turn off LEDs on destroy:', err)
    });
  }

  // Central method to handle state updates from URL or internal logic
  handleStateUpdate(state: QuizState): void {
    const { roundId, questionIndex, revealStep } = state;

    // Check if data needs loading/reloading (only if roundId changes or questions aren't loaded)
    if (!this.questions.length || this.activeRoundId !== roundId) {
      if (roundId) {
        this.loadQuizData(roundId, questionIndex, revealStep);
      } else {
        console.error("No Round ID found in state.");
        this.isLoading = false;
        this.quizFinished = true; // Or navigate away
      }
    } else {
      // Data already loaded, just update question/step if different
      if (this.currentQuestionIndex !== questionIndex) {
        // Need to change question (without reloading all data)
        this.goToQuestionInternal(questionIndex); // Update internally, don't update URL again
        // Now set the correct step for the new question
        this.setRevealStep(revealStep, false); // Update internally, don't update URL again
      } else if (this.currentRevealStep !== revealStep) {
        // Only step changed
        this.setRevealStep(revealStep, false); // Update internally, don't update URL again
      }
      // If index and step are the same, do nothing (already handled by distinctUntilChanged)
    }
  }


  loadQuizData(roundId: string, initialIndex: number, initialStep: number): void {
    console.log(`[loadQuizData] Loading for round ${roundId}, index ${initialIndex}, step ${initialStep}`);
    this.isLoading = true; // Ensure loading state is set
    this.quizFinished = false;
    this.activeRoundBackgroundImage = null;
    this.stopBlinking();
    // Don't update LED state here, wait for setRevealStep

    const roundObs$ = this.roundService.getRoundById(roundId);
    const questionsObs$ = this.questionService.getAllQuestionsByRound(roundId);

    // Unsubscribe from previous load if any
    this.dataLoadSub?.unsubscribe();

    this.dataLoadSub = forkJoin({ round: roundObs$, questions: questionsObs$ }).subscribe({
      next: ({ round, questions }) => {
        console.log(`[loadQuizData] Data received for round ${roundId}.`);
        if (round && round.backgroundImagePath) {
          this.activeRoundBackgroundImage = round.backgroundImagePath;
        } else {
          this.activeRoundBackgroundImage = null;
        }

        // --- Process Questions --- (Keep existing processing logic)
        questions.forEach(question => {
          // ... image processing ...
          let processedQuestionImage: string | null = null;
          if (question.image && typeof question.image === 'object' && (question.image as any).type === 'Buffer' && Array.isArray((question.image as any).data) && question.imageMimeType) {
            try {
              const bytes: number[] = (question.image as any).data;
              const binaryString = bytes.map(byte => String.fromCharCode(byte)).join('');
              processedQuestionImage = btoa(binaryString);
            } catch (e) { console.error(`Error processing question image buffer:`, e); }
          }
          question.image = processedQuestionImage as any;

          question.answers.forEach(answer => {
            let processedImage: string | null = null;
            if (answer.image && typeof answer.image === 'object' /* ... buffer check ... */) {
              try {
                const bytes: number[] = (answer.image as any).data;
                const binaryString = bytes.map(byte => String.fromCharCode(byte)).join('');
                processedImage = btoa(binaryString);
              } catch (e) { console.error(`Error processing image buffer`, e); }
            } else if (answer.image) { processedImage = null; }
            answer.image = processedImage as any;
          });
        });
        this.questions = questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // --- End Process Questions ---

        if (this.questions.length > 0) {
          // Validate initial index
          const validInitialIndex = (initialIndex >= 0 && initialIndex < this.questions.length) ? initialIndex : 0;

          // Set the question *without* triggering side effects like URL update or step reset yet
          this.currentQuestionIndex = validInitialIndex;
          this.currentQuestion = this.questions[this.currentQuestionIndex];
          if (this.currentQuestion) {
            this.currentQuestion.answers = [...this.currentQuestion.answers]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .slice(0, 3);
          } else {
            console.error(`Failed to set currentQuestion for index ${validInitialIndex}`);
            this.quizFinished = true; // Handle error case
          }


          // Now validate and set the initial step *without* updating URL
          const maxAnswers = this.currentQuestion ? Math.min(this.currentQuestion.answers.length, 3) : 0;
          const maxStepOverall = 2 + maxAnswers + 2 + 1; // Intro(0)+Q(1)+A1..A3(2..4)+Blink(5)+Correct(6)+Explanation(7) -> Max index 7
          const validInitialStep = Math.max(0, Math.min(initialStep, maxStepOverall));
          console.log(`[loadQuizData] Setting initial step to ${validInitialStep} (validated from ${initialStep})`);
          this.setRevealStep(validInitialStep, false); // Set step state internally, updates LEDs
        } else {
          console.log(`[loadQuizData] No questions found for round ${roundId}.`);
          this.quizFinished = true;
          this.updateLedState(); // Update LEDs for finished state
        }

        this.isLoading = false; // Loading finished
        console.log(`[loadQuizData] Finished loading for round ${roundId}.`);
      },
      error: (err) => {
        console.error('Error loading quiz data:', err);
        this.isLoading = false;
        this.quizFinished = true;
        this.activeRoundBackgroundImage = null;
        this.updateLedState();
      }
    });
  }

  // Renamed - internal update, doesn't trigger URL navigation
  goToQuestionInternal(index: number): void {
    this.stopBlinking();
    this.showExplanation = false;
    this.showCorrectHighlight = false;
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index;
      this.currentQuestion = this.questions[this.currentQuestionIndex];
      this.currentQuestion.answers = [...this.currentQuestion.answers]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, 3);
      // Reset step to 0 internally, no URL update
      this.setRevealStep(0, false);
    } else {
      this.quizFinished = true;
      this.currentQuestion = null;
      this.currentRevealStep = 0;
      this.showCorrectHighlight = false;
      this.updateLedState(); // Update LED for finished state
    }
    // No URL update call here
  }

  // Sets the internal step state and updates LEDs
  // The updateUrl flag determines if *this specific call* should trigger URL navigation
  setRevealStep(step: number, updateUrl: boolean = true): void {
    if (!this.currentQuestion) {
      console.warn("[setRevealStep] No current question, cannot set step.");
      return;
    }

    const maxAnswers = Math.min(this.currentQuestion.answers.length, 3);
    const questionStepNumber = 1;
    const firstAnswerStepNumber = 2;
    const lastAnswerStepNumber = firstAnswerStepNumber + maxAnswers - 1;
    const blinkingStepNumber = firstAnswerStepNumber + maxAnswers;
    const correctShownStepNumber = blinkingStepNumber + 1;
    const explanationStepNumber = correctShownStepNumber + 1;
    const maxStep = explanationStepNumber;

    const newStep = Math.max(0, Math.min(step, maxStep));
    const oldStep = this.currentRevealStep;

    if (oldStep === newStep) {
      console.log(`[setRevealStep] Step ${newStep} is already active.`);
      // Ensure LEDs are correct even if step doesn't change (e.g., on initial load)
      this.updateLedState();
      return; // No change needed
    }

    console.log(`[setRevealStep] Changing step from ${oldStep} to ${newStep}. Update URL: ${updateUrl}`);

    if (this.isBlinkingStepActive && newStep !== blinkingStepNumber) {
      this.stopBlinking();
    }

    this.currentRevealStep = newStep; // Update internal state

    // --- Sound logic --- (Should be based on transition)
    if (this.currentRevealStep > oldStep) { // Only play sounds when advancing
      if (this.currentRevealStep >= firstAnswerStepNumber && this.currentRevealStep <= lastAnswerStepNumber) {
        this.playRevealSound();
      } else if (this.currentRevealStep === blinkingStepNumber) {
        this.startBlinking();
      } else if (this.currentRevealStep === correctShownStepNumber) {
        this.correctAnswerSound.currentTime = 0;
        this.correctAnswerSound.play().catch(error => console.warn("Correct answer audio playback failed:", error));
      }
    }
    // --- End sound logic ---


    this.isBlinkingStepActive = (this.currentRevealStep === blinkingStepNumber);
    this.showCorrectHighlight = (this.currentRevealStep >= correctShownStepNumber);
    this.showExplanation = (this.currentRevealStep === explanationStepNumber);

    console.log(`[setRevealStep] State updated: Step=${this.currentRevealStep}, Blinking=${this.isBlinkingStepActive}, Highlight=${this.showCorrectHighlight}, Explanation=${this.showExplanation}`);

    this.updateLedState(); // Update LEDs based on the new state

    // Trigger URL update only if requested by the caller (e.g., advanceQuizStep)
    if (updateUrl) {
      this.updateUrlState();
    }
  }

  private updateLedState(): void {
    // This method logic remains the same as before
    // It reads the current component state (isLoading, quizFinished, currentRevealStep, etc.)
    // and determines the target LedControlMode.
    let targetMode = LedControlMode.OFF;

    if (this.isLoading || this.quizFinished || !this.currentQuestion) {
      targetMode = LedControlMode.OFF;
    } else {
      const maxAnswers = Math.min(this.currentQuestion.answers.length, 3);
      const firstAnswerStepNumber = 2;
      const blinkingStepNumber = firstAnswerStepNumber + maxAnswers;
      const correctShownStepNumber = blinkingStepNumber + 1;
      const explanationStepNumber = correctShownStepNumber + 1;

      switch (this.currentRevealStep) {
        case 0: // Introduction
        case 1: // Question
          targetMode = LedControlMode.OFF;
          break;
        case 2: // Answer 1 revealed
          targetMode = LedControlMode.ONE;
          break;
        case 3: // Answer 2 revealed
          targetMode = LedControlMode.TWO;
          break;
        case 4: // Answer 3 revealed (only if exists)
          if (maxAnswers >= 3) targetMode = LedControlMode.THREE;
          else if (maxAnswers === 2) targetMode = LedControlMode.TWO;
          else targetMode = LedControlMode.ONE; // Fallback if only 1 answer? Or OFF?
          break;
        case blinkingStepNumber:
          targetMode = LedControlMode.BLINK;
          break;
        case correctShownStepNumber:
          const correctIndex = this.currentQuestion.answers.findIndex(a => a.isCorrect);
          if (correctIndex === 0) targetMode = LedControlMode.ONE;
          else if (correctIndex === 1) targetMode = LedControlMode.TWO;
          else if (correctIndex === 2) targetMode = LedControlMode.THREE;
          else targetMode = LedControlMode.OFF;
          break;
        case explanationStepNumber:
          targetMode = LedControlMode.OFF;
          break;
        default:
          targetMode = LedControlMode.OFF;
      }
    }
    console.log(`[LED Control] Determined target mode: ${targetMode} for step ${this.currentRevealStep}`);
    this.ledControlSub?.unsubscribe();
    this.ledControlSub = this.ledControlService.changeLedMode(targetMode).subscribe({
      next: (success) => console.log(`[LED Control] Change to ${targetMode} successful: ${success}`),
      error: (err) => console.error(`[LED Control] Failed to change mode to ${targetMode}:`, err)
    });
  }


  playRevealSound(): void {
    // This method logic remains the same (using currentRevealStep which is now updated)
    const sounds = [this.revealSound1, this.revealSound2, this.revealSound3];
    const soundIndex = this.currentRevealStep - 2; // Step 2 -> index 0, Step 3 -> index 1, Step 4 -> index 2
    console.log(`[playRevealSound] Called for step ${this.currentRevealStep}, calculated soundIndex: ${soundIndex}`);
    if (soundIndex >= 0 && soundIndex < sounds.length) {
      const soundToPlay = sounds[soundIndex];
      soundToPlay.currentTime = 0;
      soundToPlay.play().catch(error => console.warn("Reveal audio playback failed:", error));
    } else {
      console.warn(`[playRevealSound] Invalid soundIndex ${soundIndex} for step ${this.currentRevealStep}`);
    }
  }


  playBlinkingSound(): void {
    this.blinkingSound.currentTime = 0;
    this.blinkingSound.play().catch(error => console.warn("Blinking audio playback failed:", error));
  }


  startBlinking(): void {
    // This method logic remains the same
    if (this.blinkingIntervalSubscription || !this.currentQuestion) return;
    this.playBlinkingSound();
    this.isBlinkingStepActive = true;
    this.blinkingState.clear();
    this.currentlyBlinkingIndex = -1;
    this.blinkingDirection = 'forward';
    const blinkIntervalMs = 500;
    const numberOfAnswers = Math.min(this.currentQuestion.answers.length, 3);
    if (numberOfAnswers <= 0) { this.stopBlinking(); return; }
    this.blinkingIntervalSubscription = interval(blinkIntervalMs).pipe(
      takeWhile(() => this.isBlinkingStepActive)
    ).subscribe(() => {
      let nextIndex;
      if (numberOfAnswers === 1) { nextIndex = 0; }
      else {
        if (this.blinkingDirection === 'forward') {
          nextIndex = this.currentlyBlinkingIndex + 1;
          if (nextIndex >= numberOfAnswers) {
            nextIndex = numberOfAnswers - 2; this.blinkingDirection = 'backward'; if (nextIndex < 0) nextIndex = 0;
          }
        } else { // backward
          nextIndex = this.currentlyBlinkingIndex - 1;
          if (nextIndex < 0) {
            nextIndex = (numberOfAnswers > 1) ? 1 : 0; this.blinkingDirection = 'forward';
          }
        }
      }
      this.blinkingState.clear();
      if (nextIndex >= 0 && nextIndex < numberOfAnswers) {
        this.blinkingState.set(nextIndex, true); this.currentlyBlinkingIndex = nextIndex;
      } else { this.currentlyBlinkingIndex = -1; }
    });
  }

  stopBlinking(): void {
    // This method logic remains the same
    this.blinkingIntervalSubscription?.unsubscribe();
    this.blinkingIntervalSubscription = null;
    this.isBlinkingStepActive = false;
    this.blinkingState.clear();
    this.currentlyBlinkingIndex = -1;
    this.blinkingSound.pause();
    this.blinkingSound.currentTime = 0;
  }

  isAnswerBlinking(index: number): boolean {
    // This method logic remains the same
    return this.blinkingState.get(index) ?? false;
  }

  // This method now ONLY updates the URL, assuming internal state is already set
  updateUrlState(): void {
    // Check if necessary data is available
    if (this.activeRoundId === null || this.currentQuestionIndex === undefined || this.currentRevealStep === undefined) {
      console.warn("[updateUrlState] Attempted to update URL with invalid state.");
      return;
    }

    const queryParams: Params = { question: this.currentQuestionIndex, step: this.currentRevealStep };
    const url = this.router.createUrlTree(
      ['/quiz', this.activeRoundId, 'play'], // Base path with roundId
      { queryParams: queryParams } // Query parameters
    ).toString();

    console.log(`[updateUrlState] Navigating to URL: ${url}`);

    // Set flag to indicate this navigation originates from the app logic
    this.navigationTriggeredByApp = true;

    // Use Location.go to change URL without full Angular navigation cycle, pushing state
    this.location.go(url);

    // Alternatively, use router.navigate with replaceUrl: false (pushes state)
    // this.router.navigate([], {
    //   relativeTo: this.route,
    //   queryParams: queryParams,
    //   replaceUrl: false, // <--- IMPORTANT: Push state to history
    //   queryParamsHandling: 'merge' // Keep existing roundId param
    // }).then(success => {
    //     if (!success) {
    //         console.error("[updateUrlState] Router navigation failed.");
    //         this.navigationTriggeredByApp = false; // Reset flag on failure
    //     }
    // }).catch(err => {
    //     console.error("[updateUrlState] Router navigation error:", err);
    //     this.navigationTriggeredByApp = false; // Reset flag on error
    // });
  }


  // This method is called by user interaction (click)
  advanceQuizStep(): void {
    console.log('[advanceQuizStep] Click detected! Current step:', this.currentRevealStep);
    if (this.isLoading || this.quizFinished || !this.currentQuestion) {
      console.log('[advanceQuizStep] Guarded.');
      return;
    }

    const maxAnswers = Math.min(this.currentQuestion.answers.length, 3);
    const explanationStepNumber = 2 + maxAnswers + 2; // e.g., 2+3+2 = 7
    const maxStepOverall = explanationStepNumber;

    let nextStep = this.currentRevealStep + 1;
    let nextQuestionIndex = this.currentQuestionIndex;

    if (this.isBlinkingStepActive) {
      const correctShownStepNumber = 2 + maxAnswers + 1; // Step 6
      nextStep = correctShownStepNumber;
      // Note: stopBlinking() is handled by setRevealStep when moving away from blinking step
    }

    if (nextStep > maxStepOverall) {
      // Move to next question
      nextQuestionIndex = this.currentQuestionIndex + 1;
      // Check if quiz finished
      if (nextQuestionIndex >= this.questions.length) {
        this.quizFinished = true;
        this.updateLedState(); // Update LED for finished state
        // Optionally navigate away or just show finished message
        console.log('[advanceQuizStep] Quiz finished.');
        // Clear URL state?
        // this.location.go(this.router.createUrlTree(['/quiz', this.activeRoundId, 'play']).toString());
        return; // Stop processing
      }
      nextStep = 0; // Start at introduction step for the new question
      // Update internal state first for the new question and step 0
      this.goToQuestionInternal(nextQuestionIndex); // This calls setRevealStep(0, false) internally
    } else {
      // Advance step within the current question
      this.setRevealStep(nextStep, false); // Update internal state first
    }

    // Update URL to reflect the new state (question index and step)
    this.updateUrlState(); // This pushes the new state to history
  }


  navigateToStart(): void {
    console.log('navigateToStart called');
    this.router.navigate(['/quiz/start']); // Navigate away
  }
}
