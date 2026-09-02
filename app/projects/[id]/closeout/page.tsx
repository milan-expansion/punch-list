import CloseoutTrackerClient from "@/components/CloseoutTrackerClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CloseoutPage({
  params,
}: PageProps) {
  const { id } = await params;

  return <CloseoutTrackerClient projectId={id} />;
}