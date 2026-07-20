import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { useEffect, useState } from "react";
import { api } from "../services/api.js";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [data, setData] = useState("");

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  // Test protected route
  useEffect(() => {
    api.get("/auth/me")
      .then(res => setData(res.data.user.email))
      .catch(() => setData("Failed to fetch protected data"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
          >
            Logout
          </button>
        </div>
        
        <div className="prose">
          <p>Welcome back, <strong>{user?.name || user?.email}</strong>!</p>
          <p className="text-gray-500 text-sm mt-4">Protected API test: {data}</p>
        </div>
      </div>
    </div>
  );
}
