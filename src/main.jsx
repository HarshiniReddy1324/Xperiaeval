import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';
import './portal.css';
import './public-portal.css';
import './theme-dark.css';
import './ease-health-tokens.css';
import './ease-health-portal.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
