import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, switchMap, forkJoin, of, map, take } from 'rxjs';
import { Question, QuestionInput, Answer, AnswerInput } from '../models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private questionsCollection: ReturnType<typeof collection>;
  private answersCollection: ReturnType<typeof collection>;

  constructor(
    private firestore: Firestore,
    private storageService: StorageService
  ) {
    // Initialize collections in constructor (proper injection context)
    this.questionsCollection = collection(this.firestore, 'questions');
    this.answersCollection = collection(this.firestore, 'answers');
  }

  /**
   * Get all questions
   */
  getAllQuestions(): Observable<Question[]> {
    const q = query(this.questionsCollection, orderBy('order', 'asc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Question[]>).pipe(take(1));
  }

  /**
   * Get all questions by round ID
   */
  getAllQuestionsByRound(roundId: string | null): Observable<Question[]> {
    if (!roundId) {
      return of([]);
    }
    // Query without orderBy to avoid composite index requirement
    const q = query(
      this.questionsCollection,
      where('roundId', '==', roundId)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Question[]>).pipe(
      take(1),
      map(questions => questions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    );
  }

  /**
   * Get a single question by ID
   */
  getQuestionById(id: string): Observable<Question> {
    const questionDoc = doc(this.firestore, `questions/${id}`);
    return (docData(questionDoc, { idField: 'id' }) as Observable<Question>).pipe(take(1));
  }

  /**
   * Create a new question
   */
  createQuestion(questionData: QuestionInput): Observable<Question> {
    const data = {
      ...questionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return from(addDoc(this.questionsCollection, data)).pipe(
      switchMap(docRef => this.getQuestionById(docRef.id))
    );
  }

  /**
   * Update an existing question
   */
  updateQuestion(id: string, questionData: Partial<Question>): Observable<Question> {
    const questionDoc = doc(this.firestore, `questions/${id}`);
    const data = {
      ...questionData,
      updatedAt: Timestamp.now()
    };

    return from(updateDoc(questionDoc, data)).pipe(
      switchMap(() => this.getQuestionById(id))
    );
  }

  /**
   * Delete a question and its associated image
   */
  deleteQuestion(id: string): Observable<void> {
    return this.getQuestionById(id).pipe(
      take(1), // Complete after first emission
      switchMap(question => {
        const deleteOps: Observable<any>[] = [];

        // Delete question image from storage if exists
        if (question?.imageUrl) {
          const path = this.storageService.getPathFromUrl(question.imageUrl);
          if (path) {
            deleteOps.push(this.storageService.deleteFile(path));
          }
        }

        // Delete the question document
        const questionDoc = doc(this.firestore, `questions/${id}`);
        deleteOps.push(from(deleteDoc(questionDoc)));

        // Execute all deletions
        return deleteOps.length > 0 ? forkJoin(deleteOps) : of(null);
      }),
      map(() => void 0)
    );
  }

  /**
   * Upload question image and update the question document
   */
  uploadQuestionImage(questionId: string, file: File): Observable<Question> {
    const path = this.storageService.generateUniquePath(file.name, 'images/questions');

    return this.storageService.uploadFile(file, path).pipe(
      switchMap(imageUrl => this.updateQuestion(questionId, { imageUrl }))
    );
  }

  /**
   * Create question with image upload
   */
  createQuestionWithImage(
    questionData: QuestionInput,
    imageFile: File | null
  ): Observable<Question> {
    // First create the question
    return this.createQuestion(questionData).pipe(
      switchMap(savedQuestion => {
        // If there's an image, upload it
        if (imageFile) {
          return this.uploadQuestionImage(savedQuestion.id, imageFile);
        }
        return of(savedQuestion);
      })
    );
  }

  /**
   * Update question with optional image upload
   */
  updateQuestionWithImage(
    id: string,
    questionData: Partial<Question>,
    imageFile: File | null
  ): Observable<Question> {
    // First update the question data
    return this.updateQuestion(id, questionData).pipe(
      switchMap(updatedQuestion => {
        // If there's a new image, upload it
        if (imageFile) {
          return this.uploadQuestionImage(id, imageFile);
        }
        return of(updatedQuestion);
      })
    );
  }

  // ============ Answer Methods ============

  /**
   * Get all answers for a question
   */
  getAnswersByQuestion(questionId: string): Observable<Answer[]> {
    // Query without orderBy to avoid composite index requirement
    const q = query(
      this.answersCollection,
      where('questionId', '==', questionId)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Answer[]>).pipe(
      take(1),
      map(answers => answers.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    );
  }

  /**
   * Create a new answer
   */
  createAnswer(answerData: AnswerInput): Observable<Answer> {
    const data = {
      ...answerData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return from(addDoc(this.answersCollection, data)).pipe(
      switchMap(docRef => {
        const answerDoc = doc(this.firestore, `answers/${docRef.id}`);
        return (docData(answerDoc, { idField: 'id' }) as Observable<Answer>).pipe(take(1));
      })
    );
  }

  /**
   * Update an answer
   */
  updateAnswer(id: string, answerData: Partial<Answer>): Observable<Answer> {
    const answerDoc = doc(this.firestore, `answers/${id}`);
    const data = {
      ...answerData,
      updatedAt: Timestamp.now()
    };

    return from(updateDoc(answerDoc, data)).pipe(
      switchMap(() => {
        return (docData(answerDoc, { idField: 'id' }) as Observable<Answer>).pipe(take(1));
      })
    );
  }

  /**
   * Delete an answer and its associated image
   */
  deleteAnswer(id: string): Observable<void> {
    const answerDoc = doc(this.firestore, `answers/${id}`);

    return (docData(answerDoc, { idField: 'id' }) as Observable<Answer>).pipe(
      take(1), // Complete after first emission
      switchMap(answer => {
        const deleteOps: Observable<any>[] = [];

        // Delete answer image from storage if exists
        if (answer?.imageUrl) {
          const path = this.storageService.getPathFromUrl(answer.imageUrl);
          if (path) {
            deleteOps.push(this.storageService.deleteFile(path));
          }
        }

        // Delete the answer document
        deleteOps.push(from(deleteDoc(answerDoc)));

        return deleteOps.length > 0 ? forkJoin(deleteOps) : of(null);
      }),
      map(() => void 0)
    );
  }

  /**
   * Upload answer image and update the answer document
   */
  uploadAnswerImage(answerId: string, file: File): Observable<Answer> {
    const path = this.storageService.generateUniquePath(file.name, 'images/answers');

    return this.storageService.uploadFile(file, path).pipe(
      switchMap(imageUrl => this.updateAnswer(answerId, { imageUrl }))
    );
  }

  /**
   * Save question with answers and upload images
   * This is a comprehensive method for creating/updating questions with answers and images
   */
  saveQuestionWithAnswers(
    questionData: QuestionInput,
    answers: (AnswerInput & { id?: string })[],
    questionImage: File | null,
    answerImages: Map<number, File>,
    questionId?: string
  ): Observable<{ question: Question; answers: Answer[] }> {
    // Step 1: Save or update the question
    const questionOp$ = questionId
      ? this.updateQuestionWithImage(questionId, questionData, questionImage)
      : this.createQuestionWithImage(questionData, questionImage);

    return questionOp$.pipe(
      switchMap(savedQuestion => {
        // Step 2: Handle answers based on create vs update mode
        if (questionId) {
          // EDIT MODE: Fetch existing answers, update/create/delete as needed
          return this.getAnswersByQuestion(questionId).pipe(
            switchMap(existingAnswers => {
              const existingIds = new Set(existingAnswers.map(a => a.id));
              const newIds = new Set(answers.filter(a => a.id).map(a => a.id));

              // Identify answers to delete (exist in DB but not in form)
              const toDelete = existingAnswers.filter(a => !newIds.has(a.id));

              // Process each answer (create or update)
              const answerOps$ = answers.map((answerData, index) => {
                const answerWithQuestion = {
                  ...answerData,
                  questionId: savedQuestion.id,
                  order: index
                };

                // If answer has an id, update it; otherwise create new
                if (answerData.id) {
                  // Remove id from the update data as updateAnswer takes it separately
                  const { id, ...updateData } = answerWithQuestion;
                  return this.updateAnswer(answerData.id, updateData);
                } else {
                  // Remove id field (which would be undefined) before creating
                  const { id, ...createData } = answerWithQuestion;
                  return this.createAnswer(createData);
                }
              });

              // Combine delete operations with answer save operations
              const deleteOps$ = toDelete.map(answer => this.deleteAnswer(answer.id));
              const allOps$ = [...deleteOps$, ...answerOps$];

              // Handle empty operations
              if (allOps$.length === 0) {
                return of({ question: savedQuestion, answers: [] as Answer[] });
              }

              return forkJoin(allOps$).pipe(
                switchMap((results: any[]) => {
                  // Filter out delete results (void) and keep only Answer objects
                  const savedAnswers = results.filter(r => r !== undefined) as Answer[];

                  // Step 3: Upload answer images
                  const imageUploadOps$ = savedAnswers.map((answer: Answer, index: number) => {
                    const imageFile = answerImages.get(index);
                    if (imageFile && answer.id) {
                      return this.uploadAnswerImage(answer.id, imageFile);
                    }
                    return of(answer);
                  });

                  // Handle empty image uploads
                  if (imageUploadOps$.length === 0) {
                    return of({ question: savedQuestion, answers: savedAnswers });
                  }

                  return forkJoin(imageUploadOps$).pipe(
                    map(finalAnswers => ({
                      question: savedQuestion,
                      answers: finalAnswers
                    }))
                  );
                })
              );
            })
          );
        } else {
          // CREATE MODE: Create all new answers
          const answerOps$ = answers.map((answerData, index) => {
            // Remove id field (which would be undefined) before creating
            const { id, ...answerWithQuestion } = {
              ...answerData,
              questionId: savedQuestion.id,
              order: index
            };
            return this.createAnswer(answerWithQuestion);
          });

          // Handle empty answers array
          if (answerOps$.length === 0) {
            return of({ question: savedQuestion, answers: [] as Answer[] });
          }

          return forkJoin(answerOps$).pipe(
            switchMap(savedAnswers => {
              // Step 3: Upload answer images
              const imageUploadOps$ = savedAnswers.map((answer, index) => {
                const imageFile = answerImages.get(index);
                if (imageFile && answer.id) {
                  return this.uploadAnswerImage(answer.id, imageFile);
                }
                return of(answer);
              });

              // Handle empty image uploads
              if (imageUploadOps$.length === 0) {
                return of({ question: savedQuestion, answers: savedAnswers });
              }

              return forkJoin(imageUploadOps$).pipe(
                map(finalAnswers => ({
                  question: savedQuestion,
                  answers: finalAnswers
                }))
              );
            })
          );
        }
      })
    );
  }
}
