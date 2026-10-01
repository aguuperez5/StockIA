import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  popoverClassName?: string;
  side?: "bottom" | "top" | "right" | "left";
  avoidCollisions?: boolean;
  matchTriggerWidth?: boolean;
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
  popoverClassName,
  side = "bottom",
  avoidCollisions,
  matchTriggerWidth,
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const normalizedOptions: ModernSelectOption[] = options.map(opt =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedIndex = normalizedOptions.findIndex(
    opt => String(opt.value) === String(value)
  );
  const selectedOption =
    selectedIndex >= 0 ? normalizedOptions[selectedIndex] : undefined;
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const isFullWidth = matchTriggerWidth || minWidth === "100%";
  const shouldAvoidCollisions =
    avoidCollisions !== undefined ? avoidCollisions : !isFullWidth;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 280) {
          triggerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        handleOpenChange(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < normalizedOptions.length - 1 ? prev + 1 : prev;
        document
          .getElementById(`ms-item-${next}`)
          ?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        document
          .getElementById(`ms-item-${next}`)
          ?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < normalizedOptions.length
      ) {
        onChange(String(normalizedOptions[highlightedIndex].value));
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          onKeyDown={handleKeyDown}
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
        side={side}
        avoidCollisions={shouldAvoidCollisions}
        collisionPadding={12}
        align="start"
        sideOffset={6}
        onKeyDown={handleKeyDown}
        className={cn(
          "modern-select-popover p-1.5",
          isFullWidth && "field-popover-full",
          popoverClassName
        )}
        style={{
          width: isFullWidth ? "var(--radix-popover-trigger-width)" : undefined,
          minWidth: isFullWidth
            ? "var(--radix-popover-trigger-width)"
            : minWidth && minWidth !== "100%"
              ? minWidth
              : "var(--radix-popover-trigger-width, 170px)",
          maxWidth: isFullWidth
            ? "var(--radix-popover-trigger-width)"
            : undefined,
          maxHeight:
            "min(240px, calc(var(--radix-popover-content-available-height, 240px) - 12px))",
        }}
      >
        <div className="modern-select-options" tabIndex={-1}>
          {normalizedOptions.length === 0 ? (
            <div className="modern-select-empty">Sin opciones</div>
          ) : (
            normalizedOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = highlightedIndex === index;
              return (
                <button
                  key={String(opt.value)}
                  id={`ms-item-${index}`}
                  type="button"
                  className={`modern-select-item ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
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
