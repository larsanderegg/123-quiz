import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, switchMap, forkJoin, of, map} from 'rxjs'; // Import forkJoin, of, switchMap, map
import {Question, Answer} from '@quiz/shared'; // Ensure Answer type is imported

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  // Assuming answers endpoint is relative or configured
  private questionsApiUrl = 'http://localhost:3000/questions';
  private answersApiUrl = 'http://localhost:3000/answers'; // <-- New API endpoint base for answers

  constructor(private http: HttpClient) {
  }

  // --- Existing Question Methods ---
  getAllQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(this.questionsApiUrl);
  }

  getAllQuestionsByRound(roundId: string | null): Observable<Question[]> {
    if (!roundId) {
      return of([]); // Return empty observable if no roundId is provided
    }
    return this.http.get<Question[]>(`${this.questionsApiUrl}/round/${roundId}`);
  }

  getQuestionById(id: string): Observable<Question> {
    return this.http.get<Question>(`${this.questionsApiUrl}/${id}`);
  }

  createQuestion(question: Partial<Question>): Observable<Question> {
    // This will now typically send answers without images initially
    return this.http.post<Question>(this.questionsApiUrl, question);
  }

  updateQuestion(id: string, question: Partial<Question>): Observable<Question> {
    // This will now typically send answers without images initially
    return this.http.put<Question>(`${this.questionsApiUrl}/${id}`, question);
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.questionsApiUrl}/${id}`);
  }

  // --- New Method to Update Answer with Image ---
  updateAnswerWithImage(answerId: string, file: File): Observable<Answer> {
    const formData = new FormData();

    // --- Add Log Here ---
    console.log(`[Service] Preparing to upload file for Answer ID: ${answerId}`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      // fileObject: file // Avoid logging the whole object, focus on metadata
    });
    // --- End Log ---

    formData.append('image', file, file.name);
    // Append other answer data if the backend needs it (the example only showed file)
    // formData.append('text', answerData.text); // Example if needed

    console.log(file)
    // Use PUT request to the specific answer endpoint
    return this.http.put<Answer>(`${this.answersApiUrl}/${answerId}`, formData);
    // NOTE: If your backend expects JSON *and* a file, the approach is more complex
    // involving multipart/related or sending metadata separately.
    // Assuming the backend handles FormData directly on the PUT /answers/:id endpoint.
  }

  // --- Helper to upload multiple images after question save ---
  // This is complex: it assumes the 'savedQuestion' contains answers with IDs
  uploadAnswerImages(
    savedQuestion: Question,
    filesToUpload: Map<number, File> // Map<original_form_index, File>
  ): Observable<Answer[]> {

    const uploadObservables: Observable<Answer>[] = [];

    filesToUpload.forEach((file, index) => {
      // Find the corresponding answer ID from the saved question based on the original index/order
      const answer = savedQuestion.answers.find(a => a.order === index);
      if (answer && answer.id) {
        console.log(`Uploading image for answer index ${index}, ID: ${answer.id}`);
        uploadObservables.push(this.updateAnswerWithImage(answer.id, file));
      } else {
        console.warn(`Could not find saved answer or ID for index ${index} to upload image.`);
      }
    });

    // If no images to upload, return an observable of an empty array
    if (uploadObservables.length === 0) {
      return of([]);
    }

    // Execute all upload calls in parallel
    return forkJoin(uploadObservables);
  }

  uploadQuestionExplanationImage(questionId: string, file: File): Observable<Question> {
    const formData = new FormData();
    // Use a specific field name, e.g., 'explanationImage', or just 'image' if the backend expects that
    formData.append('image', file, file.name);

    console.log(`[Service] Uploading explanation image for Question ID: ${questionId}`);

    // Assuming a PUT request to an endpoint like /questions/:id/image
    // Adjust endpoint and HTTP method (PUT/POST) based on your backend API design
    const url = `${this.questionsApiUrl}/${questionId}/image`;
    return this.http.put<Question>(url, formData);
  }

  saveQuestionAndUploadImages(
    questionData: Partial<Question>,
    answerFiles: Map<number, File>,
    explanationFile: File | null,
    editMode: boolean,
    questionId: string | null
  ): Observable<any> { // Return type might vary based on what you need last

    // 1. Save/Update Question Text & Answers (without images)
    const questionSave$ = editMode && questionId
      ? this.updateQuestion(questionId, questionData)
      : this.createQuestion(questionData);

    return questionSave$.pipe(
      switchMap((savedQuestion: Question) => {
        console.log("Question saved/updated:", savedQuestion);
        const qId = savedQuestion.id; // Get the ID

        // Update answerIds map needed for answer image uploads
        const answerIds = new Map<number, string>();
        savedQuestion.answers.forEach(ans => {
          if (ans.id && ans.order !== undefined) {
            answerIds.set(ans.order, ans.id);
          }
        });

        // 2. Prepare Answer Image Upload Observables
        const answerUploadOps$: Observable<Answer>[] = [];
        answerFiles.forEach((file, index) => {
          const answerId = answerIds.get(index);
          if (answerId) {
            console.log(`Queueing image upload for answer index ${index}, ID: ${answerId}`);
            answerUploadOps$.push(this.updateAnswerWithImage(answerId, file));
          } else {
            console.warn(`Could not find saved answer ID for index ${index} to upload image.`);
          }
        });
        const answerUploads$ = answerUploadOps$.length > 0 ? forkJoin(answerUploadOps$) : of([]); // Use forkJoin for parallel uploads

        // 3. Prepare Explanation Image Upload Observable (if file exists)
        const explanationUpload$ = (explanationFile && qId)
          ? this.uploadQuestionExplanationImage(qId, explanationFile)
          : of(null); // If no file or no ID, emit null

        // 4. Combine Answer and Explanation Uploads
        // Run answer uploads and explanation upload in parallel after question is saved
        return forkJoin({
          answersResult: answerUploads$,
          explanationResult: explanationUpload$
        }).pipe(
          map(results => ({ // Return combined results or just the saved question
            savedQuestion,
            answerImageUploads: results.answersResult,
            explanationImageUpload: results.explanationResult
          }))
        );
      })
    );
  }
}
