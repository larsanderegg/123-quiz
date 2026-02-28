export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface UserProfile extends User {
  isAdmin: boolean;
  isViewer: boolean;
  createdAt: Date;
  lastLogin: Date;
}
