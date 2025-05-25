import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import VideoScreen from './screens/VideoScreen/VideoScreen';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/video" element={<VideoScreen />} />
    </Routes>
  </BrowserRouter>
);

