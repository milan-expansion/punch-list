"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  LoaderCircle,
  MapPin,
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
  laser_room_count: number;
  notes: string;
};

const initialForm: ProjectForm = {
  clinic_name: "",
  clinic_number: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
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
  laser_room_count: 1,
  notes: "",
};

export default function NewProjectPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(
    field: keyof ProjectForm,
    value: string | number,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.clinic_name.trim()) {
      setErrorMessage("Clinic name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        clinic_name: form.clinic_name.trim(),
        clinic_number: form.clinic_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        zip_code: form.zip_code.trim() || null,
        status: "Setup",
        walkthrough_date: form.walkthrough_date || null,
        target_completion_date: form.target_completion_date || null,
        general_contractor: form.general_contractor.trim() || null,
        superintendent_name: form.superintendent_name.trim() || null,
        superintendent_email: form.superintendent_email.trim() || null,
        superintendent_phone: form.superintendent_phone.trim() || null,
        architect: form.architect.trim() || null,
        milan_cpm_name: form.milan_cpm_name.trim() || null,
        landlord_contact: form.landlord_contact.trim() || null,
        drawing_set: form.drawing_set.trim() || null,
        drawing_revision: form.drawing_revision.trim() || null,
        laser_room_count: form.laser_room_count,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setErrorMessage(
        projectError?.message || "Unable to create the clinic.",
      );
      setIsSaving(false);
      return;
    }

    const standardRooms = [
      {
        project_id: project.id,
        room_type: "Exterior + Storefront",
        room_name: "Exterior + Storefront",
        sort_order: 10,
      },
      {
        project_id: project.id,
        room_type: "Lobby + Reception",
        room_name: "Lobby + Reception",
        sort_order: 20,
      },
      {
        project_id: project.id,
        room_type: "Hallway",
        room_name: "Hallway",
        sort_order: 30,
      },
      {
        project_id: project.id,
        room_type: "Consultation Room",
        room_name: "Consultation Room",
        sort_order: 40,
      },
      {
        project_id: project.id,
        room_type: "Chart Room",
        room_name: "Chart Room",
        sort_order: 50,
      },
      {
        project_id: project.id,
        room_type: "Office",
        room_name: "Office",
        sort_order: 60,
      },
      ...Array.from(
        { length: form.laser_room_count },
        (_, index) => ({
          project_id: project.id,
          room_type: "Laser Room",
          room_name: `Laser Room ${index + 1}`,
          room_number: `${index + 1}`,
          sort_order: 70 + index,
        }),
      ),
      {
        project_id: project.id,
        room_type: "Restroom",
        room_name: "Restroom",
        sort_order: 100,
      },
      {
        project_id: project.id,
        room_type: "Storage + Mechanical",
        room_name: "Storage + Mechanical",
        sort_order: 110,
      },
      {
        project_id: project.id,
        room_type: "Overall Clinic – Life Safety",
        room_name: "Overall Clinic – Life Safety",
        sort_order: 120,
      },
      {
        project_id: project.id,
        room_type: "Overall Clinic – Finishes + Systems",
        room_name: "Overall Clinic – Finishes + Systems",
        sort_order: 130,
      },
    ];

    const { error: roomsError } = await supabase
      .from("project_rooms")
      .insert(standardRooms);

    if (roomsError) {
      await supabase.from("projects").delete().eq("id", project.id);

      setErrorMessage(
        `The clinic could not be completed: ${roomsError.message}`,
      );
      setIsSaving(false);
      return;
    }

    const { error: checklistError } = await supabase.rpc(
  "generate_project_punch_list",
  {
    target_project_id: project.id,
  },
);

if (checklistError) {
  await supabase.from("projects").delete().eq("id", project.id);

  setErrorMessage(
    `The clinic checklist could not be generated: ${checklistError.message}`,
  );
  setIsSaving(false);
  return;
}

    await supabase.from("project_activity").insert({
      project_id: project.id,
      action_type: "Project Created",
      description: `${form.clinic_name.trim()} was created.`,
    });

    router.push("/");
    router.refresh();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#238bac]"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Clinic setup
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
            Create New Clinic
          </h1>

          <p className="mt-2 text-slate-600">
            Enter the project information used to prepare its walkthrough and
            punch list.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <FormSection
            title="Clinic Information"
            description="Identify the clinic and construction location."
            icon={Building2}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Clinic Name"
                required
                value={form.clinic_name}
                placeholder="Milan Laser – Charleston"
                onChange={(value) => updateField("clinic_name", value)}
              />

              <TextField
                label="Clinic Number"
                value={form.clinic_number}
                placeholder="Optional"
                onChange={(value) => updateField("clinic_number", value)}
              />

              <div className="md:col-span-2">
                <TextField
                  label="Street Address"
                  value={form.address}
                  placeholder="123 Main Street, Suite 100"
                  onChange={(value) => updateField("address", value)}
                />
              </div>

              <TextField
                label="City"
                value={form.city}
                onChange={(value) => updateField("city", value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="State"
                  value={form.state}
                  maxLength={2}
                  placeholder="NE"
                  onChange={(value) => updateField("state", value)}
                />

                <TextField
                  label="ZIP Code"
                  value={form.zip_code}
                  onChange={(value) => updateField("zip_code", value)}
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Walkthrough Schedule"
            description="Set the anticipated punch and completion dates."
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
                  updateField("target_completion_date", value)
                }
              />
            </div>
          </FormSection>

          <FormSection
            title="Project Team"
            description="Record the construction and Milan contacts."
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
                onChange={(value) => updateField("architect", value)}
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
            title="Project Configuration"
            description="These values customize the clinic's punch list."
            icon={MapPin}
          >
            <div className="grid gap-5 md:grid-cols-3">
              <TextField
                label="Drawing Set"
                value={form.drawing_set}
                placeholder="Permit Set"
                onChange={(value) => updateField("drawing_set", value)}
              />

              <TextField
                label="Drawing Revision"
                value={form.drawing_revision}
                placeholder="Revision date or number"
                onChange={(value) =>
                  updateField("drawing_revision", value)
                }
              />

              <NumberField
                label="Number of Laser Rooms"
                value={form.laser_room_count}
                min={0}
                max={20}
                onChange={(value) =>
                  updateField("laser_room_count", value)
                }
              />

              <div className="md:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Project Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  rows={4}
                  placeholder="Enter any clinic-specific construction details."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
                />
              </div>
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#0086aa] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <LoaderCircle className="animate-spin" size={19} />
                  Creating Clinic...
                </>
              ) : (
                <>
                  <Save size={19} />
                  Create Clinic
                </>
              )}
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
  icon: React.ComponentType<{ size?: number }>;
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
          <p className="mt-1 text-sm text-slate-500">{description}</p>
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
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
};

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  maxLength,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-[#f04c37]">*</span>}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
      />
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
      />
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: NumberFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) =>
          onChange(Number.parseInt(event.target.value, 10) || 0)
        }
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#238bac] focus:ring-4 focus:ring-[#238bac]/10"
      />
    </div>
  );
}