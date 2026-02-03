import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ✅ چون پروژه روی GitHub Pages داخل مسیر /DKA-management/ سرو می‌شود
// این باعث می‌شود لینک‌ها مثل /patients تبدیل شوند به /DKA-management/patients
const repoBase = '/DKA-management';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={repoBase}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
