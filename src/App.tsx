import React, { useState, useEffect } from 'react';
import Model from 'react-body-highlighter';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { auth, db, ALLOWED_UID } from './firebase';

const OFFICE_EXERCISES = [
  "LatMachine",
  "ChestMachine",
  "LegPress",
  "ReverseButterfly",
  "LegExtension",
  "LegCurl",
  "CalfRaises",
  "BackExtension"
];

const HOME_EXERCISES = [
  "GobletSquats",
  "SingleLegRDL",
  "DumbbellRows",
  "PlankShoulderTaps",
  "PogoJumps"
];

const EXERCISE_LABELS: Record<string, string> = {
  LatMachine: "Lat Machine",
  ChestMachine: "Chest Machine",
  LegPress: "Leg Press",
  ReverseButterfly: "Reverse Butterfly",
  LegExtension: "Leg Extension",
  LegCurl: "Leg Curl",
  CalfRaises: "Calf Raises",
  BackExtension: "Back Extension",
  GobletSquats: "Goblet Squats",
  SingleLegRDL: "Single-Leg Romanian Deadlift",
  DumbbellRows: "Dumbbell Rows",
  PlankShoulderTaps: "Plank with Shoulder Taps",
  PogoJumps: "Pogo Jumps"
};

interface WorkoutData {
  weight: string;
  rating?: string;
  times?: string;
}

interface Workout {
  id: string;
  date: any;
  type: 'office' | 'home';
  [key: string]: any; // For exercise keys
}

const EXERCISE_TIPS: Record<string, string> = {
  // Office
  LatMachine: "Lats & Mid-back | Focus: Pull with elbows, pause at the bottom, control the eccentric.",
  ChestMachine: "Pecs & Triceps | Focus: Keep shoulders down, squeeze chest at the top.",
  LegPress: "Quads & Glutes | Focus: Push through mid-foot, do not lock out knees.",
  ReverseButterfly: "Rear Delts & Upper Back | Focus: Keep slight elbow bend, pull shoulder blades together.",
  LegExtension: "Quads | Focus: Squeeze quads at the top, lower weight under control.",
  LegCurl: "Hamstrings | Focus: Keep hips pressed into pad, curl fully and control release.",
  CalfRaises: "Calves | Focus: Full range of motion, squeeze at the top, slow descent.",
  BackExtension: "Lower Back & Hamstrings | Focus: Controlled movement, avoid hyperextension at the top.",
  // Home
  GobletSquats: "Quads & Core | Tip: Brace core, keep chest 'tall', drive knees out over toes.",
  SingleLegRDL: "Hamstrings & Glutes | Focus: Hinge at hips with flat back, DB opposite to standing leg.",
  DumbbellRows: "Lats & Rhomboids | Focus: Pull dumbbell to hip, squeeze shoulder blade at top.",
  PlankShoulderTaps: "Core & Shoulders | Focus: Widen feet for stability, keep hips completely still.",
  PogoJumps: "Calves & Achilles | Tip: Keep legs mostly straight, bouncy hops from the ankles."
};

const EXERCISE_VIDEOS: Record<string, string> = {
  SingleLegRDL: "MsE_T9nAsSE",
  GobletSquats: "lRYBbchqxtI",
  DumbbellRows: "6gvmcqr226U",
  PlankShoulderTaps: "QOCn3_iOAro",
  PogoJumps: "j0nl5dWuqN4"
};

const EXERCISE_MUSCLES: Record<string, { muscles: string[], type: 'anterior' | 'posterior' }> = {
  LatMachine: { muscles: ['upper-back', 'biceps'], type: 'posterior' },
  ChestMachine: { muscles: ['chest', 'triceps', 'front-deltoids'], type: 'anterior' },
  LegPress: { muscles: ['quadriceps', 'gluteal', 'hamstring'], type: 'anterior' },
  ReverseButterfly: { muscles: ['back-deltoids', 'upper-back'], type: 'posterior' },
  LegExtension: { muscles: ['quadriceps'], type: 'anterior' },
  LegCurl: { muscles: ['hamstring'], type: 'posterior' },
  CalfRaises: { muscles: ['calves'], type: 'posterior' },
  BackExtension: { muscles: ['lower-back', 'hamstring', 'gluteal'], type: 'posterior' },
  GobletSquats: { muscles: ['quadriceps', 'gluteal', 'abs'], type: 'anterior' },
  SingleLegRDL: { muscles: ['hamstring', 'gluteal', 'lower-back'], type: 'posterior' },
  DumbbellRows: { muscles: ['upper-back', 'biceps', 'back-deltoids'], type: 'posterior' },
  PlankShoulderTaps: { muscles: ['abs', 'obliques', 'front-deltoids', 'triceps'], type: 'anterior' },
  PogoJumps: { muscles: ['calves'], type: 'posterior' }
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'office' | 'home'>('office');
  const [showVideo, setShowVideo] = useState<string | null>(null);

  // Form state
  const [formWeights, setFormWeights] = useState<Record<string, string>>({});
  const [formRatings, setFormRatings] = useState<Record<string, string>>({});
  const [formTimes, setFormTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.uid === ALLOWED_UID) {
        setUser(u);
        fetchWorkouts();
      } else {
        setUser(null);
        if (u) {
          alert("This account is not authorized.");
          signOut(auth);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchWorkouts = async () => {
    const q = query(collection(db, "workouts"), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const loadedWorkouts: Workout[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Default to 'office' for old data
      loadedWorkouts.push({ id: doc.id, type: 'office', ...data } as Workout);
    });

    // Patch for new exercises in the last 2 office sessions
    let officeCount = 0;
    for (let i = 0; i < loadedWorkouts.length; i++) {
      if (loadedWorkouts[i].type === 'office' && officeCount < 2) {
        if (!loadedWorkouts[i].CalfRaises) {
          loadedWorkouts[i].CalfRaises = { weight: '', rating: 'Normal', times: '3x 15' };
        }
        if (!loadedWorkouts[i].BackExtension) {
          loadedWorkouts[i].BackExtension = { weight: '', rating: 'Normal', times: '3x 15' };
        }
        officeCount++;
      }
    }

    setWorkouts(loadedWorkouts);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSubmitWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    const workout: any = { 
      date: serverTimestamp(),
      type: activeTab 
    };
    let hasData = false;

    const exercises = activeTab === 'office' ? OFFICE_EXERCISES : HOME_EXERCISES;

    for (const ex of exercises) {
      const weight = formWeights[ex];
      const rating = formRatings[ex];
      const times = formTimes[ex];

      if (weight || times) {
        workout[ex] = { weight: weight || '', rating: rating || '', times: times || '' };
        hasData = true;
      }
    }

    if (!hasData) {
      alert("No exercises were filled out.");
      return;
    }

    try {
      await addDoc(collection(db, "workouts"), workout);
      setFormWeights({});
      setFormRatings({});
      setFormTimes({});
      fetchWorkouts();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getLastKnown = (exercise: string) => {
    for (const w of workouts) {
      if (w[exercise]) {
        return w[exercise] as WorkoutData;
      }
    }
    return null;
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  if (!user) {
    return (
      <div className="container">
        <form onSubmit={handleLogin} className="card">
          <h2>Login</h2>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit">Sign In</button>
        </form>
      </div>
    );
  }

  const currentExercises = activeTab === 'office' ? OFFICE_EXERCISES : HOME_EXERCISES;

  return (
    <div>
      <header>
        <div className="auth-status">Logged in as {user.email}</div>
        <button id="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <div className="container">
        <h1>Workout Tracker</h1>

        <div className="tabs">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'office' ? 'active' : ''}`}
            onClick={() => setActiveTab('office')}
          >
            Office Workout
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            Home Workout
          </button>
        </div>
        
        <form onSubmit={handleSubmitWorkout} className="card">
          {currentExercises.map((ex) => {
            const last = getLastKnown(ex);
            const muscleData = EXERCISE_MUSCLES[ex];
            return (
              <div key={ex} className="exercise">
                <div className="exercise-main">
                  <label 
                    className={EXERCISE_VIDEOS[ex] ? 'clickable-label' : ''}
                    onClick={() => {
                      if (EXERCISE_VIDEOS[ex]) {
                        setShowVideo(showVideo === ex ? null : ex);
                      }
                    }}
                  >
                    {EXERCISE_LABELS[ex]}
                    {EXERCISE_VIDEOS[ex] && (
                      <span className="video-icon"> 📽️</span>
                    )}
                    {last && (
                      <span className="last-known-subtle">
                        {" "}(Last: {last.weight ? `${last.weight}kg` : ''}{last.weight && last.times ? ' / ' : ''}{last.times ? `${last.times}` : ''}{last.rating ? ` / ${last.rating}` : ''})
                      </span>
                    )}
                    {EXERCISE_TIPS[ex] && (
                      <div className="exercise-tip">{EXERCISE_TIPS[ex]}</div>
                    )}
                  </label>

                  {showVideo === ex && EXERCISE_VIDEOS[ex] && (
                    <div className="video-container">
                      <iframe 
                        width="100%" 
                        height="315" 
                        src={`https://www.youtube.com/embed/${EXERCISE_VIDEOS[ex]}?autoplay=1`}
                        title="Exercise Video" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                  <div className="input-row">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Weight (kg)"
                      value={formWeights[ex] || ''}
                      onChange={(e) => setFormWeights({ ...formWeights, [ex]: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Sets x Reps (e.g. 3x12)"
                      value={formTimes[ex] || ''}
                      onChange={(e) => setFormTimes({ ...formTimes, [ex]: e.target.value })}
                    />
                    <select
                      value={formRatings[ex] || ''}
                      onChange={(e) => setFormRatings({ ...formRatings, [ex]: e.target.value })}
                    >
                      <option value="">Rating</option>
                      <option value="Easy">Easy</option>
                      <option value="Normal">Normal</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                {muscleData && (
                  <div className="exercise-model">
                    <Model
                      data={[{ name: ex, muscles: muscleData.muscles }]}
                      style={{ width: '4rem' }}
                      type={muscleData.type}
                      highlightedColors={['#007aff']}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button type="submit" style={{ marginTop: '1rem' }}>Add Workout</button>
        </form>

        <h2>Saved {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workouts</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {currentExercises.map(ex => (
                  <th key={ex}>{EXERCISE_LABELS[ex]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workouts
                .filter(w => w.type === activeTab)
                .map((w) => (
                <tr key={w.id}>
                  <td>{w.date ? new Date(w.date.seconds * 1000).toLocaleDateString() : ''}</td>
                  {currentExercises.map(ex => {
                    const data = w[ex] as WorkoutData;
                    return (
                      <td key={ex}>
                        {data ? (
                          <>
                            {data.weight && `${data.weight}kg`}
                            {data.weight && data.times && <br />}
                            {data.times && (
                              <span className={data.rating ? `${data.rating.toLowerCase()} bold-times` : ''}>
                                {data.times}
                              </span>
                            )}
                            {activeTab === 'office' && data.rating && (
                              <>
                                <br />
                                <span className={data.rating.toLowerCase()}>{data.rating}</span>
                              </>
                            )}
                          </>
                        ) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
