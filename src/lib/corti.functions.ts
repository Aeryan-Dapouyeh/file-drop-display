import { createServerFn } from "@tanstack/react-start";

export type CortiFact = {
  id: string;
  text: string;
  group: string | null;
  source: string | null;
};

export type ExtractFactsResult =
  | { facts: CortiFact[]; error?: undefined }
  | { facts: []; error: string };

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
      return { facts: [], error: "Corti credentials are not configured." };
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
      return { facts: [], error: `Corti authentication failed (${tokenRes.status}).` };
    }

    const { access_token: token } = (await tokenRes.json()) as { access_token: string };

    const res = await fetch(`https://api.${environment}.corti.app/v2/tools/extract-facts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Tenant-Name": tenant,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: [{ type: "text", text: data.journal }],
        outputLanguage: "en",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Corti extract-facts failed [${res.status}]: ${body}`);
      return { facts: [], error: `Fact extraction failed (${res.status}): ${body.slice(0, 300)}` };
    }

    const payload = (await res.json()) as {
      facts?: Array<Record<string, unknown>>;
    };

    const facts: CortiFact[] = (payload.facts ?? []).map((fact, index) => ({
      id: String(fact["id"] ?? index),
      text: String(fact["text"] ?? ""),
      group: fact["group"] == null ? null : String(fact["group"]),
      source: fact["source"] == null ? null : String(fact["source"]),
    }));

    return { facts };
  });
