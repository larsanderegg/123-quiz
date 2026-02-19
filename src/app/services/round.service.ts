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
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, switchMap, of, map, take } from 'rxjs';
import { Round, RoundInput } from '../models';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class RoundService {
  private roundsCollection: ReturnType<typeof collection>;

  constructor(
    private firestore: Firestore,
    private storageService: StorageService
  ) {
    // Initialize collection in constructor (proper injection context)
    this.roundsCollection = collection(this.firestore, 'rounds');
  }

  /**
   * Get all rounds ordered by order field
   */
  getAllRounds(): Observable<Round[]> {
    const q = query(this.roundsCollection, orderBy('order', 'asc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Round[]>).pipe(take(1));
  }

  /**
   * Get a single round by ID
   */
  getRoundById(id: string): Observable<Round> {
    const roundDoc = doc(this.firestore, `rounds/${id}`);
    return (docData(roundDoc, { idField: 'id' }) as Observable<Round>).pipe(take(1));
  }

  /**
   * Create a new round
   */
  createRound(roundData: RoundInput): Observable<Round> {
    const data = {
      ...roundData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return from(addDoc(this.roundsCollection, data)).pipe(
      switchMap(docRef => this.getRoundById(docRef.id))
    );
  }

  /**
   * Update an existing round
   */
  updateRound(id: string, roundData: Partial<Round>): Observable<Round> {
    const roundDoc = doc(this.firestore, `rounds/${id}`);
    const data = {
      ...roundData,
      updatedAt: Timestamp.now()
    };

    return from(updateDoc(roundDoc, data)).pipe(
      switchMap(() => this.getRoundById(id))
    );
  }

  /**
   * Delete a round and its associated files
   */
  deleteRound(id: string): Observable<void> {
    return this.getRoundById(id).pipe(
      take(1), // Complete after first emission
      switchMap(round => {
        const deleteOps: Observable<any>[] = [];

        // Delete audio file from storage if exists
        if (round?.audioUrl) {
          const path = this.storageService.getPathFromUrl(round.audioUrl);
          if (path) {
            deleteOps.push(this.storageService.deleteFile(path));
          }
        }

        // Delete background image from storage if exists
        if (round?.backgroundImageUrl) {
          const path = this.storageService.getPathFromUrl(round.backgroundImageUrl);
          if (path) {
            deleteOps.push(this.storageService.deleteFile(path));
          }
        }

        // Delete the round document
        const roundDoc = doc(this.firestore, `rounds/${id}`);
        deleteOps.push(from(deleteDoc(roundDoc)));

        // Execute all deletions
        if (deleteOps.length > 0) {
          return from(Promise.all(deleteOps.map(obs => obs.toPromise())));
        }
        return of(null);
      }),
      map(() => void 0)
    );
  }

  /**
   * Upload audio file for a round
   */
  uploadAudioFile(roundId: string, file: File): Observable<Round> {
    const path = this.storageService.generateUniquePath(file.name, 'audio/rounds');

    return this.storageService.uploadFile(file, path).pipe(
      switchMap(audioUrl => this.updateRound(roundId, { audioUrl }))
    );
  }

  /**
   * Upload background image for a round
   */
  uploadBackgroundImage(roundId: string, file: File): Observable<Round> {
    const path = this.storageService.generateUniquePath(file.name, 'images/rounds');

    return this.storageService.uploadFile(file, path).pipe(
      switchMap(backgroundImageUrl => this.updateRound(roundId, { backgroundImageUrl }))
    );
  }

  /**
   * Create round with file uploads
   */
  createRoundWithFiles(
    roundData: RoundInput,
    audioFile: File | null,
    backgroundImage: File | null
  ): Observable<Round> {
    // First create the round
    return this.createRound(roundData).pipe(
      switchMap(savedRound => {
        const uploadOps: Observable<Round>[] = [];

        // Upload audio file if provided
        if (audioFile) {
          uploadOps.push(this.uploadAudioFile(savedRound.id, audioFile));
        }

        // Upload background image if provided
        if (backgroundImage) {
          uploadOps.push(this.uploadBackgroundImage(savedRound.id, backgroundImage));
        }

        // If no files to upload, return the saved round
        if (uploadOps.length === 0) {
          return of(savedRound);
        }

        // Execute uploads sequentially and return the final round
        return uploadOps.reduce(
          (acc$, upload$) => acc$.pipe(switchMap(() => upload$)),
          of(savedRound)
        );
      })
    );
  }

  /**
   * Update round with optional file uploads
   */
  updateRoundWithFiles(
    id: string,
    roundData: Partial<Round>,
    audioFile: File | null,
    backgroundImage: File | null
  ): Observable<Round> {
    // First update the round data
    return this.updateRound(id, roundData).pipe(
      switchMap(updatedRound => {
        const uploadOps: Observable<Round>[] = [];

        // Upload new audio file if provided
        if (audioFile) {
          uploadOps.push(this.uploadAudioFile(id, audioFile));
        }

        // Upload new background image if provided
        if (backgroundImage) {
          uploadOps.push(this.uploadBackgroundImage(id, backgroundImage));
        }

        // If no files to upload, return the updated round
        if (uploadOps.length === 0) {
          return of(updatedRound);
        }

        // Execute uploads sequentially and return the final round
        return uploadOps.reduce(
          (acc$, upload$) => acc$.pipe(switchMap(() => upload$)),
          of(updatedRound)
        );
      })
    );
  }
}
