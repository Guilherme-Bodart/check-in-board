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

  return <p className={`message ${isError ? "error" : ""}`}>{message}</p>;
}
