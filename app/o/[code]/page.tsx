import type { Metadata } from "next";
import { OfferPage } from "@/components/patient/offer-page";

export const metadata: Metadata = {
  title: "Your appointment offer",
  description: "Maple Family Dental has an opening for you. Tap yes to take it.",
};

export default async function Offer({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <OfferPage code={code.toUpperCase().slice(0, 8)} />;
}
