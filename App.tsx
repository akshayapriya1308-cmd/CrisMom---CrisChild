import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  ShieldCheck, 
  Send, 
  RefreshCcw, 
  LogOut,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User as UserIcon,
  Baby,
  Play,
  Check,
  Lock,
  StopCircle,
  MessageCircle,
  HelpCircle,
  Trophy,
  Medal,
  Star,
  Award
} from 'lucide-react';
import { 
  loadState, 
  saveState, 
  registerUser, 
  performPairing, 
  createTask, 
  updateTaskStatus, 
  resetGame, 
  endGame,
  submitGuess
} from './services/storage';
import { generateTaskSuggestion } from './services/geminiService';
import { AppState, GameStatus, User, ADMIN_EMP_ID, Task, TaskStatus } from './types';
import { SpinWheel } from './components/SpinWheel';

const App = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [empIdInput, setEmpIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'ADMIN'>('LOGIN');
  const [notification, setNotification] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [adminTab, setAdminTab] = useState<'USERS' | 'TASKS'>('USERS');
  
  // Task Completion State
  const [activeTaskForCompletion, setActiveTaskForCompletion] = useState<string | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState('');
  const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);

  // Guessing State
  const [guessInput, setGuessInput] = useState('');

  // Leaderboard Modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Admin End Game Modal
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [endGameMsgInput, setEndGameMsgInput] = useState("Merry Christmas! The game has officially ended.");

  // Refresh state helper
  const refresh = () => setState(loadState());

  // Listen for storage changes (multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crismom_app_data') {
        setState(loadState());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check login persistence
  useEffect(() => {
    const s = loadState();
    if (s.currentUser) {
      if (s.currentUser.employeeId === ADMIN_EMP_ID) {
        setView('ADMIN');
      } else {
        setView('DASHBOARD');
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empIdInput || !passwordInput) {
      setNotification("Please enter both ID and Password.");
      return;
    }

    // Admin Bypass
    if (empIdInput === ADMIN_EMP_ID) {
      if (passwordInput === 'admin123') {
        const adminUser: User = { id: 'admin', name: 'Admin', employeeId: ADMIN_EMP_ID, avatarId: 0, password: 'admin', score: 0 };
        const newState = { ...loadState(), currentUser: adminUser };
        saveState(newState);
        setState(newState);
        setView('ADMIN');
      } else {
        setNotification("Invalid Admin Password");
      }
      return;
    }

    // Regular User Login
    const existingUser = state.users.find(u => u.employeeId === empIdInput);
    if (existingUser) {
      if (existingUser.password === passwordInput) {
        const newState = { ...state, currentUser: existingUser };
        saveState(newState);
        setState(newState);
        setView('DASHBOARD');
      } else {
        setNotification("Incorrect password.");
      }
    } else {
      if (state.status === GameStatus.REGISTRATION) {
        if (!nameInput) {
          setNotification("New user? Enter your name to register.");
          return;
        }
        try {
          const newUser = registerUser(nameInput, empIdInput, passwordInput);
          const newState = { ...loadState(), currentUser: newUser };
          setState(newState);
          setView('DASHBOARD');
        } catch (err: any) {
          setNotification(err.message);
        }
      } else {
        setNotification("Registration is closed. You must be registered to play.");
      }
    }
  };

  const handleLogout = () => {
    const s = loadState();
    s.currentUser = null;
    saveState(s);
    setState(s);
    setView('LOGIN');
    setEmpIdInput('');
    setPasswordInput('');
    setNameInput('');
    setNotification(null);
  };

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    const suggestion = await generateTaskSuggestion();
    setTaskInput(suggestion);
    setLoadingAi(false);
  };

  const handleSendTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.currentUser?.childId) return;
    if (!taskInput.trim()) return;

    createTask(state.currentUser.id, state.currentUser.childId, taskInput);
    setTaskInput('');
    refresh();
    setNotification("Task sent to Admin for approval!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartGame = () => {
    if (state.users.length < 2) {
      setNotification("Need at least 2 players!");
      setTimeout(() => setNotification(null), 2000);
      return;
    }
    setShowSpinWheel(true);
  };

  const onSpinComplete = () => {
    performPairing();
    setShowSpinWheel(false);
    refresh();
  };

  const handleTaskAction = (taskId: string, action: 'APPROVE' | 'REJECT') => {
    updateTaskStatus(
      taskId, 
      action === 'APPROVE' ? TaskStatus.APPROVED : TaskStatus.REJECTED,
      action === 'REJECT' ? "Admin rejected this task." : undefined
    );
    refresh();
  };

  const initiateCompletion = (taskId: string) => {
    setActiveTaskForCompletion(taskId);
    setCompletionFeedback('');
  };

  const submitCompletion = (taskId: string) => {
    updateTaskStatus(taskId, TaskStatus.COMPLETED, undefined, completionFeedback);
    setActiveTaskForCompletion(null);
    setJustCompletedTaskId(taskId);
    refresh();
    
    // Clear animation state after duration
    setTimeout(() => {
        setJustCompletedTaskId(null);
    }, 2000);
  };

  const handleEndGame = () => {
    if(!endGameMsgInput.trim()) return;
    endGame(endGameMsgInput);
    setShowEndGameModal(false);
    refresh();
  };

  const handleSubmitGuess = () => {
    if (!state.currentUser || !guessInput) return;
    submitGuess(state.currentUser.id, guessInput);
    refresh();
  };

  // ------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------

  const getChildName = () => {
    if (!state.currentUser?.childId) return null;
    return state.users.find(u => u.id === state.currentUser?.childId)?.name;
  };

  const getMyTasks = () => {
    if (!state.currentUser) return [];
    return state.tasks.filter(t => 
      t.toId === state.currentUser?.id && 
      (t.status === TaskStatus.APPROVED || t.status === TaskStatus.COMPLETED)
    );
  };

  const getSentTasks = () => {
    if (!state.currentUser) return [];
    return state.tasks.filter(t => t.fromId === state.currentUser?.id);
  };

  const getPendingTasks = () => {
    return state.tasks.filter(t => t.status === TaskStatus.PENDING);
  };

  const getRejectedTaskAlert = () => {
    if (!state.currentUser) return null;
    // Find the most recent rejected task
    const rejected = state.tasks
      .filter(t => t.fromId === state.currentUser?.id && t.status === TaskStatus.REJECTED)
      .sort((a,b) => b.createdAt - a.createdAt)[0];
    
    if (rejected) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800 text-sm uppercase tracking-wide">Official Notification</h4>
              <p className="text-red-700 text-sm mt-1">
                Your previous directive was declined by the administration.
              </p>
              <p className="text-red-600/80 text-xs mt-1 italic">
                "{rejected.content}"
              </p>
              <p className="text-red-800 font-medium text-xs mt-2">
                Please submit a revised proposal immediately.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderLeaderboardModal = () => {
    if (!showLeaderboard) return null;
    
    const sortedUsers = [...state.users].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <XCircle className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Leaderboard</h2>
            <p className="text-slate-500 text-sm">Top players by task points</p>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {sortedUsers.map((u, index) => {
              let rankIcon = <span className="w-6 text-center font-bold text-slate-400">{index + 1}</span>;
              let rowClass = "bg-slate-50 border-slate-100";
              let textClass = "text-slate-700";

              if (index === 0) {
                rankIcon = <Medal className="w-6 h-6 text-yellow-500" />;
                rowClass = "bg-yellow-50 border-yellow-200 shadow-sm";
                textClass = "text-yellow-800 font-bold";
              } else if (index === 1) {
                rankIcon = <Medal className="w-6 h-6 text-slate-400" />;
                rowClass = "bg-slate-100 border-slate-200";
                textClass = "text-slate-700 font-bold";
              } else if (index === 2) {
                rankIcon = <Medal className="w-6 h-6 text-amber-600" />;
                rowClass = "bg-orange-50 border-orange-200";
                textClass = "text-orange-800 font-bold";
              }

              const isMe = state.currentUser?.id === u.id;

              return (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border ${rowClass} ${isMe ? 'ring-2 ring-purple-500' : ''}`}>
                  <div className="flex items-center gap-3">
                    {rankIcon}
                    <div className="flex flex-col">
                      <span className={`${textClass} text-sm`}>
                        {u.name} {isMe && "(You)"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {u.score || 0}
                  </div>
                </div>
              );
            })}
            {sortedUsers.length === 0 && (
              <p className="text-center text-slate-400 py-4">No scores yet!</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // VIEWS
  // ------------------------------------------

  if (showSpinWheel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <SpinWheel users={state.users} onComplete={onSpinComplete} />
      </div>
    );
  }

  // 1. LOGIN / REGISTRATION
  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Gift className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">CrisMom CrisChild</h1>
            <p className="text-slate-500 mt-2">The Office Secret Game</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={empIdInput}
                  onChange={(e) => setEmpIdInput(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your ID"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  placeholder={state.status === GameStatus.REGISTRATION ? "Set a password" : "Enter password"}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            {state.status === GameStatus.REGISTRATION && empIdInput !== ADMIN_EMP_ID && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  placeholder="For new registration"
                />
              </div>
            )}

            {notification && (
              <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {notification}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              {state.status === GameStatus.REGISTRATION ? 'Login / Register' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
               Status: {state.status}
             </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD
  if (view === 'ADMIN') {
    const pendingTasks = getPendingTasks();

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
               {state.status === GameStatus.PAIRED && (
                 <button 
                  onClick={() => setShowEndGameModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors"
                 >
                   <StopCircle className="w-4 h-4" /> END GAME
                 </button>
               )}
               {state.status === GameStatus.ENDED && (
                 <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-mono border border-slate-600">
                   GAME ENDED
                 </span>
               )}
               <button onClick={handleLogout} className="text-slate-300 hover:text-white">
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          </div>
        </header>

        {/* End Game Modal */}
        {showEndGameModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">End Game Confirmation</h3>
              <p className="text-slate-500 text-sm mb-4">This will close the game for everyone. Send a final celebratory message:</p>
              <textarea 
                value={endGameMsgInput}
                onChange={(e) => setEndGameMsgInput(e.target.value)}
                className="w-full h-24 p-3 border border-slate-300 rounded-lg mb-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowEndGameModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEndGame}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium"
                >
                  End Game & Notify
                </button>
              </div>
            </div>
          </div>
        )}

        {renderLeaderboardModal()}

        <main className="flex-1 max-w-6xl mx-auto w-full p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Sidebar */}
            <div className="md:col-span-1 space-y-2">
              <button 
                onClick={() => setAdminTab('USERS')}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${adminTab === 'USERS' ? 'bg-white shadow-md border-l-4 border-purple-500 text-purple-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <span>Users</span>
                <Users className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setAdminTab('TASKS')}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${adminTab === 'TASKS' ? 'bg-white shadow-md border-l-4 border-purple-500 text-purple-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <span>Task Queue</span>
                {pendingTasks.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                )}
              </button>
              
              <div className="pt-8 border-t border-slate-200 mt-8">
                <button 
                  onClick={() => setShowLeaderboard(true)}
                  className="w-full text-left px-4 py-2 text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-lg flex items-center gap-2 mb-2 font-medium"
                >
                  <Trophy className="w-4 h-4" /> View Leaderboard
                </button>
                <button 
                  onClick={refresh} 
                  className="w-full text-left px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded-lg flex items-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" /> Refresh Data
                </button>
                <button 
                  onClick={resetGame}
                  className="w-full text-left px-4 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset Game Data
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px]">
              
              {/* USERS TAB */}
              {adminTab === 'USERS' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Registered Players ({state.users.length})</h2>
                    {state.status === GameStatus.REGISTRATION && (
                      <button 
                        onClick={handleStartGame}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all"
                      >
                        <Play className="w-4 h-4" /> Close Reg & Start Game
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Cris Child (Assigned)</th>
                          {state.status === GameStatus.ENDED && (
                            <th className="px-4 py-3">End Game Guess</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.users.map(u => {
                          const guessedMom = u.guessedMomId ? state.users.find(m => m.id === u.guessedMomId) : null;
                          const actualMom = u.momId ? state.users.find(m => m.id === u.momId) : null;
                          const correctGuess = u.guessedMomId && u.momId && u.guessedMomId === u.momId;

                          return (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{u.name}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono">{u.employeeId}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                  <Star className="w-3 h-3" /> {u.score}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {u.childId ? (
                                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">
                                    {state.users.find(c => c.id === u.childId)?.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not assigned</span>
                                )}
                              </td>
                              {state.status === GameStatus.ENDED && (
                                <td className="px-4 py-3">
                                  {guessedMom ? (
                                    <div className="flex flex-col">
                                      <span className={correctGuess ? "text-green-600 font-bold" : "text-red-500"}>
                                        Guessed: {guessedMom.name}
                                      </span>
                                      <span className="text-xs text-slate-400">Actual: {actualMom?.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 italic">No guess yet</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {state.users.length === 0 && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No users registered yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TASKS TAB */}
              {adminTab === 'TASKS' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Task Moderation</h2>
                  {pendingTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <CheckCircle className="w-12 h-12 mb-2 text-emerald-100" />
                      <p>All clear! No pending tasks.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTasks.map(task => {
                        const sender = state.users.find(u => u.id === task.fromId);
                        const receiver = state.users.find(u => u.id === task.toId);
                        return (
                          <div key={task.id} className="p-4 rounded-xl border border-slate-200 hover:border-purple-100 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm text-slate-500">
                                <span className="font-semibold text-slate-700">{sender?.name}</span>
                                <span className="mx-2">→</span>
                                <span className="font-semibold text-slate-700">{receiver?.name}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                {new Date(task.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <p className="text-lg text-slate-800 mb-4 bg-slate-50 p-3 rounded-lg italic">
                              "{task.content}"
                            </p>
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleTaskAction(task.id, 'REJECT')}
                                className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                Reject
                              </button>
                              <button 
                                onClick={() => handleTaskAction(task.id, 'APPROVE')}
                                className="px-4 py-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors shadow-sm"
                              >
                                Approve & Send
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. USER DASHBOARD
  const childName = getChildName();
  const myTasks = getMyTasks();
  const sentTasks = getSentTasks();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Gift className="w-5 h-5 text-purple-600" />
            <span>CrisMom</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-bold text-slate-700">{state.currentUser?.score || 0} pts</span>
            </div>
            
            <button 
              onClick={() => setShowLeaderboard(true)}
              className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-full transition-all"
              title="Leaderboard"
            >
              <Trophy className="w-5 h-5" />
            </button>
            
            <button 
              onClick={refresh} 
              className="text-slate-400 hover:text-purple-600 p-2 rounded-full transition-all" 
              title="Refresh Data"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                {state.currentUser?.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-slate-600 hidden sm:inline">{state.currentUser?.name}</span>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      {renderLeaderboardModal()}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        
        {notification && (
          <div className="animate-in slide-in-from-top-4 duration-300 fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {notification}
          </div>
        )}

        {/* STATUS BANNER */}
        {state.status === GameStatus.REGISTRATION && (
          <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-1">Registration Open</h2>
              <p className="text-indigo-100">Waiting for all colleagues to join...</p>
            </div>
            <Clock className="w-24 h-24 text-white/10 absolute -right-6 -bottom-6" />
          </div>
        )}

        {state.status === GameStatus.PAIRED && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden text-center">
            <div className="relative z-10">
              <p className="text-purple-200 text-sm font-medium uppercase tracking-wider mb-2">Your Secret Assignment</p>
              <h2 className="text-4xl font-bold mb-2">
                 Target: <span className="text-yellow-300">{childName}</span>
              </h2>
              <p className="text-white/80 max-w-lg mx-auto">
                You are the Cris Mom for {childName}. Assign them secret tasks daily!
              </p>
            </div>
            <Baby className="w-48 h-48 text-white/5 absolute -right-10 -bottom-10 rotate-12" />
          </div>
        )}

        {state.status === GameStatus.ENDED && (
           <div className="space-y-6 animate-in zoom-in duration-500">
             <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden text-center">
               <div className="relative z-10">
                 <h2 className="text-4xl font-bold mb-4">🎄 Game Over! 🎄</h2>
                 <div className="bg-white/20 backdrop-blur-sm p-6 rounded-xl mt-4 inline-block max-w-2xl">
                   <p className="text-2xl italic font-serif leading-relaxed">"{state.endGameMessage}"</p>
                   <div className="text-sm mt-4 text-white/70 uppercase tracking-widest font-bold">- Admin</div>
                 </div>
               </div>
               <Gift className="w-48 h-48 text-white/10 absolute -right-8 -bottom-8 rotate-12" />
               <Sparkles className="w-32 h-32 text-white/10 absolute -left-4 -top-4" />
             </div>

             {/* GUESSING SECTION */}
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
               <div className="text-center max-w-lg mx-auto">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                    <HelpCircle className="w-6 h-6 text-purple-600" /> Who was your CrisMom?
                  </h3>
                  
                  {state.currentUser?.guessedMomId ? (
                    <div className="mt-6 bg-slate-50 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4">
                       <div className="mb-4">
                         <span className="text-slate-500 text-sm uppercase tracking-wide">You Guessed</span>
                         <div className="text-2xl font-bold text-slate-800">
                           {state.users.find(u => u.id === state.currentUser?.guessedMomId)?.name}
                         </div>
                       </div>
                       
                       <div className="w-full h-px bg-slate-200 my-4"></div>

                       <div>
                         <span className="text-slate-500 text-sm uppercase tracking-wide">Actual CrisMom</span>
                         <div className="text-3xl font-bold text-purple-600 mt-1">
                           {state.users.find(u => u.id === state.currentUser?.momId)?.name}
                         </div>
                       </div>

                       {state.currentUser.guessedMomId === state.currentUser.momId ? (
                         <div className="mt-4 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold">
                           <Trophy className="w-5 h-5" /> CORRECT GUESS!
                         </div>
                       ) : (
                         <div className="mt-4 inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold">
                           <XCircle className="w-5 h-5" /> NICE TRY!
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="mt-6">
                      <p className="text-slate-600 mb-4">Select the person you think assigned you all those tasks!</p>
                      <div className="flex gap-2">
                        <select 
                          value={guessInput}
                          onChange={(e) => setGuessInput(e.target.value)}
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="">Select a colleague...</option>
                          {state.users
                            .filter(u => u.id !== state.currentUser?.id)
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))
                          }
                        </select>
                        <button 
                          onClick={handleSubmitGuess}
                          disabled={!guessInput}
                          className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          Submit Guess
                        </button>
                      </div>
                    </div>
                  )}
               </div>
             </div>
           </div>
        )}

        {/* GAME CONTENT: PAIRED OR ENDED */}
        
        {/* REJECTION ALERT */}
        {state.status === GameStatus.PAIRED && getRejectedTaskAlert()}

        {state.status === GameStatus.PAIRED && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COL: CREATE TASK */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Send className="w-5 h-5 text-purple-500" />
                    Give a Dare
                  </h3>
                  <button 
                    onClick={handleAiSuggest}
                    disabled={loadingAi}
                    className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded-md transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    {loadingAi ? 'Thinking...' : 'AI Suggest'}
                  </button>
                </div>
                
                <form onSubmit={handleSendTask}>
                  <textarea
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none mb-4 text-sm"
                    placeholder={`What should ${childName} do today? (e.g., "Sing a song during break")`}
                  />
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Reward: 10 pts</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={!taskInput.trim()}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
                  >
                    Send to Admin
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-3">
                    Tasks are anonymous. Admin approves before sending.
                  </p>
                </form>
              </div>

              {/* SENT HISTORY */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Task History</h3>
                 <div className="space-y-3">
                    {sentTasks.length === 0 && <p className="text-slate-400 text-sm italic">No tasks sent yet.</p>}
                    {sentTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="truncate max-w-[50%] text-slate-600 font-medium">"{t.content}"</span>
                          {t.status === TaskStatus.PENDING && <span className="text-amber-500 font-medium text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                          {t.status === TaskStatus.APPROVED && <span className="text-emerald-500 font-medium text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Sent</span>}
                          {t.status === TaskStatus.COMPLETED && <span className="text-blue-500 font-bold text-xs flex items-center gap-1"><Check className="w-3 h-3"/> Completed</span>}
                          {t.status === TaskStatus.REJECTED && <span className="text-red-500 font-medium text-xs flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</span>}
                        </div>
                        {t.feedback && (
                           <div className="bg-blue-50 text-blue-800 text-xs p-2 rounded mt-2 flex items-start gap-2">
                             <MessageCircle className="w-3 h-3 mt-0.5 shrink-0" />
                             <span><span className="font-bold">Feedback:</span> "{t.feedback}"</span>
                           </div>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* RIGHT COL: RECEIVED TASKS */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <Gift className="w-5 h-5 text-emerald-500" />
                  Your Tasks
                </h3>

                {myTasks.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Baby className="w-6 h-6" />
                    </div>
                    <p className="text-slate-500 font-medium">No tasks yet!</p>
                    <p className="text-xs text-slate-400 mt-1">Your Cris Mom is thinking...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTasks.map(task => {
                      const isCompleted = task.status === TaskStatus.COMPLETED;
                      const isCompleting = activeTaskForCompletion === task.id;
                      const isJustDone = justCompletedTaskId === task.id;

                      return (
                        <div 
                          key={task.id} 
                          className={`p-4 border rounded-xl relative group transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-slate-50 border-slate-200 opacity-75' 
                              : isCompleting
                                ? 'bg-white border-purple-200 ring-2 ring-purple-500 shadow-md'
                                : 'bg-emerald-50/50 border-emerald-100 shadow-sm hover:shadow-md'
                          }`}
                        >
                          {!isCompleted && !isCompleting && <div className="absolute -left-1 top-4 w-1 h-8 bg-emerald-400 rounded-r-full"></div>}
                          
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className={`text-slate-800 font-medium leading-relaxed ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                                "{task.content}"
                              </p>
                              
                              {!isCompleted && !isCompleting && (
                                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                   <Star className="w-3 h-3 fill-yellow-700" /> +{task.points} pts
                                </div>
                              )}

                              {/* COMPLETION FORM */}
                              {isCompleting && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                   <input 
                                     type="text"
                                     value={completionFeedback}
                                     onChange={(e) => setCompletionFeedback(e.target.value)}
                                     placeholder="Feedback? (e.g., 'That was fun!')"
                                     className="w-full text-sm p-2 border border-slate-200 rounded-lg mb-2 focus:outline-none focus:border-purple-400"
                                     autoFocus
                                   />
                                   <div className="flex gap-2">
                                     <button 
                                      onClick={() => submitCompletion(task.id)}
                                      className="flex-1 bg-purple-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-purple-700"
                                     >
                                       Confirm Done (+{task.points} pts)
                                     </button>
                                     <button 
                                      onClick={() => setActiveTaskForCompletion(null)}
                                      className="px-3 bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-300"
                                     >
                                       Cancel
                                     </button>
                                   </div>
                                </div>
                              )}
                            </div>
                            
                            {!isCompleted && !isCompleting && (
                              <button 
                                onClick={() => initiateCompletion(task.id)}
                                className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg p-2 transition-colors flex flex-col items-center gap-1"
                                title="Mark as Done"
                              >
                                <Check className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">Done</span>
                              </button>
                            )}
                            
                            {isCompleted && (
                              <div className={`shrink-0 text-blue-500 flex flex-col items-center transition-transform duration-500 ${isJustDone ? 'scale-150 text-emerald-500' : 'scale-100'}`}>
                                <CheckCircle className="w-6 h-6" />
                                <span className="text-[10px] font-bold uppercase mt-1">Done</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                             <span>From: Secret Mom</span>
                             <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;