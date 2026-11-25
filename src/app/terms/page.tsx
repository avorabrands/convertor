import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <div className="shell">
      <PageHeader title="Terms">The short version of how to use {site.name} fairly.</PageHeader>
      <Prose>
        <ul>
          <li>Only convert files you have the right to use.</li>
          <li>You keep all rights to your files and results.</li>
          <li>Check your converted file before you submit it. Complex documents can change during conversion.</li>
          <li>Keep your original. Conversions make a new file and never change the one you chose.</li>
          <li>The tools are provided as they are. We can't promise every file will convert, or that the result will meet a particular requirement.</li>
        </ul>
        <p>These are starter terms and haven't had a legal review.</p>
      </Prose>
    </div>
  );
}
