import { createFileRoute } from "@tanstack/react-router";
import { TechniciansPage } from "@/components/technicians-page";

export const Route = createFileRoute("/tecnicos")({
  head: () => ({ meta: [{ title: "Técnicos — SmartLar Hub" }] }),
  component: TechniciansPage,
});
