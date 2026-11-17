import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyToCents } from "./money";

describe("formatMoney", () => {
  it("formats positive cents to Brazilian Real (BRL)", () => {
    const formatted = formatMoney(125000).replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toContain("1.250,00");
    expect(formatted).toContain("R$");
  });

  it("formats zero cents correctly", () => {
    const formatted = formatMoney(0).replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toContain("0,00");
    expect(formatted).toContain("R$");
  });

  it("formats negative cents properly", () => {
    const formatted = formatMoney(-4500).replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toContain("-");
    expect(formatted).toContain("45,00");
  });

  it("formats small amounts without losing precision", () => {
    const formatted = formatMoney(99).replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toContain("0,99");
  });

  it("supports alternate currencies like USD", () => {
    const formatted = formatMoney(5000, "USD").replace(/\u00A0|\u202F/g, " ");
    expect(formatted).toContain("50,00");
    expect(formatted).toMatch(/US\$|\$/);
  });
});

describe("parseMoneyToCents", () => {
  it("parses comma-separated decimal string to cents", () => {
    expect(parseMoneyToCents("123,45")).toBe(12345);
  });

  it("parses dot-separated thousands with comma decimals", () => {
    expect(parseMoneyToCents("1.500,75")).toBe(150075);
    expect(parseMoneyToCents("12.345.678,90")).toBe(1234567890);
  });

  it("parses dot-decimal values without comma", () => {
    expect(parseMoneyToCents("100.50")).toBe(10050);
    expect(parseMoneyToCents("100.5")).toBe(10050);
    expect(parseMoneyToCents("0.99")).toBe(99);
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
  });

  it("parses dot-separated thousands without decimals", () => {
    expect(parseMoneyToCents("1.500")).toBe(150000);
    expect(parseMoneyToCents("1.000.000")).toBe(100000000);
  });

  it("parses whole numbers without decimals", () => {
    expect(parseMoneyToCents("250")).toBe(25000);
  });

  it("trims surrounding whitespace", () => {
    expect(parseMoneyToCents("   99,90 \t ")).toBe(9990);
  });

  it("returns 0 for zero or negative values", () => {
    expect(parseMoneyToCents("0")).toBe(0);
    expect(parseMoneyToCents("0,00")).toBe(0);
    expect(parseMoneyToCents("-50,00")).toBe(0);
  });

  it("returns 0 for empty or invalid non-numeric strings", () => {
    expect(parseMoneyToCents("")).toBe(0);
    expect(parseMoneyToCents("   ")).toBe(0);
    expect(parseMoneyToCents("invalid-value")).toBe(0);
  });

  it("safely rounds floating point artifacts", () => {
    expect(parseMoneyToCents("19,99")).toBe(1999);
    expect(parseMoneyToCents("1,14")).toBe(114);
  });
});
