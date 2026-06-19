import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import PlayerApp from './App';
import '../index.css';
import i18n from '../i18n';

console.info('[Fragbase Player] App version:', __APP_VERSION__);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <PlayerApp />
    </I18nextProvider>
  </React.StrictMode>
);
