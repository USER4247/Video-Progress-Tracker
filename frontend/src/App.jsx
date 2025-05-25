import React from 'react';
import { Link } from 'react-router-dom';

export default function App() {
  return (
    <div>
      <h1>Welcome to Video Tracker</h1>
      <Link to="/video">Go to Video Player</Link>
    </div>
  );
}
