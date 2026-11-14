import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initPrefs } from './ui/prefs';
import './styles.css';

initPrefs();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
