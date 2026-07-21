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
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {application.jobTitle}
        </h3>
        <div className="flex items-center gap-1">
          {matchScore !== null && <ScoreBadge score={matchScore} />}
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-blue-500"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <Building2 size={14} className="mr-1" />
        {application.companyName}
      </div>

      <div className="text-xs text-gray-400">
        Applied {format(new Date(application.appliedAt), "MMM d, yyyy")}
      </div>
    </div>
  );
}

