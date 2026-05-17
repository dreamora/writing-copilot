export interface SecretWarning {
  kind: "api-key" | "private-key" | "token";
  label: string;
}

const SECRET_PATTERNS: Array<{ kind: SecretWarning["kind"]; label: string; pattern: RegExp }> = [
  {
    kind: "private-key",
    label: "Private key block",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    kind: "api-key",
    label: "OpenAI API key",
    pattern: /sk-[A-Za-z0-9_-]{20,}/,
  },
  {
    kind: "token",
    label: "Token assignment",
    pattern: /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_.\-]{12,}/i,
  },
];

export function detectSecretWarnings(content: string): SecretWarning[] {
  const warnings: SecretWarning[] = [];
  for (const candidate of SECRET_PATTERNS) {
    if (candidate.pattern.test(content)) {
      warnings.push({ kind: candidate.kind, label: candidate.label });
    }
  }
  return warnings;
}
