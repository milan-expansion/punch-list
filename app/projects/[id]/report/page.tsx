import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
} from "lucide-react";
import PrintReportButton from "@/components/PrintReportButton";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Project = {
  id: string;
  clinic_name: string;
  clinic_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: string;
  walkthrough_date: string | null;
  target_completion_date: string | null;
  general_contractor: string | null;
  superintendent_name: string | null;
  architect: string | null;
  milan_cpm_name: string | null;
  drawing_set: string | null;
  drawing_revision: string | null;
  final_acceptance_notes: string | null;
  completed_at: string | null;
};

type Room = {
  id: string;
  room_name: string;
  sort_order: number;
};

type ChecklistItem = {
  id: string;
  room_id: string;
  item_title: string;
  measurable_standard: string | null;
  status: string;
  notes: string | null;
  sort_order: number;
};

type Deficiency = {
  id: string;
  room_id: string | null;
  description: string;
  trade: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  correction_notes: string | null;
  verification_notes: string | null;
};

type Photo = {
  id: string;
  deficiency_id: string;
  photo_type: string;
  caption: string | null;
  storage_path: string;
  signedUrl?: string;
};

type CloseoutItem = {
  id: string;
  category: string;
  item_name: string;
  status: string;
  notes: string | null;
  sort_order: number;
};

type Signoff = {
  id: string;
  signoff_type: string;
  printed_name: string;
  title: string | null;
  company: string | null;
  signature_storage_path: string;
  signed_at: string;
  signedUrl?: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

export default async function ProjectReportPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: projectData, error: projectError },
    { data: roomData },
    { data: checklistData },
    { data: deficiencyData },
    { data: photoData },
    { data: closeoutData },
    { data: signoffData },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),

    supabase
      .from("project_rooms")
      .select("id, room_name, sort_order")
      .eq("project_id", id)
      .order("sort_order"),

    supabase
      .from("project_checklist_items")
      .select(
        "id, room_id, item_title, measurable_standard, status, notes, sort_order",
      )
      .eq("project_id", id)
      .order("sort_order"),

    supabase
      .from("deficiencies")
      .select(
        "id, room_id, description, trade, priority, status, due_date, correction_notes, verification_notes",
      )
      .eq("project_id", id)
      .order("created_at"),

    supabase
      .from("deficiency_photos")
      .select(
        "id, deficiency_id, photo_type, caption, storage_path",
      )
      .eq("project_id", id)
      .order("created_at"),

    supabase
      .from("project_closeout_items")
      .select(
        "id, category, item_name, status, notes, sort_order",
      )
      .eq("project_id", id)
      .order("sort_order"),

    supabase
      .from("project_signoffs")
      .select("*")
      .eq("project_id", id)
      .order("signed_at"),
  ]);

  if (projectError || !projectData) {
    notFound();
  }

  const project = projectData as Project;
  const rooms = (roomData ?? []) as Room[];
  const checklist = (checklistData ?? []) as ChecklistItem[];
  const deficiencies = (deficiencyData ?? []) as Deficiency[];
  const closeout = (closeoutData ?? []) as CloseoutItem[];

  const photos = await Promise.all(
    ((photoData ?? []) as Photo[]).map(async (photo) => {
      const { data } = await supabase.storage
        .from("punch-photos")
        .createSignedUrl(photo.storage_path, 3600);

      return {
        ...photo,
        signedUrl: data?.signedUrl,
      };
    }),
  );

  const signoffs = await Promise.all(
    ((signoffData ?? []) as Signoff[]).map(async (signoff) => {
      const { data } = await supabase.storage
        .from("project-documents")
        .createSignedUrl(signoff.signature_storage_path, 3600);

      return {
        ...signoff,
        signedUrl: data?.signedUrl,
      };
    }),
  );

  const reviewedItems = checklist.filter(
    (item) => item.status !== "Not Reviewed",
  ).length;

  const passedItems = checklist.filter(
    (item) => item.status === "Passed",
  ).length;

  const deficiencyItems = checklist.filter(
    (item) => item.status === "Deficiency",
  ).length;

  const notApplicableItems = checklist.filter(
    (item) => item.status === "N/A",
  ).length;

  const openDeficiencies = deficiencies.filter(
    (item) => item.status !== "Closed",
  ).length;

  const receivedCloseout = closeout.filter(
    (item) => item.status === "Received",
  ).length;

  const closeoutCategories = Array.from(
    new Set(closeout.map((item) => item.category)),
  );

  const address = [
    project.address,
    [project.city, project.state].filter(Boolean).join(", "),
    project.zip_code,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-800 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/projects/${id}/acceptance`}
            className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-[#238bac]"
          >
            <ArrowLeft size={18} />
            Back to Final Acceptance
          </Link>

          <PrintReportButton />
        </div>

        <article className="bg-white shadow-sm print:shadow-none">
          <header className="border-b-8 border-[#04b0b9] bg-[#374151] px-8 py-8 text-white print:px-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#04b0b9]">
              Milan Laser Hair Removal
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Construction Punch List Report
            </h1>

            <p className="mt-2 text-lg text-slate-200">
              {project.clinic_name}
            </p>
          </header>

          <div className="space-y-8 p-8 print:p-6">
            <ReportSection title="Project Information">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <ReportField
                  label="Clinic"
                  value={project.clinic_name}
                />
                <ReportField
                  label="Clinic Number"
                  value={project.clinic_number || "Not provided"}
                />
                <ReportField
                  label="Address"
                  value={address || "Not provided"}
                />
                <ReportField
                  label="Project Status"
                  value={project.status}
                />
                <ReportField
                  label="Walkthrough Date"
                  value={formatDate(project.walkthrough_date)}
                />
                <ReportField
                  label="Completion Date"
                  value={formatDate(project.completed_at)}
                />
                <ReportField
                  label="General Contractor"
                  value={
                    project.general_contractor || "Not provided"
                  }
                />
                <ReportField
                  label="Superintendent"
                  value={
                    project.superintendent_name || "Not provided"
                  }
                />
                <ReportField
                  label="Architect"
                  value={project.architect || "Not provided"}
                />
                <ReportField
                  label="Milan CPM"
                  value={project.milan_cpm_name || "Not provided"}
                />
                <ReportField
                  label="Drawing Set"
                  value={project.drawing_set || "Not provided"}
                />
                <ReportField
                  label="Drawing Revision"
                  value={
                    project.drawing_revision || "Not provided"
                  }
                />
              </div>
            </ReportSection>

            <ReportSection title="Completion Summary">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <SummaryBox
                  label="Total"
                  value={checklist.length}
                />
                <SummaryBox
                  label="Reviewed"
                  value={reviewedItems}
                />
                <SummaryBox
                  label="Passed"
                  value={passedItems}
                />
                <SummaryBox
                  label="Deficiencies"
                  value={deficiencyItems}
                />
                <SummaryBox
                  label="N/A"
                  value={notApplicableItems}
                />
                <SummaryBox
                  label="Open"
                  value={openDeficiencies}
                />
              </div>
            </ReportSection>

            <ReportSection title="Room-by-Room Checklist">
              <div className="space-y-6">
                {rooms.map((room) => {
                  const roomItems = checklist.filter(
                    (item) => item.room_id === room.id,
                  );

                  return (
                    <div
                      key={room.id}
                      className="break-inside-avoid"
                    >
                      <div className="flex items-center justify-between bg-[#238bac] px-4 py-2 text-white">
                        <h3 className="font-bold">
                          {room.room_name}
                        </h3>

                        <span className="text-xs font-semibold">
                          {
                            roomItems.filter(
                              (item) =>
                                item.status !== "Not Reviewed",
                            ).length
                          }{" "}
                          / {roomItems.length} reviewed
                        </span>
                      </div>

                      <div className="divide-y divide-slate-200 border-x border-b border-slate-200">
                        {roomItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[1fr_110px] gap-3 px-4 py-2 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {item.item_title}
                              </p>

                              {item.notes && (
                                <p className="mt-1 text-slate-500">
                                  Note: {item.notes}
                                </p>
                              )}
                            </div>

                            <p
                              className={`text-right font-bold ${
                                item.status === "Passed"
                                  ? "text-emerald-700"
                                  : item.status === "Deficiency"
                                    ? "text-red-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {item.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ReportSection>

            <ReportSection title="Deficiency Log">
              {deficiencies.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No deficiencies were recorded.
                </p>
              ) : (
                <div className="space-y-5">
                  {deficiencies.map((deficiency, index) => {
                    const room = rooms.find(
                      (item) => item.id === deficiency.room_id,
                    );

                    const deficiencyPhotos = photos.filter(
                      (photo) =>
                        photo.deficiency_id === deficiency.id,
                    );

                    return (
                      <div
                        key={deficiency.id}
                        className="break-inside-avoid rounded-lg border border-slate-300 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase text-[#238bac]">
                              Deficiency #{index + 1}
                            </p>

                            <h3 className="mt-1 font-bold text-slate-800">
                              {deficiency.description}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              deficiency.status === "Closed"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {deficiency.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                          <ReportField
                            label="Room"
                            value={room?.room_name || "Not assigned"}
                          />
                          <ReportField
                            label="Trade"
                            value={
                              deficiency.trade ||
                              "General Contractor"
                            }
                          />
                          <ReportField
                            label="Priority"
                            value={deficiency.priority}
                          />
                          <ReportField
                            label="Due Date"
                            value={formatDate(deficiency.due_date)}
                          />
                        </div>

                        {deficiency.correction_notes && (
                          <p className="mt-3 text-xs text-slate-600">
                            <strong>Correction:</strong>{" "}
                            {deficiency.correction_notes}
                          </p>
                        )}

                        {deficiency.verification_notes && (
                          <p className="mt-2 text-xs text-slate-600">
                            <strong>Verification:</strong>{" "}
                            {deficiency.verification_notes}
                          </p>
                        )}

                        {deficiencyPhotos.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            {deficiencyPhotos.map((photo) => (
                              <div key={photo.id}>
                                {photo.signedUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={photo.signedUrl}
                                    alt={photo.photo_type}
                                    className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                                  />
                                )}

                                <p className="mt-1 text-center text-xs font-semibold text-slate-500">
                                  {photo.photo_type}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ReportSection>

            <ReportSection title="Closeout Documents">
              <div className="space-y-5">
                {closeoutCategories.map((category) => {
                  const categoryItems = closeout.filter(
                    (item) => item.category === category,
                  );

                  return (
                    <div
                      key={category}
                      className="break-inside-avoid"
                    >
                      <h3 className="border-b-2 border-[#04b0b9] pb-2 font-bold text-[#374151]">
                        {category}
                      </h3>

                      <div className="mt-2 divide-y divide-slate-200">
                        {categoryItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[1fr_90px] gap-3 py-2 text-xs"
                          >
                            <div>
                              <p className="font-semibold">
                                {item.item_name}
                              </p>

                              {item.notes && (
                                <p className="mt-1 text-slate-500">
                                  {item.notes}
                                </p>
                              )}
                            </div>

                            <p className="text-right font-bold">
                              {item.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <p className="text-sm font-bold text-[#374151]">
                  {receivedCloseout} of {closeout.length} documents
                  received
                </p>
              </div>
            </ReportSection>

            <ReportSection title="Final Acceptance">
              {project.final_acceptance_notes && (
                <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm">
                  <strong>Final notes:</strong>{" "}
                  {project.final_acceptance_notes}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {signoffs.map((signoff) => (
                  <div
                    key={signoff.id}
                    className="break-inside-avoid rounded-lg border border-slate-300 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-[#238bac]">
                      {signoff.signoff_type}
                    </p>

                    {signoff.signedUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signoff.signedUrl}
                        alt={`${signoff.signoff_type} signature`}
                        className="mt-3 h-24 w-full object-contain"
                      />
                    )}

                    <div className="mt-3 border-t border-slate-300 pt-3">
                      <p className="font-bold">
                        {signoff.printed_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[signoff.title, signoff.company]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Signed {formatDate(signoff.signed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          </div>

          <footer className="border-t border-slate-200 px-8 py-5 text-center text-xs text-slate-400 print:px-6">
            Milan Laser Hair Removal · Standard Construction Punch List
            · Generated {formatDate(new Date().toISOString())}
          </footer>
        </article>
      </div>
    </main>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b-2 border-[#238bac] pb-2">
        <FileText size={18} className="text-[#238bac]" />
        <h2 className="text-lg font-bold text-[#374151]">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function ReportField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold text-[#374151]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}