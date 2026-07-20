import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Application, ApplicationStatus, CreateApplicationDto, UpdateApplicationDto } from "../services/applications.js";
import { X, Trash2 } from "lucide-react";
import { useEffect } from "react";

const schema = z.object({
  companyName: z.string().min(1, "Company is required"),
  jobTitle: z.string().min(1, "Role is required"),
  jobUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"]),
  notes: z.string().optional(),
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
        });
      } else {
        reset({
          companyName: "",
          jobTitle: "",
          jobUrl: "",
          status: "APPLIED",
          notes: "",
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-semibold text-gray-800">
            {application ? "Edit Application" : "New Application"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <input
                {...register("companyName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g. Google"
              />
              {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role / Job Title *</label>
              <input
                {...register("jobTitle")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g. Frontend Engineer"
              />
              {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{errors.jobTitle.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job URL</label>
              <input
                {...register("jobUrl")}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="https://..."
              />
              {errors.jobUrl && <p className="text-red-500 text-sm mt-1">{errors.jobUrl.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register("status")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="Interview details, contact info..."
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between pt-4 border-t border-gray-100">
            {application ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 flex items-center text-sm font-medium px-3 py-2 rounded-md hover:bg-red-50 transition"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </button>
            ) : (
              <div></div> // Empty div for flex spacing
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
