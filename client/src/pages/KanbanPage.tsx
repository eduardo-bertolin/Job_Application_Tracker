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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 glass px-6 py-4 flex flex-col sm:flex-row justify-between items-center shrink-0 border-b border-slate-200/50">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2.5 rounded-xl shadow-md shadow-primary-500/20">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">JobTracker</h1>
        </div>

        <nav className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 shadow-sm">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50 transition-all"
          >
            <Kanban size={16} className="text-primary-600" /> Kanban
          </button>
          <button
            onClick={() => navigate("/metrics")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
            <BarChart3 size={16} /> Metrics
          </button>
          <button
            onClick={() => navigate("/gmail")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
            <Mail size={16} /> Gmail
          </button>
          <button
            onClick={() => navigate("/resume")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-lg transition-all"
          >
            <FileText size={16} /> Resume
          </button>
        </nav>
        
        <div className="flex items-center gap-5 mt-4 sm:mt-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Welcome</span>
            <span className="text-sm font-bold text-slate-800">{user?.name || user?.email}</span>
          </div>
          <button 
            onClick={handleAddApplication}
            className="group relative flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm font-semibold overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2"><Plus size={18} /> New</span>
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-2"
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
