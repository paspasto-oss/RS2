import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
createRoot(document.getElementById('root')!).render(<App/>);
// The branch's deployment contains only this sandbox, not legacy RS2 assets.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline shell unavailable',error));});
}
