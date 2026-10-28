import { useCallback, useEffect, useState } from "react";
import { Tag } from "lucide-react";
import { ModernSelect } from "@/components/ModernSelect";
import {
  categoryService,
  normalizeCategoryName,
  type Category,
} from "@/services/categories";

let cachedCategories: Category[] = [];

export function useCategories() {
  const [categories, setCategories] =
    useState<Category[]>(cachedCategories);
  const [loading, setLoading] = useState(cachedCategories.length === 0);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await categoryService.list();
      cachedCategories = result.items;
      setCategories(result.items);
    } catch (reason) {
      setError(
        (reason as Error).message || "No pudimos cargar las categorías."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedCategories.length === 0) void reload();
  }, [reload]);

  return { categories, loading, error, reload };
}

export function categoryNames(items: Category[]): string[] {
  return items.map(item => item.name);
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showManageHint?: boolean;
}

/**
 * Selector cerrado de categorías: solo permite elegir del catálogo
 * administrado en Configuración, para no cargar lo mismo escrito
 * de distintas maneras ("Almacen" vs "Almacén").
 */
export function CategorySelect({
  value,
  onChange,
  placeholder = "Seleccioná una categoría",
  disabled = false,
  showManageHint = true,
}: CategorySelectProps) {
  const { categories, loading } = useCategories();

  const normalizedValue = normalizeCategoryName(value);
  const names = categoryNames(categories);
  // Si el producto trae una categoría histórica que ya no está en el
  // catálogo, se muestra igual para no perder el dato en edición.
  const options =
    normalizedValue && !names.some(n => n.toLowerCase() === normalizedValue.toLowerCase())
      ? [{ value: normalizedValue, label: `${normalizedValue} (actual)` }, ...names.map(n => ({ value: n, label: n }))]
      : names.map(n => ({ value: n, label: n }));

  if (disabled) {
    return (
      <input value={value} disabled placeholder={placeholder} aria-label="Categoría" />
    );
  }

  return (
    <div>
      <ModernSelect
        value={normalizedValue}
        onChange={onChange}
        options={options}
        placeholder={loading ? "Cargando categorías…" : placeholder}
        ariaLabel="Categoría del producto"
        icon={<Tag size={15} />}
        className="w-full"
        minWidth="100%"
        side="bottom"
        avoidCollisions={false}
        matchTriggerWidth={true}
      />
      {showManageHint && (
        <small className="field-hint">
          ¿Falta una?{" "}
          <a href="/settings" className="text-button" style={{ display: "inline" }}>
            Creala en Configuración
          </a>
          .
        </small>
      )}
    </div>
  );
}
