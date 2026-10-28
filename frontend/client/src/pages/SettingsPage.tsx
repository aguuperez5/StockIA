import { Check, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
} from "@/components/StockUI";
import {
  categoryService,
  normalizeCategoryName,
  type Category,
} from "@/services/categories";

export default function SettingsPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await categoryService.list();
      setItems(result.items);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = normalizeCategoryName(newName);
    if (name.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setCreating(true);
    try {
      await categoryService.create(name);
      toast.success(`Categoría "${name}" creada.`);
      setNewName("");
      await load();
    } catch (reason) {
      toast.error((reason as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: Category) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const saveEdit = async (item: Category) => {
    const name = normalizeCategoryName(editingName);
    if (name.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (name.toLowerCase() === item.name.toLowerCase()) {
      setEditingId(null);
      return;
    }
    setSavingEdit(true);
    try {
      await categoryService.update(item.id, name);
      toast.success("Categoría actualizada. Los productos se renombran en cascada.");
      setEditingId(null);
      await load();
    } catch (reason) {
      toast.error((reason as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const canCreate = normalizeCategoryName(newName).length >= 2;

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Configuración"
        description="Gestioná el catálogo cerrado de categorías. Al crear un producto solo se puede elegir de esta lista, para no cargar lo mismo escrito de distintas maneras."
      />

      <section className="form-card" aria-labelledby="categories-title">
        <div className="form-section">
          <div className="form-section-title">
            <span>
              <Tags size={18} />
            </span>
            <div>
              <h2 id="categories-title">Categorías de productos</h2>
              <p>
                {items.length} categoría{items.length === 1 ? "" : "s"}{" "}
                disponible{items.length === 1 ? "" : "s"} al dar de alta un
                producto.
              </p>
            </div>
          </div>

          <form onSubmit={create} className="category-create-row">
            <label className="search-control">
              <Plus size={16} />
              <input
                value={newName}
                onChange={event => setNewName(event.target.value)}
                placeholder="Nueva categoría · Ej. Bebidas"
                aria-label="Nueva categoría"
                maxLength={60}
              />
            </label>
            <button
              type="submit"
              className="button-primary"
              disabled={creating || !canCreate}
            >
              <Plus size={16} />
              {creating ? "Agregando…" : "Agregar"}
            </button>
          </form>

          {loading && <LoadingPanel rows={4} />}
          {error && <ErrorPanel message={error} retry={load} />}

          {!loading && !error && items.length === 0 && (
            <EmptyState
              title="Todavía no hay categorías"
              detail="Creá la primera para empezar a clasificar tu catálogo."
            />
          )}

          {!loading && !error && items.length > 0 && (
            <div className="category-list" role="list">
              {items.map(item =>
                editingId === item.id ? (
                  <div className="category-item" role="listitem" key={item.id}>
                    <div className="category-rename-row">
                      <input
                        className="category-rename-input"
                        value={editingName}
                        onChange={event => setEditingName(event.target.value)}
                        aria-label={`Renombrar ${item.name}`}
                        maxLength={60}
                        autoFocus
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveEdit(item);
                          }
                          if (event.key === "Escape") setEditingId(null);
                        }}
                      />
                      <div className="category-rename-actions">
                        <button
                          type="button"
                          className="button-primary"
                          disabled={savingEdit}
                          onClick={() => void saveEdit(item)}
                        >
                          <Check size={15} />
                          {savingEdit ? "Guardando…" : "Guardar"}
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          disabled={savingEdit}
                          onClick={() => setEditingId(null)}
                          aria-label="Cancelar edición"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="category-item" role="listitem" key={item.id}>
                    <div className="category-item-main">
                      <span className="category-tag">{item.name}</span>
                      <span className="category-count">
                        {item.productCount} producto
                        {item.productCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="category-item-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => startEdit(item)}
                        aria-label={`Renombrar ${item.name}`}
                        title="Renombrar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => setToDelete(item)}
                        aria-label={`Eliminar ${item.name}`}
                        title={
                          item.productCount > 0
                            ? "Tiene productos asociados: primero cambiales la categoría"
                            : "Eliminar categoría"
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                )
              )}
              <footer className="category-list-footer">
                {items.length} categoría{items.length === 1 ? "" : "s"} en el
                catálogo
              </footer>
            </div>
          )}
        </div>
      </section>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={open => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar "{toDelete?.name}"</AlertDialogTitle>
            <AlertDialogDescription>
              La categoría dejará de estar disponible al crear productos.{" "}
              {toDelete && toDelete.productCount > 0
                ? `Tiene ${toDelete.productCount} producto(s) asociado(s): primero cambiales la categoría.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await categoryService.remove(toDelete.id);
      toast.success(`Categoría "${toDelete.name}" eliminada.`);
      setToDelete(null);
      await load();
    } catch (reason) {
      toast.error((reason as Error).message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }
}
