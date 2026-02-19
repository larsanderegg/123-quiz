import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RoundService } from '../../services/round.service';
import { StorageService } from '../../services/storage.service';
import { ThemeService } from '../../services/theme.service';
import { Round, RoundInput, QuizTheme, DEFAULT_THEME } from '../../models';
import { finalize, take, switchMap, of, forkJoin } from 'rxjs';

// Import Angular Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';


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
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSliderModule,
    MatSelectModule,
  ],
  templateUrl: './round-form.component.html',
  styleUrls: ['./round-form.component.scss']
})
export class RoundFormComponent implements OnInit, OnDestroy {
  roundForm: FormGroup;
  isEditMode = false;
  roundId: string | null = null;
  isLoading = false;

  // File upload properties
  audioFile: File | null = null;
  backgroundImageFile: File | null = null;

  // Preview properties
  audioPreview: string | null = null;
  backgroundPreview: string | ArrayBuffer | null = null;

  // Existing URL properties (for edit mode)
  existingAudioUrl: string | null = null;
  existingBackgroundUrl: string | null = null;

  // Upload progress tracking
  audioUploadProgress = 0;
  backgroundUploadProgress = 0;
  isUploadingAudio = false;
  isUploadingBackground = false;

  // Image metadata
  backgroundImageDimensions: { width: number; height: number } | null = null;
  audioDuration: number | null = null;

  // Theme properties
  showThemeEditor = false;
  availableFonts = [
    { value: "'Berlin Sans FB', sans-serif", label: 'Berlin Sans FB (Default)' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: "'Times New Roman', serif", label: 'Times New Roman' },
    { value: "'Comic Sans MS', cursive", label: 'Comic Sans MS' },
    { value: "'Courier New', monospace", label: 'Courier New' },
  ];

  constructor(
    private fb: FormBuilder,
    private roundService: RoundService,
    private storageService: StorageService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.roundForm = this.fb.group({
      name: ['', Validators.required],
      order: [0, [Validators.required, Validators.min(0)]],
      theme: this.fb.group({
        primaryColor: [''],
        secondaryColor: [''],
        backgroundColor: [''],
        categoryHeaderColor: [''],
        questionColor: [''],
        answerColor: [''],
        correctHighlightColor: [''],
        incorrectDimColor: [''],
        fontFamily: [''],
        categoryFontSize: [''],
        questionFontSize: [''],
        answerFontSize: [''],
        backgroundOpacity: [0],
        answerCardOpacity: [0],
        padding: [''],
        answerSpacing: ['']
      })
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

  ngOnDestroy(): void {
    // Clean up any blob URLs to prevent memory leaks
    if (this.audioPreview && this.audioPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.audioPreview);
    }
  }

  loadRoundData(id: string): void {
    this.roundService.getRoundById(id)
      .pipe(
        take(1),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (round) => {
          this.roundForm.patchValue({
            name: round.name,
            order: round.order ?? 0,
          });

          // Load existing URLs for preview
          this.existingAudioUrl = round.audioUrl || round.audioPath || null;
          this.existingBackgroundUrl = round.backgroundImageUrl || round.backgroundImagePath || null;

          // Set previews
          this.audioPreview = this.existingAudioUrl;
          this.backgroundPreview = this.existingBackgroundUrl;

          // Load theme if it exists
          if (round.theme) {
            this.showThemeEditor = true;
            const themeData = {
              primaryColor: round.theme.primaryColor || '',
              secondaryColor: round.theme.secondaryColor || '',
              backgroundColor: round.theme.backgroundColor || '',
              categoryHeaderColor: round.theme.categoryHeaderColor || '',
              questionColor: round.theme.questionColor || '',
              answerColor: round.theme.answerColor || '',
              correctHighlightColor: round.theme.correctHighlightColor || '',
              incorrectDimColor: round.theme.incorrectDimColor || '',
              fontFamily: round.theme.fontFamily || '',
              categoryFontSize: round.theme.categoryFontSize || '',
              questionFontSize: round.theme.questionFontSize || '',
              answerFontSize: round.theme.answerFontSize || '',
              backgroundOpacity: round.theme.backgroundOpacity !== undefined ? round.theme.backgroundOpacity * 100 : 0,
              answerCardOpacity: round.theme.answerCardOpacity !== undefined ? round.theme.answerCardOpacity * 100 : 0,
              padding: round.theme.padding || '',
              answerSpacing: round.theme.answerSpacing || ''
            };
            this.roundForm.patchValue({ theme: themeData });
          }
        },
        error: (error) => {
          console.error('Error loading round:', error);
          this.snackBar.open('Error loading round data.', 'Close', { duration: 3000 });
          this.router.navigate(['/manage/rounds']);
        }
      });
  }

  onAudioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'];
      if (!validTypes.includes(file.type)) {
        this.snackBar.open('Invalid audio file type. Please select an mp3, wav, ogg, aac, or m4a file.', 'Close', { duration: 4000 });
        return;
      }

      // Validate file size (max 20MB)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        this.snackBar.open('Audio file is too large. Maximum size is 20MB.', 'Close', { duration: 4000 });
        return;
      }

      this.audioFile = file;

      // Create preview URL for audio player
      const audioUrl = URL.createObjectURL(file);
      this.audioPreview = audioUrl;

      // Extract audio duration
      const audioElement = new Audio(audioUrl);
      audioElement.addEventListener('loadedmetadata', () => {
        this.audioDuration = audioElement.duration;
      });
    }
  }

  onBackgroundFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.snackBar.open('Invalid image file type. Please select a jpg, png, gif, or webp file.', 'Close', { duration: 4000 });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.snackBar.open('Image file is too large. Maximum size is 5MB.', 'Close', { duration: 4000 });
        return;
      }

      this.backgroundImageFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.backgroundPreview = e.target?.result || null;

        // Extract image dimensions
        if (this.backgroundPreview && typeof this.backgroundPreview === 'string') {
          const img = new Image();
          img.onload = () => {
            this.backgroundImageDimensions = {
              width: img.width,
              height: img.height
            };

            // Show warnings for suboptimal dimensions
            if (img.width < 800) {
              this.snackBar.open('Warning: Image width is less than 800px. It may appear pixelated on large screens.', 'Ok', { duration: 5000 });
            } else if (img.width < 1920) {
              console.warn(`Background image is ${img.width}x${img.height}. Recommended: 1920x1080 or higher for best quality.`);
            }
          };
          img.src = this.backgroundPreview;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  clearAudioFile(): void {
    // Revoke object URL if it exists
    if (this.audioPreview && this.audioPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.audioPreview);
    }
    this.audioFile = null;
    this.audioPreview = this.existingAudioUrl;
    this.audioDuration = null;
  }

  clearBackgroundFile(): void {
    this.backgroundImageFile = null;
    this.backgroundPreview = this.existingBackgroundUrl;
    this.backgroundImageDimensions = null;
  }

  onSubmit(): void {
    if (this.roundForm.invalid) {
      this.roundForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const roundData = this.roundForm.getRawValue();

    // Process theme data - convert opacity percentages to 0-1 range and remove empty fields
    if (roundData.theme) {
      const themeData: Partial<QuizTheme> = {};
      const rawTheme = roundData.theme;

      // Only include non-empty theme properties
      if (rawTheme.primaryColor) themeData.primaryColor = rawTheme.primaryColor;
      if (rawTheme.secondaryColor) themeData.secondaryColor = rawTheme.secondaryColor;
      if (rawTheme.backgroundColor) themeData.backgroundColor = rawTheme.backgroundColor;
      if (rawTheme.categoryHeaderColor) themeData.categoryHeaderColor = rawTheme.categoryHeaderColor;
      if (rawTheme.questionColor) themeData.questionColor = rawTheme.questionColor;
      if (rawTheme.answerColor) themeData.answerColor = rawTheme.answerColor;
      if (rawTheme.correctHighlightColor) themeData.correctHighlightColor = rawTheme.correctHighlightColor;
      if (rawTheme.incorrectDimColor) themeData.incorrectDimColor = rawTheme.incorrectDimColor;
      if (rawTheme.fontFamily) themeData.fontFamily = rawTheme.fontFamily;
      if (rawTheme.categoryFontSize) themeData.categoryFontSize = rawTheme.categoryFontSize;
      if (rawTheme.questionFontSize) themeData.questionFontSize = rawTheme.questionFontSize;
      if (rawTheme.answerFontSize) themeData.answerFontSize = rawTheme.answerFontSize;
      if (rawTheme.padding) themeData.padding = rawTheme.padding;
      if (rawTheme.answerSpacing) themeData.answerSpacing = rawTheme.answerSpacing;

      // Convert opacity percentages (0-100) to decimal (0-1)
      if (rawTheme.backgroundOpacity > 0) {
        themeData.backgroundOpacity = rawTheme.backgroundOpacity / 100;
      }
      if (rawTheme.answerCardOpacity > 0) {
        themeData.answerCardOpacity = rawTheme.answerCardOpacity / 100;
      }

      // Validate theme if any properties are set
      if (Object.keys(themeData).length > 0) {
        const validation = this.themeService.validateTheme(themeData);
        if (!validation.valid) {
          this.snackBar.open(`Theme validation failed: ${validation.errors.join(', ')}`, 'Close', { duration: 5000 });
          this.isLoading = false;
          return;
        }
        roundData.theme = themeData;
      } else {
        // No theme properties set, remove theme from data
        delete roundData.theme;
      }
    }

    // Upload files first (if any), then save round
    const uploadTasks: { audio?: any, background?: any } = {};

    if (this.audioFile) {
      const audioPath = this.storageService.generateUniquePath(this.audioFile.name, 'audio/rounds');
      this.isUploadingAudio = true;
      this.audioUploadProgress = 0;
      uploadTasks.audio = this.storageService.uploadFileWithProgress(
        this.audioFile,
        audioPath,
        (progress) => {
          this.audioUploadProgress = progress;
        }
      );
    }

    if (this.backgroundImageFile) {
      const imagePath = this.storageService.generateUniquePath(this.backgroundImageFile.name, 'images/rounds');
      this.isUploadingBackground = true;
      this.backgroundUploadProgress = 0;
      uploadTasks.background = this.storageService.uploadFileWithProgress(
        this.backgroundImageFile,
        imagePath,
        (progress) => {
          this.backgroundUploadProgress = progress;
        }
      );
    }

    // If there are files to upload, upload them first
    if (Object.keys(uploadTasks).length > 0) {
      forkJoin({
        audioUrl: uploadTasks.audio || of(this.existingAudioUrl),
        backgroundImageUrl: uploadTasks.background || of(this.existingBackgroundUrl)
      }).pipe(
        finalize(() => {
          this.isUploadingAudio = false;
          this.isUploadingBackground = false;
          this.audioUploadProgress = 0;
          this.backgroundUploadProgress = 0;
        }),
        switchMap((uploadResults) => {
          // Update round data with uploaded URLs
          if (uploadResults.audioUrl) {
            roundData.audioUrl = uploadResults.audioUrl;
          }
          if (uploadResults.backgroundImageUrl) {
            roundData.backgroundImageUrl = uploadResults.backgroundImageUrl;
          }

          // Delete old files if we uploaded new ones
          const deleteTasks = [];
          if (this.audioFile && this.existingAudioUrl) {
            const oldPath = this.storageService.getPathFromUrl(this.existingAudioUrl);
            if (oldPath) {
              deleteTasks.push(this.storageService.deleteFile(oldPath));
            }
          }
          if (this.backgroundImageFile && this.existingBackgroundUrl) {
            const oldPath = this.storageService.getPathFromUrl(this.existingBackgroundUrl);
            if (oldPath) {
              deleteTasks.push(this.storageService.deleteFile(oldPath));
            }
          }

          // Delete old files in background (don't wait for them)
          if (deleteTasks.length > 0) {
            forkJoin(deleteTasks).subscribe({
              next: () => console.log('Old files deleted'),
              error: (err) => console.error('Error deleting old files:', err)
            });
          }

          // Save round
          return this.isEditMode && this.roundId
            ? this.roundService.updateRound(this.roundId, roundData)
            : this.roundService.createRound(roundData as RoundInput);
        }),
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: (savedRound) => {
          console.log(`Round ${this.isEditMode ? 'updated' : 'added'} successfully:`, savedRound);
          this.snackBar.open(`Round ${this.isEditMode ? 'updated' : 'saved'} successfully!`, 'Ok', { duration: 2500 });
          this.router.navigate(['/manage/rounds']);
        },
        error: (error) => {
          console.error(`Error ${this.isEditMode ? 'updating' : 'adding'} round:`, error);

          // Handle specific Firebase Storage errors
          let errorMessage = `Error ${this.isEditMode ? 'updating' : 'saving'} round.`;

          if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Storage quota exceeded. Please upgrade your Firebase plan or delete unused files.';
          } else if (error.code === 'storage/unauthorized') {
            errorMessage = 'Permission denied. Please check your authentication and try again.';
          } else if (error.code === 'storage/retry-limit-exceeded') {
            errorMessage = 'Upload failed after multiple retries. Please check your internet connection and try again.';
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload was canceled.';
          } else if (error.message) {
            errorMessage = `Error: ${error.message}`;
          }

          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        }
      });
    } else {
      // No new files to upload, just save the round
      const saveObservable = this.isEditMode && this.roundId
        ? this.roundService.updateRound(this.roundId, roundData)
        : this.roundService.createRound(roundData as RoundInput);

      saveObservable
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (savedRound) => {
            console.log(`Round ${this.isEditMode ? 'updated' : 'added'} successfully:`, savedRound);
            this.snackBar.open(`Round ${this.isEditMode ? 'updated' : 'saved'} successfully!`, 'Ok', { duration: 2500 });
            this.router.navigate(['/manage/rounds']);
          },
          error: (error) => {
            console.error(`Error ${this.isEditMode ? 'updating' : 'adding'} round:`, error);

            // Handle Firestore errors
            let errorMessage = `Error ${this.isEditMode ? 'updating' : 'saving'} round.`;

            if (error.code === 'permission-denied') {
              errorMessage = 'Permission denied. You may not have access to perform this operation.';
            } else if (error.code === 'unavailable') {
              errorMessage = 'Service temporarily unavailable. Please try again.';
            } else if (error.message) {
              errorMessage = `Error: ${error.message}`;
            }

            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          }
        });
    }
  }

  cancel(): void {
    this.router.navigate(['/manage/rounds']);
  }

  // Helper method to get file size in readable format
  getFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Theme helper methods
  resetTheme(): void {
    this.roundForm.patchValue({
      theme: {
        primaryColor: '',
        secondaryColor: '',
        backgroundColor: '',
        categoryHeaderColor: '',
        questionColor: '',
        answerColor: '',
        correctHighlightColor: '',
        incorrectDimColor: '',
        fontFamily: '',
        categoryFontSize: '',
        questionFontSize: '',
        answerFontSize: '',
        backgroundOpacity: 0,
        answerCardOpacity: 0,
        padding: '',
        answerSpacing: ''
      }
    });
    this.snackBar.open('Theme reset to defaults', 'Ok', { duration: 2000 });
  }

  formatOpacityLabel(value: number): string {
    return `${Math.round(value)}%`;
  }

  formatAudioDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getImageDimensionsText(): string {
    if (this.backgroundImageDimensions) {
      return `${this.backgroundImageDimensions.width} × ${this.backgroundImageDimensions.height}`;
    }
    return '';
  }

  isSubmitDisabled(): boolean {
    return this.roundForm.invalid || this.isLoading || this.isUploadingAudio || this.isUploadingBackground;
  }

  get themeFormGroup(): FormGroup {
    return this.roundForm.get('theme') as FormGroup;
  }
}
