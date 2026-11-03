import { z } from "zod";

export const imageSchema = z.string().max(8_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Choose a valid JPEG, PNG or WebP image.").superRefine((image, ctx) => {
  try {
    const encoded = image.split(",")[1];
    if (!encoded) throw new Error();
    const bytes = atob(encoded);
    const jpeg = bytes.startsWith("\xff\xd8\xff");
    const png = bytes.startsWith("\x89PNG\r\n\x1a\n");
    const webp = bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    if (!(image.startsWith("data:image/jpeg;") ? jpeg : image.startsWith("data:image/png;") ? png : webp)) throw new Error();
  } catch { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image content does not match its format." }); }
});

export const scanResultSchema = z.object({
  item: z.string().trim().min(1).max(150),
  category: z.enum(["organic", "recyclable", "hazardous", "ewaste", "residual"]),
  bin: z.string().trim().min(1).max(200),
  confidence: z.number().min(0).max(100).nullable(),
  reasoning: z.string().trim().min(1).max(1500),
  steps: z.array(z.string().trim().min(1).max(500)).min(1).max(6),
  source: z.enum(["gateway", "python"]).optional(),
});
export type ScanResult = z.infer<typeof scanResultSchema>;
export const assessmentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("classified"), result: scanResultSchema }),
  z.object({ status: z.literal("uncertain"), message: z.string().trim().min(1).max(500) }),
]);
export type Assessment = z.infer<typeof assessmentSchema>;

export const recommendedBins = {
  organic: "Green Bin (Organic / Wet Waste)",
  recyclable: "Blue Bin (Dry Recyclable Waste)",
  hazardous: "Red Bin (Hazardous Waste Depot)",
  ewaste: "Red Bin (Special E-Waste Bin)",
  residual: "Black Bin (Residual Non-Recyclable Waste)",
} as const;