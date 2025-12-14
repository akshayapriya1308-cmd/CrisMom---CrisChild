import { AppState, GameStatus, Task, User, TaskStatus } from '../types';

const STORAGE_KEY = 'crismom_app_data';

const getInitialState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    // Migration: ensure users have score
    if (parsed.users) {
      parsed.users = parsed.users.map((u: any) => ({
        ...u,
        score: u.score ?? 0
      }));
    }
    // Migration: ensure tasks have points
    if (parsed.tasks) {
      parsed.tasks = parsed.tasks.map((t: any) => ({
        ...t,
        points: t.points ?? 10
      }));
    }
    return parsed;
  }
  return {
    status: GameStatus.REGISTRATION,
    users: [],
    tasks: [],
    currentUser: null,
  };
};

export const loadState = (): AppState => {
  return getInitialState();
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const registerUser = (name: string, employeeId: string, password: string): User => {
  const state = loadState();
  if (state.users.find(u => u.employeeId === employeeId)) {
    throw new Error('Employee ID already registered');
  }
  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    employeeId,
    password,
    avatarId: Math.floor(Math.random() * 1000),
    score: 0
  };
  state.users.push(newUser);
  state.currentUser = newUser;
  saveState(state);
  return newUser;
};

export const performPairing = () => {
  const state = loadState();
  if (state.users.length < 2) throw new Error("Need at least 2 users to play.");
  
  // Shuffle users
  const shuffled = [...state.users].sort(() => Math.random() - 0.5);
  
  // Circular assignment: User i is Mom to User i+1
  for (let i = 0; i < shuffled.length; i++) {
    const mom = shuffled[i];
    const child = shuffled[(i + 1) % shuffled.length];
    
    // Update original user objects in state
    const originalMom = state.users.find(u => u.id === mom.id)!;
    originalMom.childId = child.id;
    
    const originalChild = state.users.find(u => u.id === child.id)!;
    originalChild.momId = mom.id;
  }
  
  state.status = GameStatus.PAIRED;
  saveState(state);
  return state;
};

export const createTask = (fromId: string, toId: string, content: string) => {
  const state = loadState();
  const newTask: Task = {
    id: crypto.randomUUID(),
    fromId,
    toId,
    content,
    status: TaskStatus.PENDING,
    createdAt: Date.now(),
    points: 10 // Default points per task
  };
  state.tasks.push(newTask);
  saveState(state);
  return newTask;
};

export const updateTaskStatus = (taskId: string, status: TaskStatus, reason?: string, feedback?: string) => {
  const state = loadState();
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    // If completing a task that wasn't previously completed, award points
    if (status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      const child = state.users.find(u => u.id === task.toId);
      if (child) {
        child.score = (child.score || 0) + (task.points || 10);
        
        // Sync current user session if it matches the child
        if (state.currentUser?.id === child.id) {
          state.currentUser.score = child.score;
        }
      }
    }

    task.status = status;
    if (reason) task.rejectionReason = reason;
    if (feedback) task.feedback = feedback;
    saveState(state);
  }
  return state;
};

export const submitGuess = (userId: string, guessedMomId: string) => {
  const state = loadState();
  const user = state.users.find(u => u.id === userId);
  if (user) {
    user.guessedMomId = guessedMomId;
    // Update current user in session if it matches
    if (state.currentUser?.id === userId) {
      state.currentUser.guessedMomId = guessedMomId;
    }
    saveState(state);
  }
  return state;
};

export const endGame = (message: string) => {
  const state = loadState();
  state.status = GameStatus.ENDED;
  state.endGameMessage = message;
  saveState(state);
  return state;
};

export const resetGame = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}