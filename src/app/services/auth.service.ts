import { inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  getDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { User, UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Observable of Firebase Auth user
  user$: Observable<User | null> = authState(this.auth).pipe(
    map(firebaseUser => firebaseUser ? this.mapFirebaseUser(firebaseUser) : null)
  );

  // Observable of user profile with admin status from Firestore
  userProfile$: Observable<UserProfile | null> = authState(this.auth).pipe(
    switchMap(firebaseUser => {
      if (!firebaseUser) {
        return of(null);
      }
      const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      return docData(userDocRef).pipe(
        map(profile => profile as UserProfile),
        catchError(() => of(null))
      );
    })
  );

  // Observable boolean indicating if user is authenticated
  isAuthenticated$: Observable<boolean> = this.user$.pipe(
    map(user => !!user)
  );

  // Observable boolean indicating if user is admin
  isAdmin$: Observable<boolean> = this.userProfile$.pipe(
    map(profile => profile?.isAdmin ?? false)
  );

  // Observable boolean indicating if user is viewer (or admin, who is implicitly a viewer)
  isViewer$: Observable<boolean> = this.userProfile$.pipe(
    map(profile => profile?.isViewer === true || profile?.isAdmin === true)
  );

  /**
   * Sign in with Google using redirect (avoids COOP issues)
   */
  async signInWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(this.auth, provider);
      // User will be redirected to Google, then back to the app
      // handleRedirectResult() should be called on app initialization
    } catch (error: any) {
      console.error('Sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle redirect result after returning from Google sign-in
   * Call this in app initialization (e.g., app.component.ts or login component)
   */
  async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.auth);
      if (result?.user) {
        // Check if user profile exists in Firestore
        const userDocRef = doc(this.firestore, `users/${result.user.uid}`);
        const userDocSnapshot = await getDoc(userDocRef);

        if (!userDocSnapshot.exists()) {
          // User not pre-created, deny access
          await this.signOut();
          alert('Access denied: Your account has not been created yet. Please contact an administrator.');
          return;
        }

        // User exists, redirect to quiz start
        await this.router.navigate(['/quiz/start']);
      }
    } catch (error: any) {
      console.error('Redirect result error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out and redirect to login
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  /**
   * Map Firebase User to our User interface
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || 'Anonymous',
      photoURL: firebaseUser.photoURL || ''
    };
  }

  /**
   * Handle authentication errors with user-friendly messages
   */
  private handleAuthError(error: any): Error {
    let message = 'An error occurred during sign-in';

    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Sign-in was cancelled';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your connection and try again';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      message = 'An account already exists with this email';
    } else if (error.code === 'auth/popup-blocked') {
      message = 'Pop-up was blocked. Please allow pop-ups for this site';
    }

    return new Error(message);
  }
}
