import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { KanbanPage } from "./pages/KanbanPage.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/kanban" element={<KanbanPage />} />
        </Route>

        {/* Redirect root and legacy dashboard to kanban */}
        <Route path="/" element={<Navigate to="/kanban" replace />} />
        <Route path="/dashboard" element={<Navigate to="/kanban" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
