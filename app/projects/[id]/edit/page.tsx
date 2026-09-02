"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  LoaderCircle,
  Save,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type ProjectForm = {
  clinic_name: string;
  clinic_number: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  status: string;
  walkthrough_date: string;
  target_completion_date: string;
  general_contractor: string;
  superintendent_name: string;
  superintendent_email: string;
  superintendent_phone: string;
  architect: string;
  milan_cpm_name: string;
  landlord_contact: string;
  drawing_set: string;
  drawing_revision: string;
  notes: string;
};

const emptyForm: ProjectForm = {
  clinic_name: "",
  clinic_number: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  status: "Setup",
  walkthrough_date: "",
  target_completion_date: "",
  general_contractor: "",
  superintendent_name: "",
  superintendent_email: "",
  superintendent_phone: "",
  architect: "",
  milan_cpm_name: "",
  landlord_contact: "",
  drawing_set: "",
  drawing_revision: "",
  notes: "",
};

const projectStatuses = [
  "Setup",
  "Ready for Walk",
  "Punch in Progress",
  "Corrections in Progress",
  "Verification",
  "Completed",
  "Archived",
];

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProject = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("projects")
      .select(
        `
          clinic_name,
          clinic_number,
          address,
          city,
          state,
          zip_code,
          status,
          walkthrough_date,
          target_completion_date,
          general_contractor,
          superintendent_name,
          superintendent_email,
          superintendent_phone,
          architect,
          milan_cpm_name,
          landlord_contact,
          drawing_set,
          drawing_revision,
          notes
        `,
      )
      .eq("id", projectId)
      .single();

    if (error || !data) {
      setErrorMessage(
        error?.message || "Unable to load the clinic.",
      );
      setIsLoading(false);
      return;
    }

    setForm({
      clinic_name: data.clinic_name ?? "",
      clinic_number: data.clinic_number ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      zip_code: data.zip_code ?? "",
      status: data.status ?? "Setup",
      walkthrough_date: data.walkthrough_date ?? "",
      target_completion_date:
        data.target_completion_date ?? "",
      general_contractor: data.general_contractor ?? "",
      superintendent_name: data.superintendent_name ?? "",
      superintendent_email: data.superintendent_email ?? "",
      superintendent_phone: data.superintendent_phone ?? "",
      architect: data.architect ?? "",
      milan_cpm_name: data.milan_cpm_name ?? "",
      landlord_contact: data.landlord_contact ?? "",
      drawing_set: data.drawing_set ?? "",
      drawing_revision: data.drawing_revision ?? "",
      notes: data.notes ?? "",
    });

    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function updateField(
    field: keyof ProjectForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!form.clinic_name.trim()) {
      setErrorMessage("Clinic name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("projects")
      .update({
        clinic_name: form.clinic_name.trim(),
        clinic_number: form.clinic_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        zip_code: form.zip_code.trim() || null,
        status: form.status,
        walkthrough_date: form.walkthrough_date || null,
        target_completion_date:
          form.target_completion_date || null,
        general_contractor:
          form.general_contractor.trim() || null,
        superintendent_name:
          form.superintendent_name.trim() || null,
        superintendent_email:
          form.superintendent_email.trim() || null,
        superintendent_phone:
          form.superintendent_phone.trim() || null,
        architect: form.architect.trim() || null,
        milan_cpm_name: form.milan_cpm_name.trim() || null,
        landlord_contact:
          form.landlord_contact.trim() || null,
        drawing_set: form.drawing_set.trim() || null,
        drawing_revision:
          form.drawing_revision.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", projectId);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    await supabase.from("project_activity").insert({
      project_id: projectId,
      action_type: "Project Updated",
      description: `${form.clinic_name.trim()} project information was updated.`,
    });

    setSuccessMessage("Clinic information saved successfully.");
    setIsSaving(false);
    router.refresh();
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
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#238bac]"
        >
          <ArrowLeft size={17} />
          Back to clinic
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Project setup
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#374151]">
            Edit Clinic
          </h1>

          <p className="mt-2 text-slate-600">
            Update project information and schedule the final
            walkthrough.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          <FormSection
            title="Clinic Information"
            description="Update the clinic name, location, and status."
            icon={Building2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Clinic Name"
                required
                value={form.clinic_name}
                onChange={(value) =>
                  updateField("clinic_name", value)
                }
              />

              <TextField
                label="Clinic Number"
                value={form.clinic_number}
                onChange={(value) =>
                  updateField("clinic_number", value)
                }
              />

              <div className="md:col-span-2">
                <TextField
                  label="Street Address"
                  value={form.address}
                  onChange={(value) =>
                    updateField("address", value)
                  }
                />
              </div>

              <TextField
                label="City"
                value={form.city}
                onChange={(value) =>
                  updateField("city", value)
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="State"
                  value={form.state}
                  maxLength={2}
                  onChange={(value) =>
                    updateField("state", value)
                  }
                />

                <TextField
                  label="ZIP Code"
                  value={form.zip_code}
                  onChange={(value) =>
                    updateField("zip_code", value)
                  }
                />
              </div>

              <div className="md:col-span-2">
                <SelectField
                  label="Project Status"
                  value={form.status}
                  options={projectStatuses}
                  onChange={(value) =>
                    updateField("status", value)
                  }
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Walkthrough Schedule"
            description="Dates may remain blank until the walkthrough is scheduled."
            icon={CalendarDays}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <DateField
                label="Final Walkthrough Date"
                value={form.walkthrough_date}
                onChange={(value) =>
                  updateField("walkthrough_date", value)
                }
              />

              <DateField
                label="Target Completion Date"
                value={form.target_completion_date}
                onChange={(value) =>
                  updateField(
                    "target_completion_date",
                    value,
                  )
                }
              />
            </div>
          </FormSection>

          <FormSection
            title="Project Team"
            description="Update contractor and project contacts."
            icon={Users}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="General Contractor"
                value={form.general_contractor}
                onChange={(value) =>
                  updateField("general_contractor", value)
                }
              />

              <TextField
                label="Superintendent"
                value={form.superintendent_name}
                onChange={(value) =>
                  updateField("superintendent_name", value)
                }
              />

              <TextField
                label="Superintendent Email"
                type="email"
                value={form.superintendent_email}
                onChange={(value) =>
                  updateField("superintendent_email", value)
                }
              />

              <TextField
                label="Superintendent Phone"
                type="tel"
                value={form.superintendent_phone}
                onChange={(value) =>
                  updateField("superintendent_phone", value)
                }
              />

              <TextField
                label="Architect"
                value={form.architect}
                onChange={(value) =>
                  updateField("architect", value)
                }
              />

              <TextField
                label="Milan CPM"
                value={form.milan_cpm_name}
                onChange={(value) =>
                  updateField("milan_cpm_name", value)
                }
              />

              <div className="md:col-span-2">
                <TextField
                  label="Landlord Contact"
                  value={form.landlord_contact}
                  onChange={(value) =>
                    updateField("landlord_contact", value)
                  }
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Project Details"
            description="Update drawing and project-specific information."
            icon={Building2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Drawing Set"
                value={form.drawing_set}
                onChange={(value) =>
                  updateField("drawing_set", value)
                }
              />

              <TextField
                label="Drawing Revision"
                value={form.drawing_revision}
                onChange={(value) =>
                  updateField("drawing_revision", value)
                }
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Project Notes
                </label>

                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#238bac]"
                />
              </div>
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-6 font-bold text-white hover:bg-[#0086aa] disabled:opacity-60"
            >
              {isSaving ? (
                <LoaderCircle
                  className="animate-spin"
                  size={19}
                />
              ) : (
                <Save size={19} />
              )}

              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

type FormSectionProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  children: React.ReactNode;
};

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: FormSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
          <Icon size={21} />
        </div>

        <div>
          <h2 className="font-bold text-[#374151]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
};

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  maxLength,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-[#f04c37]">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}