import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ModernSelectOption {
  value: string | number;
  label: string;
}

export interface ModernSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: (ModernSelectOption | string)[];
  labelPrefix?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  minWidth?: string;
}

export function ModernSelect({
  value,
  onChange,
  options,
  labelPrefix,
  icon,
  placeholder = "Seleccionar",
  ariaLabel,
  className,
  minWidth,
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);

  const normalizedOptions: ModernSelectOption[] = options.map(opt =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(
    opt => String(opt.value) === String(value)
  );
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`select-control modern-select-trigger ${open ? "open" : ""} ${className || ""}`}
          aria-label={ariaLabel || labelPrefix || placeholder}
          style={minWidth ? { minWidth } : undefined}
        >
          <div className="modern-select-left">
            {icon && <span className="modern-select-icon">{icon}</span>}
            {labelPrefix && (
              <span className="filter-pill-label">{labelPrefix}</span>
            )}
            <span className="modern-select-value" title={displayLabel}>
              {displayLabel}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`modern-select-chevron ${open ? "open" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="modern-select-popover p-1.5"
        style={{
          minWidth:
            minWidth && minWidth !== "100%"
              ? minWidth
              : "var(--radix-popover-trigger-width, 170px)",
        }}
      >
        <div className="modern-select-options">
          {normalizedOptions.length === 0 ? (
            <div className="modern-select-empty">Sin opciones</div>
          ) : (
            normalizedOptions.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  className={`modern-select-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                >
                  <span className="modern-select-item-text">{opt.label}</span>
                  {isSelected && (
                    <Check size={14} className="modern-select-item-check" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
