import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "../services/applications.js";
import { matchingService } from "../services/matching.js";
import { format } from "date-fns";
import { Building2, ExternalLink, Target } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  application: Application;
  onClick: () => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700" :
    score >= 40 ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      <Target size={10} />
      {score}%
    </span>
  );
}

export function KanbanCard({ application, onClick }: Props) {
  const [matchScore, setMatchScore] = useState<number | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: application.id,
    data: {
      type: "Application",
      application,
    },
  });

  useEffect(() => {
    if (application.jobDescription) {
      matchingService.getMatchScore(application.id)
        .then((r) => { if (r.score !== null) setMatchScore(r.score); })
        .catch(() => {}); // silent
    }
  }, [application.id, application.jobDescription]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-dashed border-blue-500 rounded-lg h-32 bg-white"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors leading-tight pr-2">
          {application.jobTitle}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {matchScore !== null && <ScoreBadge score={matchScore} />}
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-400 hover:text-primary-500 transition-colors p-1 rounded-md hover:bg-slate-100"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
      
      <div className="flex items-center text-sm text-slate-600 mb-4 font-medium">
        <Building2 size={14} className="mr-1.5 text-slate-400" />
        {application.companyName}
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          {format(new Date(application.appliedAt), "MMM d, yyyy")}
        </div>
        {/* Placeholder for avatar or other info in the future */}
      </div>
    </div>
  );
}

