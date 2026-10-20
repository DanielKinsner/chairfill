import type { Metadata } from "next";
import { SetupWizard } from "@/components/setup/wizard";
import { Toaster } from "@/components/shell";

export const metadata: Metadata = { title: "Set up ChairFill" };

// AUTH: production limits setup to the office manager role.
export default function SetupPage() {
  return (
    <>
      <SetupWizard />
      <Toaster />
    </>
  );
}
