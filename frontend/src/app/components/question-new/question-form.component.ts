import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl} from '@angular/forms';
import {Router, ActivatedRoute} from '@angular/router';
import {QuestionService} from '../../services/question.service';
import {CommonModule} from '@angular/common';
import {Question, Answer, Round} from '@quiz/shared'; // Ensure Question type includes 'order'
import {DragDropModule, CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {finalize, switchMap, tap} from 'rxjs/operators';

// Import Angular Material Modules
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RoundService} from '../../services/round.service';
import {MatSelectModule} from '@angular/material/select';

@Component({
  selector: 'app-question-form',
  standalone: true,
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.scss'],
  imports: [
    CommonModule, ReactiveFormsModule, DragDropModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatCheckboxModule, MatIconModule, MatToolbarModule, MatProgressBarModule, MatSelectModule
  ]
})
export class QuestionFormComponent implements OnInit {
  questionForm: FormGroup;
  isEditMode = false;
  questionId: string | null = null;
  isLoading = false;
  answerFilesToUpload = new Map<number, File>();
  answerImagePreviews = new Map<number, string | ArrayBuffer | null>();
  existingAnswerImages = new Map<number, { url: string | null, mimeType: string | null }>();
  answerIds = new Map<number, string>();
  // Property to hold available rounds
  allRounds: Round[] = [];

  explanationImageFile: File | null = null;
  explanationImagePreview: string | ArrayBuffer | null = null;
  existingExplanationImageUrl: string | null = null;


  constructor(
    private fb: FormBuilder,
    private questionService: QuestionService,
    private roundService: RoundService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      category: ['', Validators.required],
      introduction: ['', Validators.required],
      // Add the order control for the Question itself
      order: [0, [Validators.required, Validators.min(0)]], // Default to 0, add validation
      explanation: [''],
      roundId: [null],
      answers: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadAllRounds();
    this.questionId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.questionId;
    this.isLoading = this.isEditMode;

    if (this.isEditMode && this.questionId) {
      this.loadQuestionData(this.questionId);
    } else {
      // For new questions, you might want to fetch the current count
      // to set a default order, e.g., count + 1.
      // For simplicity, we default to 0 here.
      this.addAnswer();
    }
  }

  // Fetch all rounds for the dropdown
  loadAllRounds(): void {
    this.roundService.getAllRounds().subscribe({
      next: (rounds) => {
        this.allRounds = rounds.sort((a,b) => a.name.localeCompare(b.name)); // Sort alphabetically
        console.log('Loaded rounds:', this.allRounds);
      },
      error: (err) => {
        console.error("Error loading rounds:", err);
        this.snackBar.open('Could not load rounds for selection.', 'Close', { duration: 3000 });
      }
    });
  }

  loadQuestionData(id: string): void {
    this.questionService.getQuestionById(id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (question) => {
          // Patch the main question data, including the new 'order' field
          this.questionForm.patchValue({
            text: question.text,
            category: question.category ?? '', // Patch category
            introduction: question.introduction ?? '', // Patch introduction
            order: question.order ?? 0, // Patch order, default to 0 if null/undefined
            explanation: question.explanation ?? '',
            roundId: question.round?.id ?? null // Patch roundId, default to null
          });

          // **** Load Existing Explanation Image ****
          this.explanationImageFile = null; // Reset file
          this.explanationImagePreview = null;
          this.existingExplanationImageUrl = null;
          if (question.image && typeof question.image === 'object' && (question.image as any).type === 'Buffer' && Array.isArray((question.image as any).data) && question.imageMimeType) {
            try {
              const bytes: number[] = (question.image as any).data;
              const binaryString = bytes.map(byte => String.fromCharCode(byte)).join('');
              const base64String = btoa(binaryString);
              const imageUrl = `data:${question.imageMimeType};base64,${base64String}`;
              this.existingExplanationImageUrl = imageUrl;
              this.explanationImagePreview = imageUrl; // Set preview
              console.log('Loaded existing explanation image.');
            } catch (e) {
              console.error(`Error processing question image buffer:`, e);
            }
          }
          // **** END Load Image ****

          // --- Answer loading logic remains the same ---
          const sortedAnswers = question.answers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          this.answers.clear();
          this.answerFilesToUpload.clear();
          this.answerImagePreviews.clear();
          this.existingAnswerImages.clear();
          this.answerIds.clear();
          sortedAnswers.forEach((answer, index) => {
            this.answers.push(this.createAnswer(answer.text, answer.isCorrect, index));
            let imageUrl: string | null = null;
            if (answer.image && typeof answer.image === 'object' && (answer.image as any).type === 'Buffer' && Array.isArray((answer.image as any).data)) {
              try {
                const bytes: number[] = (answer.image as any).data;
                const binaryString = bytes.map(byte => String.fromCharCode(byte)).join('');
                const base64String = btoa(binaryString);
                imageUrl = `data:${answer.imageMimeType};base64,${base64String}`;
              } catch (e) {
                console.error(`Error processing image buffer for answer index ${index}:`, e);
              }
            }
            if (imageUrl && answer.imageMimeType) {
              this.existingAnswerImages.set(index, {url: imageUrl, mimeType: answer.imageMimeType});
              this.answerImagePreviews.set(index, imageUrl);
            }
            if (answer.id) {
              this.answerIds.set(index, answer.id);
            }
          });
          // --- End Answer loading ---
        },
        error: (error) => {
          console.error('Error loading question:', error);
          this.router.navigate(['/manage/questions']);
        }
      });
  }

  createAnswer(text: string = '', isCorrect: boolean = false, order: number | null = null): FormGroup {
    const newOrder = order ?? this.answers.length;
    return this.fb.group({
      text: [text, Validators.required],
      isCorrect: [isCorrect],
      order: [newOrder, Validators.required]
    });
  }

  addAnswer(): void { /* ... unchanged ... */
    this.answers.push(this.createAnswer());
  }

  removeAnswer(index: number): void { /* ... unchanged ... */
    if (!confirm('Are you sure you want to remove this answer? This cannot be undone.')) {
      return;
    }
    this.answers.removeAt(index);
    this.answerFilesToUpload.delete(index);
    this.answerImagePreviews.delete(index);
    this.existingAnswerImages.delete(index);
    this.answerIds.delete(index);
    this.renumberStateMaps(index);
    this.updateOrderIndices();
  }

  clearAnswerImage(index: number, fileInputId: string): void {
    this.answerFilesToUpload.delete(index);
    this.answerImagePreviews.delete(index);
    this.existingAnswerImages.delete(index);
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    console.log(`Cleared image for answer index ${index}`);
  }

  renumberStateMaps(removedIndex: number): void { /* ... unchanged ... */
    const maxIndex = this.answers.length + 1;
    for (let i = removedIndex + 1; i < maxIndex; i++) {
      if (this.answerFilesToUpload.has(i)) this.answerFilesToUpload.set(i - 1, this.answerFilesToUpload.get(i)!);
      this.answerFilesToUpload.delete(i);
      if (this.answerImagePreviews.has(i)) this.answerImagePreviews.set(i - 1, this.answerImagePreviews.get(i)!);
      this.answerImagePreviews.delete(i);
      if (this.existingAnswerImages.has(i)) this.existingAnswerImages.set(i - 1, this.existingAnswerImages.get(i)!);
      this.existingAnswerImages.delete(i);
      if (this.answerIds.has(i)) this.answerIds.set(i - 1, this.answerIds.get(i)!);
      this.answerIds.delete(i);
    }
  }

  get answers(): FormArray { /* ... unchanged ... */
    return this.questionForm.get('answers') as FormArray;
  }

  updateOrderIndices(): void { /* ... unchanged ... */
    this.answers.controls.forEach((control, index) => {
      if (control instanceof FormGroup && control.get('order')) {
        control.patchValue({order: index}, {emitEvent: false});
      }
    });
    console.log('Order indices updated:', this.answers.value);
  }

  drop(event: CdkDragDrop<AbstractControl[]>): void { /* ... unchanged ... */
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    moveItemInArray(this.answers.controls, previousIndex, currentIndex);
    const tempFile = this.answerFilesToUpload.get(previousIndex);
    const tempPreview = this.answerImagePreviews.get(previousIndex);
    const tempExisting = this.existingAnswerImages.get(previousIndex);
    const tempId = this.answerIds.get(previousIndex);
    if (previousIndex < currentIndex) {
      for (let i = previousIndex; i < currentIndex; i++) {
        this.answerFilesToUpload.set(i, this.answerFilesToUpload.get(i + 1)!);
        this.answerImagePreviews.set(i, this.answerImagePreviews.get(i + 1)!);
        this.existingAnswerImages.set(i, this.existingAnswerImages.get(i + 1)!);
        this.answerIds.set(i, this.answerIds.get(i + 1)!);
      }
    } else {
      for (let i = previousIndex; i > currentIndex; i--) {
        this.answerFilesToUpload.set(i, this.answerFilesToUpload.get(i - 1)!);
        this.answerImagePreviews.set(i, this.answerImagePreviews.get(i - 1)!);
        this.existingAnswerImages.set(i, this.existingAnswerImages.get(i - 1)!);
        this.answerIds.set(i, this.answerIds.get(i - 1)!);
      }
    }
    if (tempFile !== undefined) this.answerFilesToUpload.set(currentIndex, tempFile); else this.answerFilesToUpload.delete(currentIndex);
    if (tempPreview !== undefined) this.answerImagePreviews.set(currentIndex, tempPreview); else this.answerImagePreviews.delete(currentIndex);
    if (tempExisting !== undefined) this.existingAnswerImages.set(currentIndex, tempExisting); else this.existingAnswerImages.delete(currentIndex);
    if (tempId !== undefined) this.answerIds.set(currentIndex, tempId); else this.answerIds.delete(currentIndex);
    this.updateOrderIndices();
    this.answers.updateValueAndValidity();
    console.log("State after drop: ", {files: this.answerFilesToUpload, previews: this.answerImagePreviews, ids: this.answerIds})
  }

  onAnswerFileSelected(event: Event, index: number): void { /* ... unchanged ... */
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      if (file.size > 10 * 1024 * 1024) {
        alert('File is too large (max 10MB).');
        element.value = '';
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert('Invalid file type (only jpg, png, gif allowed).');
        element.value = '';
        return;
      }
      this.answerFilesToUpload.set(index, file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.answerImagePreviews.set(index, reader.result);
      };
      reader.readAsDataURL(file);
      console.log("File selected for index:", index, file);
    } else {
      this.answerFilesToUpload.delete(index);
      const existing = this.existingAnswerImages.get(index);
      this.answerImagePreviews.set(index, existing ? existing.url : null);
      element.value = '';
    }
  }

  clearImage(index: number, fileInputId: string): void { /* ... unchanged ... */
    this.answerFilesToUpload.delete(index);
    this.answerImagePreviews.delete(index);
    this.existingAnswerImages.delete(index);
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onExplanationFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      // Validation (optional but recommended)
      if (file.size > 10 * 1024 * 1024) { // Example: 10MB limit
        this.snackBar.open('Explanation image file is too large (max 10MB).', 'Close', { duration: 3000 });
        element.value = ''; // Reset file input
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        this.snackBar.open('Invalid file type (only jpg, png, gif allowed).', 'Close', { duration: 3000 });
        element.value = ''; // Reset file input
        return;
      }

      // Store file and generate preview
      this.explanationImageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.explanationImagePreview = reader.result;
      };
      reader.readAsDataURL(file);
      console.log("Explanation image selected:", file.name);
    } else {
      // No file selected or selection cancelled
      this.explanationImageFile = null;
      // Revert preview to existing image if editing, otherwise clear it
      this.explanationImagePreview = this.existingExplanationImageUrl;
      element.value = ''; // Ensure input is cleared if selection was cancelled
    }
  }

  clearExplanationImage(fileInputId: string): void {
    this.explanationImageFile = null;
    this.explanationImagePreview = null;
    this.existingExplanationImageUrl = null; // Also clear existing on explicit clear
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Reset the file input element
    }
    console.log('Explanation image cleared.');
  }

  // --- Submit Logic ---
  onSubmit(): void {
    if (this.questionForm.invalid) {
      this.markAllAsTouched(this.questionForm);
      this.snackBar.open('Please correct the errors in the form.', 'Close', { duration: 3000 });
      return;
    }
    const hasCorrectAnswer = this.answers.value.some((ans: Answer) => ans.isCorrect);
    if (!hasCorrectAnswer) {
      this.snackBar.open('At least one answer must be marked as correct.', 'Close', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    // 1. Prepare question data - now includes the question's order
    const formValue = this.questionForm.getRawValue();
    const questionData: Partial<Question> = {
      text: formValue.text,
      order: formValue.order,
      category: formValue.category,
      introduction: formValue.introduction,
      explanation: formValue.explanation,
      // Explicitly handle roundId - send null if empty string or null selected
      roundId: formValue.roundId || null,
      answers: formValue.answers.map((ans: Answer, index: number) => ({
        id: this.answerIds.get(index),
        text: ans.text,
        isCorrect: ans.isCorrect,
        order: ans.order,
      }))
    };

    console.log('Submitting base question data:', questionData);

    // 2. Call the combined save method from the service
    this.questionService.saveQuestionAndUploadImages(
      questionData,
      this.answerFilesToUpload, // Map of answer files <index, File>
      this.explanationImageFile, // Single explanation file or null
      this.isEditMode,
      this.questionId
    )
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (result) => {
          console.log('Question and images processed successfully.', result);
          this.snackBar.open(`Question ${this.isEditMode ? 'updated' : 'added'} successfully!`, 'Ok', { duration: 2500 });
          this.router.navigate(['/manage/questions']);
        },
        error: (error) => {
          console.error('Error during question save or image upload:', error);
          this.snackBar.open(`Error: ${error.message || 'Could not save question/upload images.'}`, 'Close', { duration: 4000 });
        }
      });
  }

  // --- End Submit Logic ---

  markAllAsTouched(formGroup: FormGroup | FormArray): void { /* ... unchanged ... */
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      control.updateValueAndValidity();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markAllAsTouched(control);
      }
    });
  }

  cancel(): void { /* ... unchanged ... */
    this.router.navigate(['/manage/questions']);
  }
}
