export type TaskDueDatePresetId =
  | "inTwoHours"
  | "tomorrowMorning"
  | "tomorrowCheckoutPrep";

export type TaskDueDatePreset = {
  id: TaskDueDatePresetId;
  label: string;
};

export const taskDueDatePresets: TaskDueDatePreset[] = [
  {
    id: "inTwoHours",
    label: "In 2 hours",
  },
  {
    id: "tomorrowMorning",
    label: "Tomorrow 09:00",
  },
  {
    id: "tomorrowCheckoutPrep",
    label: "Tomorrow 11:00",
  },
];

export function getTaskDueDatePresetValue(
  presetId: TaskDueDatePresetId,
  now = new Date(),
) {
  const dueAt = new Date(now);

  if (presetId === "inTwoHours") {
    dueAt.setHours(dueAt.getHours() + 2, 0, 0, 0);
    return dueAt.toISOString();
  }

  dueAt.setDate(dueAt.getDate() + 1);

  if (presetId === "tomorrowMorning") {
    dueAt.setHours(9, 0, 0, 0);
  } else {
    dueAt.setHours(11, 0, 0, 0);
  }

  return dueAt.toISOString();
}
