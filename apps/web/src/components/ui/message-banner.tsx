export function MessageBanner({
  isError = false,
  message,
}: {
  isError?: boolean;
  message: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        isError
          ? "rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          : "rounded-xl bg-info-soft px-4 py-3 text-sm font-medium text-info"
      }
    >
      {message}
    </p>
  );
}
