import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 정부24 스타일 전역 CSS 임포트
import './styles/global.css';

// React 앱 루트(root) 렌더링
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
