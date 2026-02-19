import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';

/**
 * Storage Service - Firebase Cloud Storage Integration
 *
 * Handles file uploads, downloads, and deletion for Cloud Storage.
 *
 * @note Requires Firebase Blaze (pay-as-you-go) plan for Cloud Storage.
 */
@Injectable({
    providedIn: 'root'
})
export class StorageService {
    constructor(private storage: Storage) {}

    /**
     * Upload a file to Cloud Storage with progress tracking
     * @param file The file to upload
     * @param path The storage path (e.g., 'audio/rounds/filename.mp3')
     * @param progressCallback Optional callback to track upload progress (0-100)
     * @returns Observable<string> Download URL of the uploaded file
     */
    uploadFileWithProgress(
        file: File,
        path: string,
        progressCallback?: (progress: number) => void
    ): Observable<string> {
        const storageRef = ref(this.storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Observable<string>(observer => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Calculate and report progress
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload is ${progress}% done`);
                    if (progressCallback) {
                        progressCallback(progress);
                    }
                },
                (error) => {
                    // Handle upload errors
                    console.error('Upload error:', error);
                    observer.error(error);
                },
                async () => {
                    // Upload completed successfully, get download URL
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        observer.next(downloadURL);
                        observer.complete();
                    } catch (error) {
                        console.error('Error getting download URL:', error);
                        observer.error(error);
                    }
                }
            );
        });
    }

    /**
     * Upload a file to Cloud Storage
     * @param file The file to upload
     * @param path The storage path (e.g., 'audio/rounds/filename.mp3')
     * @returns Observable<string> Download URL of the uploaded file
     */
    uploadFile(file: File, path: string): Observable<string> {
        const storageRef = ref(this.storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Observable<string>(observer => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Progress can be tracked here if needed
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload is ${progress}% done`);
                },
                (error) => {
                    // Handle upload errors
                    console.error('Upload error:', error);
                    observer.error(error);
                },
                async () => {
                    // Upload completed successfully, get download URL
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        observer.next(downloadURL);
                        observer.complete();
                    } catch (error) {
                        console.error('Error getting download URL:', error);
                        observer.error(error);
                    }
                }
            );
        });
    }

    /**
     * Upload a Blob to Cloud Storage
     * @param blob The blob to upload
     * @param path The storage path
     * @param contentType The MIME type of the content
     * @returns Observable<string> Download URL of the uploaded blob
     */
    uploadBlob(blob: Blob, path: string, contentType: string): Observable<string> {
        const storageRef = ref(this.storage, path);
        const metadata = {
            contentType: contentType
        };
        const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

        return new Observable<string>(observer => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload is ${progress}% done`);
                },
                (error) => {
                    console.error('Upload error:', error);
                    observer.error(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        observer.next(downloadURL);
                        observer.complete();
                    } catch (error) {
                        console.error('Error getting download URL:', error);
                        observer.error(error);
                    }
                }
            );
        });
    }

    /**
     * Delete a file from Cloud Storage
     * @param path The storage path of the file to delete
     * @returns Observable<void>
     */
    deleteFile(path: string): Observable<void> {
        const storageRef = ref(this.storage, path);
        return from(deleteObject(storageRef));
    }

    /**
     * Extract the storage path from a Firebase Storage download URL
     * @param url The download URL
     * @returns The storage path or null if invalid
     */
    getPathFromUrl(url: string): string | null {
        try {
            // Firebase Storage URLs have format:
            // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
            const urlObj = new URL(url);

            if (!urlObj.hostname.includes('firebasestorage.googleapis.com')) {
                return null;
            }

            // Extract path from /o/{encodedPath}
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
            if (!pathMatch) {
                return null;
            }

            // Decode the path (it's URL encoded)
            const encodedPath = pathMatch[1];
            const decodedPath = decodeURIComponent(encodedPath);

            return decodedPath;
        } catch (error) {
            console.error('Error parsing storage URL:', error);
            return null;
        }
    }

    /**
     * Generate a unique filename for storage
     * @param originalName The original filename
     * @param prefix Optional folder prefix (e.g., 'audio/rounds')
     * @returns A unique storage path
     */
    generateUniquePath(originalName: string, prefix: string = ''): string {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = originalName.split('.').pop();
        const filename = `${timestamp}_${randomString}.${extension}`;

        return prefix ? `${prefix}/${filename}` : filename;
    }
}
