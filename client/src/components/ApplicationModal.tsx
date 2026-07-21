import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Application, CreateApplicationDto, UpdateApplicationDto } from "../services/applications.js";
import { X, Trash2 } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
  companyName: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Role is required"),
  jobUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"]),
  notes: z.string().optional(),
  jobDescription: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  application?: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApplicationDto | UpdateApplicationDto) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ApplicationModal({ application, isOpen, onClose, onSubmit, onDelete }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      jobTitle: "",
      jobUrl: "",
      status: "APPLIED",
      notes: "",
      jobDescription: "",
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (application) {
        reset({
          companyName: application.companyName,
          jobTitle: application.jobTitle,
          jobUrl: application.jobUrl || "",
          status: application.status,
          notes: application.notes || "",
          jobDescription: application.jobDescription || "",
        });
      } else {
        reset({
          companyName: "",
          jobTitle: "",
          jobUrl: "",
          status: "APPLIED",
          notes: "",
          jobDescription: "",
        });
      }
    }
  }, [isOpen, application, reset]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (application && onDelete) {
      if (window.confirm("Are you sure you want to delete this application?")) {
        await onDelete(application.id);
        onClose();
      }
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/60 transform transition-all">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {application ? "Edit Application" : "New Application"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors p-1.5 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company *</label>
              <input
                {...register("companyName")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700"
                placeholder="e.g. Google"
              />
              {errors.companyName && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role / Job Title *</label>
              <input
                {...register("jobTitle")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700"
                placeholder="e.g. Frontend Engineer"
              />
              {errors.jobTitle && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.jobTitle.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job URL</label>
              <input
                {...register("jobUrl")}
                type="url"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700"
                placeholder="https://..."
              />
              {errors.jobUrl && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.jobUrl.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                {...register("status")}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-700 appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
              >
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none text-slate-700 text-sm"
                placeholder="Interview details, contact info..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Description</label>
              <textarea
                {...register("jobDescription")}
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all resize-none text-slate-700 text-sm"
                placeholder="Paste the job description here for match score..."
              />
              <p className="text-xs text-slate-400 font-medium mt-2">Used to calculate match score against your resume</p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-100">
            {application ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 flex items-center text-sm font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} className="mr-1.5" />
                Delete
              </button>
            ) : (
              <div></div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 border border-transparent rounded-xl hover:bg-primary-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
