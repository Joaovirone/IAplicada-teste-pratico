import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPhone } from "@/lib/phone";
import type { Technician } from "@/lib/orders";
import {
  deleteTechnician,
  fetchTechnicians,
  saveTechnician,
  technicianSchema,
  type TechnicianInput,
} from "@/lib/technicians";

const techniciansKey = ["technicians"] as const;
const emptyForm: TechnicianInput = { nome: "", telefone: "", especialidade: "" };

export function TechniciansPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form, setForm] = useState<TechnicianInput>(emptyForm);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Technician | null>(null);
  const submitting = useRef(false);
  const deleting = useRef(false);

  const techniciansQuery = useQuery({
    queryKey: techniciansKey,
    queryFn: ({ signal }) => fetchTechnicians(signal),
    retry: false,
  });
  const saveMutation = useMutation({
    mutationFn: saveTechnician,
    onSuccess: async (technician, { id }) => {
      await queryClient.cancelQueries({ queryKey: techniciansKey });
      queryClient.setQueryData<Technician[]>(techniciansKey, (current = []) =>
        [...current.filter((item) => item.id !== technician.id), technician].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(id ? "Técnico atualizado com sucesso." : "Técnico cadastrado com sucesso.");
    },
    onError: () =>
      setFormError("Não foi possível salvar o técnico. Verifique sua conexão e tente novamente."),
    onSettled: () => {
      submitting.current = false;
    },
  });
  const deleteMutation = useMutation({ mutationFn: deleteTechnician });

  function openForm(technician?: Technician) {
    setEditing(technician ?? null);
    setForm(
      technician
        ? {
            nome: technician.nome,
            telefone: formatPhone(technician.telefone ?? ""),
            especialidade: technician.especialidade ?? "",
          }
        : emptyForm,
    );
    setFormError("");
    setFormOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const parsed = technicianSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os dados do técnico.");
      return;
    }
    submitting.current = true;
    setFormError("");
    saveMutation.mutate({ input: parsed.data, ...(editing ? { id: editing.id } : {}) });
  }

  async function handleDelete() {
    if (!toDelete || deleting.current) return;
    const id = toDelete.id;
    deleting.current = true;
    try {
      await deleteMutation.mutateAsync(id);
      await queryClient.cancelQueries({ queryKey: techniciansKey });
      queryClient.setQueryData<Technician[]>(techniciansKey, (current = []) =>
        current.filter((item) => item.id !== id),
      );
      setToDelete(null);
      toast.success("Técnico removido com sucesso.");
    } catch (error) {
      const linkedOrders =
        typeof error === "object" && error !== null && "code" in error && error.code === "23503";
      toast.error(
        linkedOrders
          ? "Não é possível remover este técnico pois ele já possui atendimentos registrados."
          : "Não foi possível remover o técnico. Tente novamente.",
      );
    } finally {
      deleting.current = false;
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold text-primary">SmartLar Hub</p>
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Técnicos</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Gerencie os contatos e as especialidades da equipe técnica.
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus aria-hidden="true" /> Novo Técnico
        </Button>
      </header>

      <section
        className="mt-7 border border-border bg-card shadow-sm"
        aria-label="Lista de técnicos"
        aria-busy={techniciansQuery.isFetching}
      >
        {techniciansQuery.isPending ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 p-12 text-muted-foreground"
          >
            <LoaderCircle className="size-5 animate-spin" /> Carregando técnicos...
          </p>
        ) : techniciansQuery.isError ? (
          <div className="p-8 text-center">
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar os técnicos.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={techniciansQuery.isFetching}
              onClick={() => void techniciansQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : !techniciansQuery.data.length ? (
          <div className="p-12 text-center">
            <Wrench className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-bold">Nenhum técnico cadastrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use Novo Técnico para cadastrar a equipe.
            </p>
          </div>
        ) : (
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {techniciansQuery.data.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-bold">{technician.nome}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatPhone(technician.telefone ?? "") || "—"}
                  </TableCell>
                  <TableCell>{technician.especialidade || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${technician.nome}`}
                        onClick={() => openForm(technician)}
                      >
                        <Pencil aria-hidden="true" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remover ${technician.nome}`}
                        onClick={() => setToDelete(technician)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!submitting.current) setFormOpen(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
            <DialogDescription>
              Informe os dados de contato e a especialidade do técnico.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} aria-busy={saveMutation.isPending}>
            <fieldset className="space-y-4" disabled={saveMutation.isPending}>
              <div className="space-y-2">
                <Label htmlFor="technician-name">Nome</Label>
                <Input
                  id="technician-name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician-phone">Telefone</Label>
                <Input
                  id="technician-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={15}
                  placeholder="(82) 98765-4321"
                  value={form.telefone}
                  onChange={(event) =>
                    setForm({ ...form, telefone: formatPhone(event.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician-specialty">Especialidade</Label>
                <Input
                  id="technician-specialty"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.especialidade}
                  onChange={(event) => setForm({ ...form, especialidade: event.target.value })}
                />
              </div>
            </fieldset>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saveMutation.isPending}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <LoaderCircle className="animate-spin" />}
                {saveMutation.isPending ? "Salvando..." : "Salvar técnico"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !deleting.current) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este técnico?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.nome}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteMutation.isPending && <LoaderCircle className="animate-spin" />}Confirmar
              exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
