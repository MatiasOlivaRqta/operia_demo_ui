import type { ReactNode } from "react";

type EmptyStateProps = Readonly<{
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}>;

export function EmptyState({ action, description, icon, title }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full"
        >
          {icon}
        </span>
      )}
      <div>
        <h2 className="text-text-primary font-semibold">{title}</h2>
        <p className="text-text-muted mt-1 max-w-md text-sm leading-6">{description}</p>
      </div>
      {action}
    </div>
  );
}
