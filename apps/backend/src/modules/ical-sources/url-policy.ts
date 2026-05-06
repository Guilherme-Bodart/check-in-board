import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class IcalUrlPolicyError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  );
}

function isPrivateIpv6(host: string) {
  const normalizedHost = host.toLowerCase();

  return (
    normalizedHost === "::1" ||
    normalizedHost.startsWith("fc") ||
    normalizedHost.startsWith("fd") ||
    normalizedHost.startsWith("fe80:")
  );
}

function isBlockedHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local")
  );
}

export async function assertSafeIcalUrl(icalUrl: string) {
  const parsedUrl = new URL(icalUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new IcalUrlPolicyError("Only HTTP and HTTPS iCal URLs are allowed.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new IcalUrlPolicyError("Credentials in iCal URLs are not allowed.");
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    throw new IcalUrlPolicyError("Local iCal URLs are not allowed.");
  }

  if (isIP(parsedUrl.hostname)) {
    if (
      isPrivateIpv4(parsedUrl.hostname) ||
      isPrivateIpv6(parsedUrl.hostname)
    ) {
      throw new IcalUrlPolicyError(
        "Private network iCal URLs are not allowed.",
      );
    }

    return;
  }

  const addresses = await lookup(parsedUrl.hostname, {
    all: true,
    verbatim: true,
  });

  if (
    addresses.some(
      (address) =>
        isPrivateIpv4(address.address) || isPrivateIpv6(address.address),
    )
  ) {
    throw new IcalUrlPolicyError("Private network iCal URLs are not allowed.");
  }
}
