import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import OrgApp from './App';
import '../index.css';
import i18n from '../i18n';

console.info('[Fragbase Org] App version:', __APP_VERSION__);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <OrgApp />
    </I18nextProvider>
  </React.StrictMode>
);
