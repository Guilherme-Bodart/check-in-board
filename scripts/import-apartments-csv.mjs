#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const HEADER_ALIASES = {
  nome: "name",
  name: "name",
  apartamento: "name",
  apartment: "name",
  imovel: "name",
  unidade: "name",
  nomeapartamento: "name",
  nomeimovel: "name",
  proprietario: "ownerName",
  owner: "ownerName",
  ownername: "ownerName",
  dono: "ownerName",
  cliente: "ownerName",
  nomeproprietario: "ownerName",
  tipo: "ownerType",
  tipoproprietario: "ownerType",
  ownertype: "ownerType",
  comissao: "commission",
  comissaopercentual: "commission",
  taxa: "commission",
  commission: "commission",
  managementcommissionbps: "commission",
  email: "ownerEmail",
  emailproprietario: "ownerEmail",
  owneremail: "ownerEmail",
  telefone: "ownerPhone",
  celular: "ownerPhone",
  phone: "ownerPhone",
  telefoneproprietario: "ownerPhone",
  ownerphone: "ownerPhone",
  fuso: "timezone",
  fusohorario: "timezone",
  timezone: "timezone",
};

function printUsage() {
  console.log(
    [
      "Uso:",
      "  node scripts/import-apartments-csv.mjs <caminho-do-csv> [opções]",
      "",
      "Opções:",
      "  --api-url <url>      URL base da API (padrão: API_BASE_URL, NEXT_PUBLIC_API_BASE_URL ou http://localhost:3333)",
      "  --token <jwt>        Token Bearer JWT (ou env CIB_AUTH_TOKEN)",
      "  --email <email>      E-mail para login automático em POST /auth/sign-in (ou env CIB_ADMIN_EMAIL)",
      "  --password <senha>   Senha para login automático (ou env CIB_ADMIN_PASSWORD)",
      "  --help, -h           Exibe esta ajuda",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const options = {
    csvPath: "",
    apiUrl: "",
    email: "",
    password: "",
    token: "",
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    const readFlagValue = (flagName) => {
      if (arg === flagName) {
        i += 1;
        return argv[i] ?? "";
      }
      if (arg.startsWith(`${flagName}=`)) {
        return arg.slice(flagName.length + 1);
      }
      return null;
    };

    const apiUrl = readFlagValue("--api-url");
    if (apiUrl !== null) {
      options.apiUrl = apiUrl;
      continue;
    }

    const email = readFlagValue("--email");
    if (email !== null) {
      options.email = email;
      continue;
    }

    const password = readFlagValue("--password");
    if (password !== null) {
      options.password = password;
      continue;
    }

    const token = readFlagValue("--token");
    if (token !== null) {
      options.token = token;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Opção desconhecida: ${arg}`);
    }

    if (!options.csvPath) {
      options.csvPath = arg;
    }
  }

  return options;
}

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderKey(value) {
  return normalizeToken(value).replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(text) {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (commas > 0 || semicolons > 0 || tabs > 0) {
        break;
      }
      continue;
    }
    if (!inQuotes) {
      if (ch === ";") semicolons += 1;
      else if (ch === ",") commas += 1;
      else if (ch === "\t") tabs += 1;
    }
  }

  if (semicolons > commas && semicolons >= tabs) return ";";
  if (tabs > commas && tabs > 0) return "\t";
  return ",";
}

function parseCsvRows(rawText, delimiter) {
  const cleanText = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  return rows;
}

function parseOwnerType(rawValue) {
  const normalized = normalizeToken(rawValue);
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "proprio" ||
    normalized === "propria" ||
    normalized === "interno" ||
    normalized === "interna" ||
    normalized === "internal"
  ) {
    return "internal";
  }
  return "client";
}

function parseCommissionBps(rawValue) {
  const cleaned = String(rawValue ?? "")
    .replace(/%/g, "")
    .trim()
    .replace(",", ".");
  if (!cleaned) {
    return undefined;
  }
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric <= 100 ? Math.round(numeric * 100) : Math.round(numeric);
}

function parseApartmentsCsv(rawText) {
  if (!rawText.trim()) {
    return [];
  }

  const delimiter = detectDelimiter(rawText);
  const rows = parseCsvRows(rawText, delimiter);
  if (rows.length === 0) {
    return [];
  }

  const headerIndices = {};
  let recognizedHeaderCount = 0;

  rows[0].forEach((cell, index) => {
    const key = HEADER_ALIASES[normalizeHeaderKey(cell)];
    if (key && headerIndices[key] === undefined) {
      headerIndices[key] = index;
      recognizedHeaderCount += 1;
    }
  });

  const hasHeader = recognizedHeaderCount > 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const columnMap = {
    name: hasHeader ? (headerIndices.name ?? 0) : 0,
    ownerName: hasHeader ? (headerIndices.ownerName ?? -1) : 1,
    ownerType: hasHeader ? (headerIndices.ownerType ?? -1) : 2,
    commission: hasHeader ? (headerIndices.commission ?? -1) : 3,
    ownerEmail: hasHeader ? (headerIndices.ownerEmail ?? -1) : 4,
    ownerPhone: hasHeader ? (headerIndices.ownerPhone ?? -1) : 5,
    timezone: hasHeader ? (headerIndices.timezone ?? -1) : 6,
  };

  const items = [];
  for (const row of dataRows) {
    const readCol = (colIndex) =>
      colIndex >= 0 && colIndex < row.length ? row[colIndex].trim() : "";

    const name = readCol(columnMap.name);
    if (!name) {
      continue;
    }

    const ownerName = readCol(columnMap.ownerName) || undefined;
    const explicitOwnerType = parseOwnerType(readCol(columnMap.ownerType));
    const ownerType = explicitOwnerType ?? (ownerName ? "client" : undefined);
    const ownerEmail = readCol(columnMap.ownerEmail) || undefined;
    const ownerPhone = readCol(columnMap.ownerPhone) || undefined;
    const managementCommissionBps = parseCommissionBps(readCol(columnMap.commission));
    const timezone = readCol(columnMap.timezone) || "America/Sao_Paulo";

    const item = { name, timezone };
    if (ownerName !== undefined) item.ownerName = ownerName;
    if (ownerType !== undefined) item.ownerType = ownerType;
    if (ownerEmail !== undefined) item.ownerEmail = ownerEmail;
    if (ownerPhone !== undefined) item.ownerPhone = ownerPhone;
    if (managementCommissionBps !== undefined) {
      item.managementCommissionBps = managementCommissionBps;
    }

    items.push(item);
  }

  return items;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const apiMessage =
      typeof payload === "object" && payload !== null
        ? payload?.error?.message ?? payload?.message
        : payload;
    throw new Error(
      `Erro HTTP ${response.status} em ${url}: ${apiMessage || response.statusText}`,
    );
  }

  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  if (!args.csvPath) {
    printUsage();
    throw new Error("Informe o caminho do arquivo CSV.");
  }

  const resolvedCsvPath = resolve(process.cwd(), args.csvPath);
  if (!existsSync(resolvedCsvPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${resolvedCsvPath}`);
  }

  const csvContent = readFileSync(resolvedCsvPath, "utf8");
  const items = parseApartmentsCsv(csvContent);
  if (items.length === 0) {
    throw new Error("Nenhum apartamento válido encontrado no CSV.");
  }

  const apiBaseUrl = (
    args.apiUrl ||
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:3333"
  ).replace(/\/$/, "");

  let token = args.token || process.env.CIB_AUTH_TOKEN || "";
  const email = args.email || process.env.CIB_ADMIN_EMAIL || "";
  const password = args.password || process.env.CIB_ADMIN_PASSWORD || "";

  if (!token) {
    if (!email || !password) {
      throw new Error(
        "Credenciais ausentes. Informe --token (ou CIB_AUTH_TOKEN) ou --email e --password (ou CIB_ADMIN_EMAIL + CIB_ADMIN_PASSWORD).",
      );
    }

    const auth = await requestJson(`${apiBaseUrl}/auth/sign-in`, {
      method: "POST",
      body: { email, password },
    });
    token = auth.accessToken;
    if (!token) {
      throw new Error("Login realizado, mas accessToken não retornado pela API.");
    }
  }

  const result = await requestJson(`${apiBaseUrl}/apartments/batch-import`, {
    method: "POST",
    token,
    body: { items },
  });

  console.log(`Arquivo processado: ${resolvedCsvPath}`);
  console.log(`Itens enviados: ${items.length}`);
  console.log(
    `Resumo: ${result.createdCount} criado(s), ${result.ownersCreatedCount} novo(s) proprietário(s), ${result.skippedCount} já existente(s).`,
  );

  if (Array.isArray(result.apartments) && result.apartments.length > 0) {
    console.log("\nApartamentos:");
    for (const apt of result.apartments) {
      const ownerLabel = apt.owner?.name
        ? `${apt.owner.name} (${apt.owner.type === "internal" ? "próprio" : "cliente"})`
        : "sem proprietário";
      const commissionPercent = ((apt.managementCommissionBps ?? 0) / 100).toLocaleString(
        "pt-BR",
      );
      console.log(
        `- ${apt.name} | Proprietário: ${ownerLabel} | Comissão: ${commissionPercent}% | Fuso: ${apt.timezone}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
