export const ADMIN_EMP_ID = 'ADMIN001';

export enum GameStatus {
  REGISTRATION = 'REGISTRATION',
  PAIRED = 'PAIRED',
  ENDED = 'ENDED'
}

export interface User {
  id: string;
  name: string;
  employeeId: string;
  password: string;
  avatarId: number;
  childId?: string; // The ID of the person this user is the "Mom" for
  momId?: string;   // The ID of the person who is the "Mom" for this user
  guessedMomId?: string; // ID of the user they guessed was their mom
  score: number;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export interface Task {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  status: TaskStatus;
  createdAt: number;
  rejectionReason?: string;
  feedback?: string; // Feedback from the child when completing the task
  points: number;
}

export interface AppState {
  status: GameStatus;
  users: User[];
  tasks: Task[];
  currentUser: User | null;
  endGameMessage?: string;
}