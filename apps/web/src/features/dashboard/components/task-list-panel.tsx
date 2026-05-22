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
    <section className="panel">
      <div className="panelHeader">
        <h2>Checklist</h2>
      </div>
      <div className="taskList">
        {tasks.length === 0 ? (
          <p className="mutedText">Nenhuma tarefa criada para este apartamento.</p>
        ) : (
          tasks.map((task) => (
            <article className="taskRow" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{task.description ?? formatDateTime(task.dueAt)}</span>
              </div>
              <span className={`statusBadge ${task.status}`}>
                {task.status.replace("_", " ")}
              </span>
              {task.status === "pending" ? (
                <button onClick={() => onMarkDone(task.id)} type="button">
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
