import React, { useState, useEffect } from 'react';
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

const EXERCISES = [
  "LatMachine",
  "ChestMachine",
  "LegPress",
  "ReverseButterfly",
  "LegExtension",
  "LegCurl"
];

const EXERCISE_LABELS: Record<string, string> = {
  LatMachine: "Lat Machine",
  ChestMachine: "Chest Machine",
  LegPress: "Leg Press",
  ReverseButterfly: "Reverse Butterfly",
  LegExtension: "Leg Extension",
  LegCurl: "Leg Curl"
};

interface WorkoutData {
  weight: string;
  rating: string;
}

interface Workout {
  id: string;
  date: any;
  [key: string]: any; // For exercise keys
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formWeights, setFormWeights] = useState<Record<string, string>>({});
  const [formRatings, setFormRatings] = useState<Record<string, string>>({});

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
      loadedWorkouts.push({ id: doc.id, ...doc.data() } as Workout);
    });
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
    const workout: any = { date: serverTimestamp() };
    let hasData = false;

    for (const ex of EXERCISES) {
      const weight = formWeights[ex];
      const rating = formRatings[ex];

      if (weight) {
        if (!rating) {
          alert(`Please choose a rating for ${EXERCISE_LABELS[ex]}`);
          return;
        }
        workout[ex] = { weight, rating };
        hasData = true;
      } else if (rating) {
        alert(`Please enter a weight for ${EXERCISE_LABELS[ex]}`);
        return;
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

  return (
    <div>
      <header>
        <div className="auth-status">Logged in as {user.email}</div>
        <button id="logout-btn" onClick={handleLogout}>Logout</button>
      </header>

      <div className="container">
        <h1>Workout Tracker</h1>
        
        <form onSubmit={handleSubmitWorkout} className="card">
          {EXERCISES.map((ex) => {
            const last = getLastKnown(ex);
            return (
              <div key={ex} className="exercise">
                <label>
                  {EXERCISE_LABELS[ex]}
                  {last && (
                    <span className="last-known-subtle">
                      {" "}(Last: {last.weight} kg / {last.rating})
                    </span>
                  )}
                </label>
                <div className="input-row">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    value={formWeights[ex] || ''}
                    onChange={(e) => setFormWeights({ ...formWeights, [ex]: e.target.value })}
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
            );
          })}
          <button type="submit" style={{ marginTop: '1rem' }}>Add Workout</button>
        </form>

        <h2>Saved Workouts</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {EXERCISES.map(ex => <th key={ex}>{EXERCISE_LABELS[ex]}</th>)}
              </tr>
            </thead>
            <tbody>
              {workouts.map((w) => (
                <tr key={w.id}>
                  <td>{w.date ? new Date(w.date.seconds * 1000).toLocaleDateString() : ''}</td>
                  {EXERCISES.map(ex => {
                    const data = w[ex] as WorkoutData;
                    return (
                      <td key={ex}>
                        {data ? (
                          <>
                            {data.weight} kg <span className={data.rating.toLowerCase()}>{data.rating}</span>
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
