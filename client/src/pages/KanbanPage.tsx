import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { authService } from "../services/auth.js";
import { useEffect, useState } from "react";
import { applicationService } from "../services/applications.js";
import type { Application, ApplicationStatus, CreateApplicationDto, UpdateApplicationDto } from "../services/applications.js";
import { KanbanColumn } from "../components/KanbanColumn.js";
import { ApplicationModal } from "../components/ApplicationModal.js";
import { Plus, LayoutDashboard, BarChart3, Kanban, Mail, FileText } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanCard } from "../components/KanbanCard.js";

const COLUMNS: { id: ApplicationStatus; title: string }[] = [
  { id: "APPLIED", title: "Applied" },
  { id: "SCREENING", title: "Screening" },
  { id: "INTERVIEW", title: "Interviewing" },
  { id: "OFFER", title: "Offer" },
  { id: "REJECTED", title: "Rejected" },
];

export function KanbanPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const data = await applicationService.getAll();
      setApplications(data);
    } catch {
      setError("Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);



  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id; // Could be a column ID or another card ID

    // Find the application being dragged
    const activeApp = applications.find(app => app.id === activeId);
    if (!activeApp) return;

    // Determine the new status
    let newStatus = activeApp.status;
    
    // If over a column
    if (COLUMNS.some(col => col.id === overId)) {
      newStatus = overId as ApplicationStatus;
    } else {
      // If over a card, find that card's status
      const overApp = applications.find(app => app.id === overId);
      if (overApp) {
        newStatus = overApp.status;
      }
    }

    if (activeApp.status === newStatus) return; // No status change

    // Optimistic UI update
    const previousStatus = activeApp.status;
    setApplications(prev => prev.map(app => 
      app.id === activeId ? { ...app, status: newStatus } : app
    ));

    try {
      await applicationService.update(activeId as string, { status: newStatus });
    } catch {
      // Revert on error
      setApplications(prev => prev.map(app => 
        app.id === activeId ? { ...app, status: previousStatus } : app
      ));
      alert("Failed to update status. Reverting change.");
    }
  };

  const handleAddApplication = () => {
    setEditingApplication(null);
    setIsModalOpen(true);
  };

  const handleEditApplication = (app: Application) => {
    setEditingApplication(app);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: CreateApplicationDto | UpdateApplicationDto) => {
    try {
      if (editingApplication) {
        const updated = await applicationService.update(editingApplication.id, data);
        setApplications(prev => prev.map(app => app.id === updated.id ? updated : app));
      } else {
        const created = await applicationService.create(data as CreateApplicationDto);
        setApplications(prev => [created, ...prev]);
      }
    } catch (err) {
      alert("Failed to save application");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await applicationService.delete(id);
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      alert("Failed to delete application");
      throw err;
    }
  };

  const activeApplication = activeId ? applications.find(app => app.id === activeId) : null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">JobTracker</h1>
        </div>

        <nav className="flex items-center gap-1">
          <button
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
          >
            <Kanban size={16} /> Kanban
          </button>
          <button
            onClick={() => navigate("/metrics")}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
          >
            <BarChart3 size={16} /> Metrics
          </button>
          <button
            onClick={() => navigate("/gmail")}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
          >
            <Mail size={16} /> Gmail
          </button>
          <button
            onClick={() => navigate("/resume")}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
          >
            <FileText size={16} /> Resume
          </button>
        </nav>
        
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">Welcome, <strong>{user?.name || user?.email}</strong></span>
          <button 
            onClick={handleAddApplication}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition shadow-sm text-sm font-medium"
          >
            <Plus size={16} />
            New Application
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-gray-600 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-auto p-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200 max-w-md mx-auto mt-10">
            {error}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full items-start">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  status={col.id}
                  title={col.title}
                  applications={applications.filter(app => app.status === col.id)}
                  onApplicationClick={handleEditApplication}
                />
              ))}
            </div>

            <DragOverlay>
              {activeApplication ? (
                <KanbanCard application={activeApplication} onClick={() => {}} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        application={editingApplication}
        onSubmit={handleModalSubmit}
        onDelete={editingApplication ? handleDelete : undefined}
      />
    </div>
  );
}
