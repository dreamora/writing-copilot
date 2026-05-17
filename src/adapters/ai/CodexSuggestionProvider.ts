import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import type { SuggestionProvider } from "./SuggestionProvider";
import type {
  SuggestionRequest,
  SuggestionResponse,
} from "../../domain/suggestions/suggestion-types";
import type { ChatGptAuthConfig } from "./chatgpt-auth";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";
import { isTokenInvalid, sanitizeAuthError } from "./token-lifecycle";
import { StubSuggestionProvider } from "./OpenAiSuggestionProvider";

interface CodexCommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
}

const DEFAULT_CODEX_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 45_000;
const OUTPUT_FILE_NAME = "codex-last-message.json";
const SCHEMA_FILE_NAME = "codex-output-schema.json";

export class CodexSuggestionProvider implements SuggestionProvider {
  private readonly auth?: ChatGptAuthConfig;
  private readonly command: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly stubProvider: StubSuggestionProvider;

  constructor(auth?: ChatGptAuthConfig) {
    this.auth = auth;
    this.command = process.env.CODEX_CLI_COMMAND?.trim() || "codex";
    this.model = process.env.CODEX_MODEL?.trim() || auth?.model || DEFAULT_CODEX_MODEL;
    this.timeoutMs = Number(process.env.CODEX_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS));
    this.stubProvider = new StubSuggestionProvider();
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    const prompt = this.buildPrompt(req);
    const model = req.model?.trim() || this.model;

    try {
      const response = await this.callCodex(prompt, model);
      return parseModelResponse(response);
    } catch (error) {
      if (isTokenInvalid(error)) {
        console.warn(`Token error: ${sanitizeAuthError(error)}. Falling back to stub mode.`);
        return this.stubProvider.suggest(req);
      }

      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Codex transport failed: ${message}. Falling back to stub mode.`);
      return this.stubProvider.suggest(req);
    }
  }

  private buildPrompt(req: SuggestionRequest): string {
    return [
      buildPrompt(req),
      "",
      "Important constraints:",
      `- Document: ${req.documentId}`,
      `- Block: ${req.blockId}`,
      `- Selection span: start=${req.selection.charStart}, end=${req.selection.charEnd}`,
      "- The final response must change only the selected span; do NOT rewrite unrelated paragraphs or headings.",
      "- Return only the JSON object from the OUTPUT FORMAT section; no markdown or explanation.",
      "- Prefer conservative edits when context is ambiguous.",
    ].join("\n");
  }

  private callCodex(prompt: string, model: string): Promise<string> {
    const workDir = mkdtempSync(join(tmpdir(), "writing-copilot-codex-"));
    const outputPath = resolve(workDir, OUTPUT_FILE_NAME);
    const schemaPath = resolve(workDir, SCHEMA_FILE_NAME);

    return new Promise<string>((resolve, reject) => {
      const env = {
        ...process.env,
      } as NodeJS.ProcessEnv;

      delete env.OPENAI_API_KEY;

      const apiKey = this.getApiKey();
      if (apiKey) {
        env.OPENAI_API_KEY = apiKey;
      }

      const args = [
        "exec",
        "--sandbox",
        "workspace-write",
        "--json",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "--model",
        model,
      ];

      if (process.env.CODEX_SKIP_GIT_REPO_CHECK !== "false") {
        args.push("--skip-git-repo-check");
      }

      const schema = getCodexOutputSchema();
      writeFileSync(schemaPath, JSON.stringify(schema), "utf8");

      args.push(prompt);

      const proc = spawn(this.command, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env,
      });

      const timeout = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {}
      }, this.timeoutMs);

      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      proc.stdout?.setEncoding("utf8");
      proc.stderr?.setEncoding("utf8");
      proc.stdout?.on("data", (chunk: string) => stdoutChunks.push(chunk));
      proc.stderr?.on("data", (chunk: string) => stderrChunks.push(chunk));

      proc.once("error", (error) => {
        clearTimeout(timeout);
        this.cleanup(workDir);
        reject(error);
      });

      proc.once("close", (code, signal) => {
        clearTimeout(timeout);
        const result: CodexCommandResult = {
          code,
          signal,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
        };

        if (code !== 0) {
          this.cleanup(workDir);
          const details = [
            `Codex command failed with code ${code ?? "(signal " + signal + ")"}`,
            result.stderr && `stderr: ${result.stderr.slice(0, 2000)}`,
            result.stdout && `stdout: ${result.stdout.slice(0, 2000)}`,
          ]
            .filter(Boolean)
            .join("\n");
          const err = new Error(details || `Codex command exited with code ${code}`);
          return reject(err);
        }

        try {
          const raw = readFileSync(outputPath, "utf8");
          if (!raw.trim()) {
            throw new Error("Codex returned an empty response file.");
          }
          resolve(raw);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          reject(
            new Error(
              `Failed to read Codex output file at ${outputPath}: ${message}. stdout: ${result.stdout.slice(0, 1000)} stderr: ${result.stderr.slice(0, 1000)}`
            )
          );
        } finally {
          this.cleanup(workDir);
        }
      });
    });
  }

  private cleanup(workDir: string): void {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }

  private getApiKey(): string {
    if (this.auth?.openai.type === "api-key") {
      return this.auth.openai.apiKey;
    }

    return "";
  }
}

export function createCodexProvider(auth?: ChatGptAuthConfig): CodexSuggestionProvider {
  return new CodexSuggestionProvider(auth);
}


function getCodexOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      issueSummary: { type: "string", minLength: 1 },
      rationale: { type: "string", minLength: 1 },
      proposedText: { type: "string", minLength: 1 },
      shownEdit: {
        type: ["object", "null"],
        properties: {
          editType: { type: "string", minLength: 1 },
          proposedText: { type: "string", minLength: 1 },
          whyThisEdit: { type: "string", minLength: 1 },
        },
        required: ["editType", "proposedText", "whyThisEdit"],
        additionalProperties: false,
      },
      lenses: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            focus: { type: "string", minLength: 1 },
            sourceSignals: {
              type: "array",
              items: { type: "string", minLength: 1 },
            },
            relevance: { type: "string", minLength: 1 },
          },
          required: ["name", "focus", "sourceSignals", "relevance"],
          additionalProperties: false,
        },
      },
      provocations: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: [
                "critique",
                "alternative",
                "counterargument",
                "fallacy-check",
                "lateral-move",
                "source-question",
              ],
            },
            stage: {
              type: "string",
              enum: ["source-processing", "final-output", "both"],
            },
            prompt: { type: "string", minLength: 1 },
            whyItMatters: { type: "string", minLength: 1 },
            optional: { type: "boolean" },
          },
          required: ["kind", "stage", "prompt", "whyItMatters", "optional"],
          additionalProperties: false,
        },
      },
      riskNotes: { type: ["string", "null"] },
      confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
    },
    required: [
      "issueSummary",
      "rationale",
      "proposedText",
      "shownEdit",
      "lenses",
      "provocations",
      "riskNotes",
      "confidence",
    ],
    additionalProperties: false,
  };
}
