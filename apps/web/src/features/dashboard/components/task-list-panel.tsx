import type { Task } from "../../../api";
import { formatDateTime } from "../../../lib/date-formatters";

export function TaskListPanel({
  onMarkDone,
  tasks,
}: {
  onMarkDone: (taskId: string) => Promise<void>;
  tasks: Task[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary">
          Checklist
        </h2>
      </div>
      <div className="mt-5 grid gap-3">
        {tasks.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Nenhuma tarefa criada para este apartamento.
          </p>
        ) : (
          tasks.map((task) => (
            <article
              className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              key={task.id}
            >
              <div>
                <strong className="block text-sm font-semibold text-text-primary">
                  {task.title}
                </strong>
                <span className="mt-1 block text-sm text-text-secondary">
                  {task.description ?? formatDateTime(task.dueAt)}
                </span>
              </div>
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                {task.status.replace("_", " ")}
              </span>
              {task.status === "pending" ? (
                <button
                  className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition hover:bg-surface-muted hover:text-text-primary"
                  onClick={() => onMarkDone(task.id)}
                  type="button"
                >
                  Feito
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
