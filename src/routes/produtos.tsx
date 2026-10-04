import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, PackageOpen, Pencil, Plus, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  catalogClient,
  priceSchema,
  productSchema,
  type Product,
} from "@/lib/product-catalog";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Catálogo de Produtos" },
      { name: "description", content: "Consulte e gerencie produtos organizados por categoria." },
      { property: "og:title", content: "Catálogo de Produtos" },
      {
        property: "og:description",
        content: "Consulte e gerencie produtos organizados por categoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductCatalog,
});

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type NewProductForm = {
  nome: string;
  categoria: string;
  preco_unitario: string;
  descricao: string;
};

const emptyForm: NewProductForm = {
  nome: "",
  categoria: "",
  preco_unitario: "",
  descricao: "",
};

function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<NewProductForm>(emptyForm);
  const [editPrice, setEditPrice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setPageError("");
    const { data, error } = await catalogClient
      .from("produtos")
      .select("id,nome,categoria,preco_unitario,descricao")
      .order("categoria")
      .order("nome");

    if (error) {
      setPageError("Não foi possível carregar os produtos. Tente novamente.");
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const categories = useMemo(() => {
    const groups = new Map<string, Product[]>();
    products.forEach((product) => {
      const category = product.categoria.trim() || "Sem categoria";
      groups.set(category, [...(groups.get(category) ?? []), product]);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const parsed = productSchema.safeParse({ ...form, preco_unitario: form.preco_unitario });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os campos informados.");
      return;
    }

    setSaving(true);
    const { error } = await catalogClient.from("produtos").insert(parsed.data);
    setSaving(false);
    if (error) {
      setFormError("Não foi possível cadastrar o produto.");
      return;
    }

    setCreateOpen(false);
    setForm(emptyForm);
    setNotice("Produto cadastrado com sucesso.");
    await loadProducts();
  }

  async function handlePriceUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setFormError("");
    const parsed = priceSchema.safeParse({ preco_unitario: editPrice });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Informe um preço válido.");
      return;
    }

    setSaving(true);
    const { data, error } = await catalogClient
      .from("produtos")
      .update({ preco_unitario: parsed.data.preco_unitario })
      .eq("id", editing.id)
      .select("id,nome,categoria,preco_unitario,descricao")
      .single();
    setSaving(false);

    if (error) {
      setFormError("Não foi possível atualizar o preço.");
      return;
    }

    setProducts((current) => current.map((item) => (item.id === editing.id ? (data as Product) : item)));
    setEditing(null);
    setNotice("Preço atualizado com sucesso.");
  }

  function openPriceEditor(product: Product) {
    setFormError("");
    setEditPrice(String(product.preco_unitario));
    setEditing(product);
  }

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-primary">Catálogo</p>
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Produtos</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Consulte o portfólio, organize as categorias e mantenha os preços atualizados.
            </p>
          </div>
          <Button className="h-11 self-start px-5 sm:self-auto" onClick={() => { setFormError(""); setCreateOpen(true); }}>
            <Plus aria-hidden="true" /> Cadastrar Produto
          </Button>
        </header>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
            <PackageOpen className="size-4 text-primary" aria-hidden="true" />
            <strong>{products.length}</strong><span className="text-muted-foreground">produtos</span>
          </div>
          <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
            <Tag className="size-4 text-primary" aria-hidden="true" />
            <strong>{categories.length}</strong><span className="text-muted-foreground">categorias</span>
          </div>
        </div>

        {notice ? (
          <div className="mt-6 flex items-center justify-between border-l-4 border-primary bg-accent px-4 py-3 text-sm text-accent-foreground" role="status">
            <span>{notice}</span>
            <Button variant="ghost" size="sm" onClick={() => setNotice("")}>Fechar</Button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-muted-foreground">
            <LoaderCircle className="mr-2 size-5 animate-spin" aria-hidden="true" /> Carregando produtos...
          </div>
        ) : pageError ? (
          <div className="mt-8 border border-destructive/30 bg-card p-8 text-center">
            <p className="text-sm text-destructive">{pageError}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadProducts()}>Tentar novamente</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 border border-dashed border-border bg-card p-12 text-center">
            <PackageOpen className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 font-bold">Nenhum produto cadastrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro item do catálogo.</p>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {categories.map(([category, items]) => (
              <section key={category} aria-labelledby={`category-${category}`}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 id={`category-${category}`} className="text-lg font-extrabold text-foreground">{category}</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-secondary-foreground">{items.length}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((product) => (
                    <article key={product.id} className="flex min-h-52 flex-col border border-border bg-card p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold leading-6 text-card-foreground">{product.nome}</h3>
                        <span className="shrink-0 bg-secondary px-2 py-1 text-[11px] font-bold uppercase text-secondary-foreground">{product.categoria}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {product.descricao || "Sem descrição cadastrada."}
                      </p>
                      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Preço unitário</p>
                          <p className="mt-1 text-xl font-extrabold text-foreground">{money.format(Number(product.preco_unitario))}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openPriceEditor(product)} aria-label={`Editar preço de ${product.nome}`}>
                          <Pencil aria-hidden="true" /> Editar preço
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setFormError(""); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cadastrar produto</DialogTitle>
            <DialogDescription>Inclua um novo item no catálogo.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="Nome" htmlFor="product-name">
              <Input id="product-name" value={form.nome} maxLength={120} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria" htmlFor="product-category">
                <Input id="product-category" value={form.categoria} maxLength={80} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex.: Segurança" required />
              </Field>
              <Field label="Preço unitário" htmlFor="product-price">
                <Input id="product-price" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" value={form.preco_unitario} onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })} placeholder="0,00" required />
              </Field>
            </div>
            <Field label="Descrição" htmlFor="product-description">
              <Textarea id="product-description" rows={4} maxLength={500} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            </Field>
            {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : null} Salvar produto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) { setEditing(null); setFormError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar preço</DialogTitle>
            <DialogDescription>{editing?.nome}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePriceUpdate}>
            <Field label="Novo preço unitário" htmlFor="edit-price">
              <Input id="edit-price" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} autoFocus required />
            </Field>
            {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : null} Atualizar preço</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
