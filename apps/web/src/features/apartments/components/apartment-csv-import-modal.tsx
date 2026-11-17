"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Field, Textarea } from "../../../components/ui/form-controls";
import { readStoredSession } from "../../../lib/session-storage";
import { useAuthSession } from "../../auth/session-context";
import {
  batchImportApartments,
  type BatchImportApartmentItemInput,
  type BatchImportApartmentsResponse,
} from "../../dashboard/dashboard-api";

const CSV_TEMPLATE_HEADER =
  "nome,proprietario,tipo_proprietario,comissao_percentual,email_proprietario,telefone_proprietario,fuso_horario";

const CSV_TEMPLATE_CONTENT = [
  CSV_TEMPLATE_HEADER,
  "Apto 101 - Copacabana,Maria Silva,cliente,20,maria@exemplo.com,21999990001,America/Sao_Paulo",
  "Apto 202 - Ipanema,Operação Própria,proprio,0,,,America/Sao_Paulo",
].join("\n");

const SAMPLE_PLACEHOLDER = [
  "nome;proprietario;tipo_proprietario;comissao_percentual;email_proprietario;telefone_proprietario;fuso_horario",
  "Apto 101 - Copacabana;Maria Silva;cliente;20;maria@exemplo.com;21999990001;America/Sao_Paulo",
  "Apto 202 - Ipanema;Operação Própria;proprio;0;;;America/Sao_Paulo",
].join("\n");

type ColumnKey =
  | "name"
  | "ownerName"
  | "ownerType"
  | "commission"
  | "ownerEmail"
  | "ownerPhone"
  | "timezone";

const HEADER_ALIASES: Record<string, ColumnKey> = {
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

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderKey(value: string): string {
  return normalizeToken(value).replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(text: string): string {
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

function parseCsvRows(rawText: string, delimiter: string): string[][] {
  const cleanText = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
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

function parseOwnerType(rawValue?: string): "internal" | "client" | undefined {
  const normalized = normalizeToken(rawValue ?? "");
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

function parseCommissionBps(rawValue?: string): number | undefined {
  const cleaned = (rawValue ?? "").replace(/%/g, "").trim().replace(",", ".");
  if (!cleaned) {
    return undefined;
  }
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return undefined;
  }
  return numeric <= 100 ? Math.round(numeric * 100) : Math.round(numeric);
}

export type ParsedApartmentsCsv = {
  items: BatchImportApartmentItemInput[];
  ignoredRows: number;
};

export function parseApartmentsCsv(rawText: string): ParsedApartmentsCsv {
  if (!rawText.trim()) {
    return { items: [], ignoredRows: 0 };
  }

  const delimiter = detectDelimiter(rawText);
  const rows = parseCsvRows(rawText, delimiter);
  if (rows.length === 0) {
    return { items: [], ignoredRows: 0 };
  }

  const headerIndices: Partial<Record<ColumnKey, number>> = {};
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
  const columnMap: Record<ColumnKey, number> = {
    name: hasHeader ? (headerIndices.name ?? 0) : 0,
    ownerName: hasHeader ? (headerIndices.ownerName ?? -1) : 1,
    ownerType: hasHeader ? (headerIndices.ownerType ?? -1) : 2,
    commission: hasHeader ? (headerIndices.commission ?? -1) : 3,
    ownerEmail: hasHeader ? (headerIndices.ownerEmail ?? -1) : 4,
    ownerPhone: hasHeader ? (headerIndices.ownerPhone ?? -1) : 5,
    timezone: hasHeader ? (headerIndices.timezone ?? -1) : 6,
  };

  const items: BatchImportApartmentItemInput[] = [];
  let ignoredRows = 0;

  for (const row of dataRows) {
    const readCol = (colIndex: number) =>
      colIndex >= 0 && colIndex < row.length ? row[colIndex].trim() : "";

    const name = readCol(columnMap.name);
    if (!name) {
      ignoredRows += 1;
      continue;
    }

    const ownerName = readCol(columnMap.ownerName) || undefined;
    const explicitOwnerType = parseOwnerType(readCol(columnMap.ownerType));
    const ownerType = explicitOwnerType ?? (ownerName ? "client" : undefined);
    const ownerEmail = readCol(columnMap.ownerEmail) || undefined;
    const ownerPhone = readCol(columnMap.ownerPhone) || undefined;
    const managementCommissionBps = parseCommissionBps(readCol(columnMap.commission));
    const timezone = readCol(columnMap.timezone) || "America/Sao_Paulo";

    items.push({
      name,
      timezone,
      ownerName,
      ownerType,
      ownerEmail,
      ownerPhone,
      managementCommissionBps,
    });
  }

  return { items, ignoredRows };
}

export function ApartmentCsvImportModal({
  isOpen,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: BatchImportApartmentsResponse) => Promise<void> | void;
}) {
  const { session: authSession } = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [importResult, setImportResult] =
    useState<BatchImportApartmentsResponse | null>(null);

  const parsed = useMemo(() => parseApartmentsCsv(csvText), [csvText]);

  function resetState() {
    setCsvText("");
    setSelectedFileName("");
    setErrorMessage("");
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    if (isImporting) {
      return;
    }
    resetState();
    onClose();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage("");
    setImportResult(null);
    setSelectedFileName(file.name);

    try {
      const content = await file.text();
      setCsvText(content);
    } catch {
      setErrorMessage("Não foi possível ler o arquivo selecionado.");
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([`\uFEFF${CSV_TEMPLATE_CONTENT}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-apartamentos.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const session = authSession ?? readStoredSession();
    if (!session) {
      setErrorMessage("Sessão expirada. Faça login novamente para importar.");
      return;
    }

    if (parsed.items.length === 0) {
      setErrorMessage(
        "Nenhum apartamento válido encontrado no CSV. Verifique se há ao menos uma coluna de nome.",
      );
      return;
    }

    setIsImporting(true);
    setErrorMessage("");
    setImportResult(null);

    try {
      const result = await batchImportApartments(session.token, parsed.items);
      setImportResult(result);
      await onImported(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível importar os apartamentos.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        {/* Header fixo */}
        <div className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <FileSpreadsheet aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base font-bold text-text-primary">
                  Importar apartamentos via CSV
                </DialogTitle>
                {parsed.items.length > 0 ? (
                  <Badge tone="primary">{parsed.items.length} lido(s)</Badge>
                ) : null}
              </div>
              <DialogDescription className="mt-0.5 text-xs text-text-secondary">
                Envie um arquivo CSV do Excel/planilha ou cole os dados abaixo para
                cadastrar vários imóveis de uma vez.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-5">
          <input
            ref={fileInputRef}
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
            type="file"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="secondary"
            >
              <Upload aria-hidden className="h-4 w-4" />
              Selecionar arquivo .csv
            </Button>
            <Button
              disabled={isImporting}
              onClick={handleDownloadTemplate}
              size="sm"
              variant="outline"
            >
              <Download aria-hidden className="h-4 w-4" />
              Baixar modelo CSV
            </Button>
            {csvText.trim() ? (
              <Button
                disabled={isImporting}
                onClick={resetState}
                size="sm"
                variant="ghost"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Limpar
              </Button>
            ) : null}
            {selectedFileName ? (
              <Badge className="max-w-full truncate" tone="neutral">
                {selectedFileName}
              </Badge>
            ) : null}
          </div>

          <Field
            hint="Aceita separador vírgula (,) ou ponto e vírgula (;), com ou sem cabeçalho."
            label="Conteúdo CSV ou tabela colada"
          >
            <Textarea
              className="min-h-32 font-mono text-xs leading-5"
              disabled={isImporting}
              onChange={(event) => {
                setCsvText(event.target.value);
                setErrorMessage("");
                setImportResult(null);
              }}
              placeholder={SAMPLE_PLACEHOLDER}
              value={csvText}
            />
          </Field>

          {parsed.items.length > 0 ? (
            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Prévia dos imóveis ({parsed.items.length})
                </h3>
                {parsed.ignoredRows > 0 ? (
                  <Badge tone="warning">
                    {parsed.ignoredRows} linha(s) sem nome ignorada(s)
                  </Badge>
                ) : null}
              </div>

              <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-surface-muted/30">
                {parsed.items.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex flex-col gap-1.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        Proprietário:{" "}
                        {item.ownerName ?? "Proprietário padrão da organização"}
                        {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
                        {item.ownerPhone ? ` · ${item.ownerPhone}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Badge
                        tone={item.ownerType === "internal" ? "primary" : "info"}
                      >
                        {item.ownerType === "internal" ? "Próprio" : "Cliente"}
                      </Badge>
                      {item.managementCommissionBps !== undefined ? (
                        <Badge tone="neutral">
                          Comissão{" "}
                          {(item.managementCommissionBps / 100).toLocaleString(
                            "pt-BR",
                          )}
                          %
                        </Badge>
                      ) : null}
                      {item.timezone ? (
                        <Badge tone="neutral">{item.timezone}</Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : csvText.trim() ? (
            <p className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-xs font-medium text-warning">
              Nenhuma linha válida identificada ainda. Confira se o nome do apartamento
              está preenchido na primeira coluna ou na coluna &quot;nome&quot;.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
              {errorMessage}
            </p>
          ) : null}

          {importResult ? (
            <div className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success">
              Importação concluída: {importResult.createdCount} criado(s),{" "}
              {importResult.ownersCreatedCount} novo(s) proprietário(s),{" "}
              {importResult.skippedCount} já existia(m).
            </div>
          ) : null}
        </div>

        {/* Footer fixo */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface-muted/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
          <Button
            disabled={isImporting}
            onClick={handleClose}
            variant="secondary"
          >
            {importResult ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            disabled={isImporting || parsed.items.length === 0}
            onClick={() => void handleImport()}
            variant="primary"
          >
            <Upload aria-hidden className="h-4 w-4" />
            {isImporting ? "Importando..." : "Importar Apartamentos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
