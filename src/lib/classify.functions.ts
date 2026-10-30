import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ScanResult = {
  item: string;
  category: "organic" | "recyclable" | "hazardous" | "ewaste" | "residual";
  bin: string;
  confidence: number;
  reasoning: string;
  steps: string[];
};

const SYSTEM = `You are a waste segregation expert. Look at the image and classify the main waste item.
Categories and bins:
- organic: food scraps, fruit peels, natural waste -> "Green Bin (Organic / Wet Waste)"
- recyclable: clean plastic bottles, paper, cardboard, glass, metal cans (non-hazardous) -> "Blue Bin (Dry Recyclable Waste)"
- hazardous: aerosol spray cans, chemical tins, paint, batteries -> "Red Bin (Hazardous Waste Depot)"
- ewaste: electronics, circuit boards, cables, phones -> "Red Bin (Special E-Waste Bin)"
- residual: multi-layer packaging, biscuit/chip wrappers, laminates -> "Black Bin (Residual Non-Recyclable Waste)"
Reply with ONLY a JSON object: {"item": string, "category": one of the keys, "bin": string, "confidence": number 0-100, "reasoning": string (2 sentences), "steps": string[] (3-5 disposal steps)}`;

export const classifyWaste = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/").max(8_000_000) }).parse(d))
  .handler(async ({ data }): Promise<ScanResult> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI is not configured.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Classify this waste item." },
            { type: "image", image: new URL(data.image) },
          ],
        },
      ],
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "low",
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const text = await result.text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not analyze this image. Try a clearer photo.");
    const parsed = JSON.parse(match[0]) as ScanResult;
    const cats = ["organic", "recyclable", "hazardous", "ewaste", "residual"];
    if (!cats.includes(parsed.category)) parsed.category = "residual";
    parsed.confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));
    parsed.steps = Array.isArray(parsed.steps) ? parsed.steps.slice(0, 6) : [];
    return parsed;
  });
