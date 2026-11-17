export function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

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

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}
