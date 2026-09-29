import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { restoreAutosave, startAutosave } from './store/file-actions';
import './styles/global.css';
import './styles/app.css';

const restored = restoreAutosave();
startAutosave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App firstRun={!restored} />
  </StrictMode>,
);
