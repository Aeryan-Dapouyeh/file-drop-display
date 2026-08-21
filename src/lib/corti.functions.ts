import { createServerFn } from "@tanstack/react-start";

export type CortiFact = {
  id: string;
  text: string;
  group: string | null;
  source: string | null;
};

export type CortiCode = {
  id: string;
  system: string;
  code: string;
  display: string;
  evidence: string;
};

export type ExtractFactsResult =
  | { facts: CortiFact[]; codes: CortiCode[]; error?: undefined }
  | { facts: []; codes: []; error: string };

export const extractFacts = createServerFn({ method: "POST" })
  .inputValidator((input: { journal: string }) => {
    const journal = String(input?.journal ?? "").trim();
    if (!journal) throw new Error("Journal text is required.");
    return { journal };
  })
  .handler(async ({ data }): Promise<ExtractFactsResult> => {
    const clientId = process.env["CORTI_CLIENT_ID"];
    const clientSecret = process.env["CORTI_CLIENT_SECRET"];
    const environment = process.env["CORTI_ENVIRONMENT"] ?? "eu";
    const tenant = process.env["CORTI_TENANT"] ?? "base";

    if (!clientId || !clientSecret) {
      return { facts: [], codes: [], error: "Corti credentials are not configured." };
    }

    const tokenRes = await fetch(
      `https://auth.${environment}.corti.app/realms/${tenant}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
          scope: "openid",
        }),
      },
    );

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error(`Corti auth failed [${tokenRes.status}]: ${body}`);
      return { facts: [], codes: [], error: `Corti authentication failed (${tokenRes.status}).` };
    }

    const { access_token: token } = (await tokenRes.json()) as { access_token: string };

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Tenant-Name": tenant,
      "Content-Type": "application/json",
    };

    const [factsRes, codesRes] = await Promise.all([
      fetch(`https://api.${environment}.corti.app/v2/tools/extract-facts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          context: [{ type: "text", text: data.journal }],
          outputLanguage: "en",
        }),
      }),
      fetch(`https://api.${environment}.corti.app/v2/tools/coding/`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          system: ["icd10int-inpatient"],
          context: [{ type: "text", text: data.journal }],
        }),
      }),
    ]);

    if (!factsRes.ok) {
      const body = await factsRes.text();
      console.error(`Corti extract-facts failed [${factsRes.status}]: ${body}`);
      return {
        facts: [],
        codes: [],
        error: `Fact extraction failed (${factsRes.status}): ${body.slice(0, 300)}`,
      };
    }

    const payload = (await factsRes.json()) as {
      facts?: Array<Record<string, unknown>>;
    };

    const facts: CortiFact[] = (payload.facts ?? []).map((fact, index) => ({
      id: String(fact["id"] ?? index),
      text: String(fact["text"] ?? ""),
      group: fact["group"] == null ? null : String(fact["group"]),
      source: fact["source"] == null ? null : String(fact["source"]),
    }));

    let codes: CortiCode[] = [];
    if (codesRes.ok) {
      const codingPayload = (await codesRes.json()) as {
        codes?: Array<Record<string, unknown>>;
      };
      codes = (codingPayload.codes ?? []).map((item, index) => {
        const evidences = Array.isArray(item["evidences"])
          ? (item["evidences"] as Array<Record<string, unknown>>)
          : [];
        return {
          id: `${String(item["code"] ?? index)}-${index}`,
          system: String(item["system"] ?? ""),
          code: String(item["code"] ?? ""),
          display: String(item["display"] ?? ""),
          evidence: evidences
            .map((e) => String(e["text"] ?? ""))
            .filter(Boolean)
            .join(" | "),
        };
      });
    } else {
      const body = await codesRes.text();
      console.error(`Corti coding failed [${codesRes.status}]: ${body}`);
    }

    return { facts, codes };
  });

export type DictationSessionResult =
  | { url: string; error?: undefined }
  | { url: null; error: string };

/** Returns a short-lived Corti audio-bridge websocket URL for live dictation. */
export const createDictationSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<DictationSessionResult> => {
    const clientId = process.env["CORTI_CLIENT_ID"];
    const clientSecret = process.env["CORTI_CLIENT_SECRET"];
    const environment = process.env["CORTI_ENVIRONMENT"] ?? "eu";
    const tenant = process.env["CORTI_TENANT"] ?? "base";

    if (!clientId || !clientSecret) {
      return { url: null, error: "Corti credentials are not configured." };
    }

    const tokenRes = await fetch(
      `https://auth.${environment}.corti.app/realms/${tenant}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
          scope: "openid",
        }),
      },
    );

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error(`Corti auth failed [${tokenRes.status}]: ${body}`);
      return { url: null, error: `Corti authentication failed (${tokenRes.status}).` };
    }

    const { access_token: token } = (await tokenRes.json()) as { access_token: string };

    const url =
      `wss://api.${environment}.corti.app/audio-bridge/v2/transcribe` +
      `?tenant-name=${encodeURIComponent(tenant)}` +
      `&token=${encodeURIComponent(`Bearer ${token}`)}`;

    return { url };
  },
);
