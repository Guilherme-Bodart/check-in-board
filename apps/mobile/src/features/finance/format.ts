export function parseMoneyToCents(value: string) {
  const trimmed = value.replace(/\s+/g, "").replace(/^R\$/i, "");
  if (!trimmed || trimmed.startsWith("-") || !/^[\d.,]+$/.test(trimmed)) {
    return 0;
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  let normalized: string;

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, "").replace(",", ".")
        : trimmed.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const parts = trimmed.split(",");
    normalized =
      parts.length === 2 ? `${parts[0]}.${parts[1]}` : trimmed.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const parts = trimmed.split(".");
    normalized =
      parts.length === 2 && (parts[1].length !== 3 || parts[0] === "0")
        ? trimmed
        : trimmed.replace(/\./g, "");
  } else {
    normalized = trimmed;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}
