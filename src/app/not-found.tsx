import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <div className="shell">
      <PageHeader title="We can't find that page">The link may be old, or the tool may have a different name now.</PageHeader>
      <div className="flex flex-wrap gap-3"><ButtonLink href="/tools">Browse all tools</ButtonLink><ButtonLink href="/" variant="secondary">Go home</ButtonLink></div>
    </div>
  );
}
