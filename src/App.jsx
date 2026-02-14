// src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerServiceWorker } from "./lib/push";

import WelcomePage     from "./pages/WelcomePage";
import MenuPage        from "./pages/MenuPage";
import DashboardPage   from "./pages/DashboardPage";
import AdminPage       from "./pages/AdminPage";
import LoginPage       from "./pages/LoginPage";

export default function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; background: #fdf8f3; color: #1c1917; -webkit-font-smoothing: antialiased; }
        img { max-width: 100%; display: block; }
        button { font-family: 'Nunito', sans-serif; cursor: pointer; }
        input, textarea, select { font-family: 'Nunito', sans-serif; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes popIn    { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <BrowserRouter>
        <Routes>
          {/* Public customer-facing */}
          <Route path="/"              element={<WelcomePage />} />
          <Route path="/order/:slug"   element={<MenuPage />} />

          {/* Owner-facing */}
          <Route path="/login"         element={<LoginPage />} />
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/admin"         element={<AdminPage />} />

          {/* Fallback */}
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
