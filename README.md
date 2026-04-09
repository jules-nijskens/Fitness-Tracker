# Fitness Tracker

A modern, Apple-inspired workout tracker built with **React** and **Firebase**. This application allows users to log weights and effort ratings for various exercises, tracking progress over time with a clean, minimalist interface.

## Features

- **Authenticated Access**: Restricted to a specific user UID for private data management.
- **Workout Logging**: Quick entry for exercises including Lat Machine, Chest Machine, Leg Press, Reverse Butterfly (formerly Pectoral), Leg Extension, and Leg Curl.
- **Contextual Data**: Displays the "Last Known" weight and rating for each exercise directly in the form for easy reference.
- **History View**: A chronological table of all saved workouts.
- **Responsive Design**: Clean, iOS-style aesthetics that work well on mobile and desktop.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Backend**: Firebase (Authentication & Firestore)
- **Styling**: Vanilla CSS (Apple-inspired)

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Firebase Project

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jules-nijskens/Fitness-Tracker.git
   cd Fitness-Tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_ALLOWED_UID=your_specific_uid_to_allow_access
   ```

4. **Run Locally**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

## Deployment

The project is configured for Firebase Hosting. To deploy:

```bash
firebase deploy --only hosting
```

## Security Note

This app uses a hardcoded `ALLOWED_UID` check in the frontend as a primary filter. For production use, ensure your **Firestore Security Rules** are also configured to restrict read/write access to that specific UID.
