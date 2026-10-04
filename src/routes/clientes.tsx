import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/customers-page";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — SmartLar Hub" },
      {
        name: "description",
        content: "Cadastre clientes e consulte seu histórico de pedidos no SmartLar Hub.",
      },
      { property: "og:title", content: "Clientes — SmartLar Hub" },
      { property: "og:description", content: "Gestão de clientes e histórico de pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});
