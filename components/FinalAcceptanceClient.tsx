"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  TriangleAlert,
  FileText,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import SignaturePad from "@/components/SignaturePad";
import { supabase } from "@/lib/supabase";

type FinalAcceptanceClientProps = {
  projectId: string;
};

type Project = {
  id: string;
  clinic_name: string;
  status: string;
  completed_at: string | null;
};

type Signoff = {
  id: string;
  signoff_type: "General Contractor" | "Milan CPM";
  printed_name: string;
  title: string | null;
  company: string | null;
  signature_storage_path: string;
  signed_at: string;
  signedUrl?: string;
};

type AcceptanceSummary = {
  totalItems: number;
  reviewedItems: number;
  outstandingItems: number;
  openDeficiencies: number;
  missingCloseout: number;
};

export default function FinalAcceptanceClient({
  projectId,
}: FinalAcceptanceClientProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [signoffs, setSignoffs] = useState<Signoff[]>([]);

  const [summary, setSummary] = useState<AcceptanceSummary>({
    totalItems: 0,
    reviewedItems: 0,
    outstandingItems: 0,
    openDeficiencies: 0,
    missingCloseout: 0,
  });

  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAcceptance = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: checklistData, error: checklistError },
      { data: deficiencyData, error: deficiencyError },
      { data: closeoutData, error: closeoutError },
      { data: signoffData, error: signoffError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, clinic_name, status, completed_at, final_acceptance_notes",
        )
        .eq("id", projectId)
        .single(),

      supabase
        .from("project_checklist_items")
        .select("id, status")
        .eq("project_id", projectId),

      supabase
        .from("deficiencies")
        .select("id, status")
        .eq("project_id", projectId),

      supabase
        .from("project_closeout_items")
        .select("id, status")
        .eq("project_id", projectId),

      supabase
        .from("project_signoffs")
        .select("*")
        .eq("project_id", projectId),
    ]);

    if (
      projectError ||
      checklistError ||
      deficiencyError ||
      closeoutError ||
      signoffError
    ) {
      setErrorMessage(
        projectError?.message ||
          checklistError?.message ||
          deficiencyError?.message ||
          closeoutError?.message ||
          signoffError?.message ||
          "Unable to load final acceptance.",
      );

      setIsLoading(false);
      return;
    }

    const checklist = checklistData ?? [];
    const deficiencies = deficiencyData ?? [];
    const closeout = closeoutData ?? [];
    const loadedSignoffs = (signoffData ?? []) as Signoff[];

    const signoffsWithUrls = await Promise.all(
      loadedSignoffs.map(async (signoff) => {
        const { data } = await supabase.storage
          .from("project-documents")
          .createSignedUrl(
            signoff.signature_storage_path,
            3600,
          );

        return {
          ...signoff,
          signedUrl: data?.signedUrl,
        };
      }),
    );

    setProject(projectData as Project);
    setNotes(projectData.final_acceptance_notes ?? "");
    setSignoffs(signoffsWithUrls);

    setSummary({
      totalItems: checklist.length,
      reviewedItems: checklist.filter(
        (item) => item.status !== "Not Reviewed",
      ).length,
      outstandingItems: checklist.filter(
        (item) => item.status === "Not Reviewed",
      ).length,
      openDeficiencies: deficiencies.filter(
        (item) => item.status !== "Closed",
      ).length,
      missingCloseout: closeout.filter(
        (item) => item.status === "Missing",
      ).length,
    });

    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadAcceptance();
  }, [loadAcceptance]);

  const hasGeneralContractorSignoff = signoffs.some(
    (signoff) => signoff.signoff_type === "General Contractor",
  );

  const hasMilanSignoff = signoffs.some(
    (signoff) => signoff.signoff_type === "Milan CPM",
  );

  const requirementsComplete =
    summary.outstandingItems === 0 &&
    summary.openDeficiencies === 0 &&
    summary.missingCloseout === 0;

  const canComplete =
    requirementsComplete &&
    hasGeneralContractorSignoff &&
    hasMilanSignoff;

  async function completeProject() {
    if (!canComplete) return;

    setIsCompleting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("projects")
      .update({
        status: "Completed",
        completed_at: new Date().toISOString(),
        final_acceptance_notes: notes.trim() || null,
      })
      .eq("id", projectId);

    if (error) {
      setErrorMessage(error.message);
      setIsCompleting(false);
      return;
    }

    await loadAcceptance();
    setIsCompleting(false);
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoaderCircle
            className="animate-spin text-[#238bac]"
            size={34}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#238bac]"
        >
          <ArrowLeft size={17} />
          Back to clinic
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Completion and acceptance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#374151]">
            Final Acceptance
          </h1>

            <div className="mt-5 print:hidden">
  <Link
    href={`/projects/${projectId}/report`}
    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#238bac] bg-white px-5 font-bold text-[#238bac] hover:bg-[#238bac]/5"
  >
    <FileText size={19} />
    View Final Report
  </Link>
</div>

          <p className="mt-2 text-slate-600">
            {project?.clinic_name}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {project?.status === "Completed" && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 size={25} />
            <div>
              <p className="font-bold">Project Completed</p>
              <p className="text-sm">
                Final acceptance has been recorded.
              </p>
            </div>
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ValidationCard
            label="Walkthrough"
            value={`${summary.reviewedItems} / ${summary.totalItems}`}
            complete={summary.outstandingItems === 0}
            detail={`${summary.outstandingItems} outstanding`}
          />

          <ValidationCard
            label="Deficiencies"
            value={summary.openDeficiencies}
            complete={summary.openDeficiencies === 0}
            detail="open deficiencies"
          />

          <ValidationCard
            label="Closeout"
            value={summary.missingCloseout}
            complete={summary.missingCloseout === 0}
            detail="missing documents"
          />

          <ValidationCard
            label="Signatures"
            value={`${signoffs.length} / 2`}
            complete={
              hasGeneralContractorSignoff && hasMilanSignoff
            }
            detail="required signoffs"
          />
        </section>

        {!requirementsComplete && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole
                className="mt-0.5 shrink-0 text-amber-700"
                size={22}
              />

              <div>
                <h2 className="font-bold text-amber-900">
                  Final acceptance is locked
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Complete all walkthrough items, close every deficiency,
                  and receive or mark N/A every closeout requirement before
                  completing the project.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="mt-7">
          <div className="mb-4 flex items-center gap-2">
            <PenLine size={21} className="text-[#238bac]" />
            <h2 className="text-xl font-bold text-[#374151]">
              Required Signoffs
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {hasGeneralContractorSignoff ? (
              <CompletedSignoff
                signoff={
                  signoffs.find(
                    (item) =>
                      item.signoff_type === "General Contractor",
                  )!
                }
              />
            ) : (
              <SignaturePad
                projectId={projectId}
                signoffType="General Contractor"
                onSaved={loadAcceptance}
              />
            )}

            {hasMilanSignoff ? (
              <CompletedSignoff
                signoff={
                  signoffs.find(
                    (item) => item.signoff_type === "Milan CPM",
                  )!
                }
              />
            ) : (
              <SignaturePad
                projectId={projectId}
                signoffType="Milan CPM"
                onSaved={loadAcceptance}
              />
            )}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block font-bold text-[#374151]">
            Final Acceptance Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Enter any final acceptance or turnover notes."
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#238bac]"
          />

          <button
            type="button"
            disabled={
              !canComplete ||
              isCompleting ||
              project?.status === "Completed"
            }
            onClick={() => void completeProject()}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#04b0b9] px-6 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isCompleting ? (
              <LoaderCircle className="animate-spin" size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}

            {project?.status === "Completed"
              ? "Project Completed"
              : "Complete Project"}
          </button>
        </section>
      </div>
    </AppShell>
  );
}

type ValidationCardProps = {
  label: string;
  value: number | string;
  complete: boolean;
  detail: string;
};

function ValidationCard({
  label,
  value,
  complete,
  detail,
}: ValidationCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        complete ? "border-emerald-200" : "border-amber-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#374151]">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {detail}
          </p>
        </div>

        {complete ? (
          <CheckCircle2
            className="text-emerald-600"
            size={24}
          />
        ) : (
          <CircleAlert className="text-amber-600" size={24} />
        )}
      </div>
    </div>
  );
}

function CompletedSignoff({
  signoff,
}: {
  signoff: Signoff;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="text-emerald-600" size={24} />

        <div>
          <h3 className="font-bold text-[#374151]">
            {signoff.signoff_type}
          </h3>
          <p className="text-sm text-emerald-700">
            Signoff completed
          </p>
        </div>
      </div>

      {signoff.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signoff.signedUrl}
          alt={`${signoff.signoff_type} signature`}
          className="mt-4 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
        />
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="font-bold text-[#374151]">
          {signoff.printed_name}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {[signoff.title, signoff.company]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Signed{" "}
          {new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(new Date(signoff.signed_at))}
        </p>
      </div>
    </div>
  );
}