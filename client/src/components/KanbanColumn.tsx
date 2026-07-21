import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Application, ApplicationStatus } from "../services/applications.js";
import { KanbanCard } from "./KanbanCard.js";

interface Props {
  status: ApplicationStatus;
  title: string;
  applications: Application[];
  onApplicationClick: (app: Application) => void;
}

export function KanbanColumn({ status, title, applications, onApplicationClick }: Props) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  });

  return (
    <div data-status={status} className="flex flex-col bg-slate-100/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl w-80 shrink-0 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-white/40 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          {/* Status indicator dot */}
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === 'APPLIED' ? 'bg-blue-400' :
            status === 'SCREENING' ? 'bg-purple-400' :
            status === 'INTERVIEW' ? 'bg-yellow-400' :
            status === 'OFFER' ? 'bg-green-400' :
            'bg-slate-400'
          }`} />
          <h2 className="font-semibold text-slate-700 tracking-tight">{title}</h2>
        </div>
        <span className="bg-white/60 text-slate-600 text-xs py-1 px-2.5 rounded-full font-medium shadow-sm border border-slate-200/50">
          {applications.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-4 flex flex-col gap-3 min-h-[500px]"
      >
        <SortableContext
          items={applications.map((app) => app.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <KanbanCard 
              key={app.id} 
              application={app} 
              onClick={() => onApplicationClick(app)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
