import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FieldProps = Readonly<{
  children: ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
}>;

export function Field({ children, description, error, htmlFor, label }: FieldProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && (
        <p id={descriptionId} className="text-muted-foreground text-sm">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
