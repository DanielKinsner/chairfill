import type { Metadata } from "next";
import { PickOffer } from "@/components/patient/pick-offer";

export const metadata: Metadata = { title: "Patient view" };

export default function PatientPage() {
  return <PickOffer />;
}
