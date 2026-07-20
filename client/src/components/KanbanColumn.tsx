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
    <div className="flex flex-col bg-gray-50 rounded-xl w-80 shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className="bg-gray-200 text-gray-600 text-xs py-1 px-2 rounded-full font-medium">
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
