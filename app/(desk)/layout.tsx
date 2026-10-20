import { DeskShell } from "@/components/shell";

// AUTH: production gates everything under (desk) to signed-in staff.
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <DeskShell>{children}</DeskShell>;
}
