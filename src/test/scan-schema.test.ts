import { describe, expect, it } from "vitest";
import { imageSchema, validateAssessment, recommendedBins } from "@/lib/scan-schema";
const result = { item: "Test item", category: "organic", bin: "Wrong bin", confidence: 80, reasoning: "Test assessment.", steps: ["Check local collection rules."] };
describe("Waste assessment validation", () => {
  it.each(Object.keys(recommendedBins))("accepts %s and uses the canonical bin", (category) => {
    const assessment = validateAssessment({ status: "classified", result: { ...result, category } });
    expect(assessment.status).toBe("classified");
    if (assessment.status === "classified") expect(assessment.result.bin).toBe(recommendedBins[assessment.result.category]);
  });
  it("rejects a classification below 55 percent", () => {
    expect(validateAssessment({ status: "classified", result: { ...result, confidence: 54.99 } }).status).toBe("uncertain");
  });
  it("accepts the exact 55 percent boundary", () => {
    expect(validateAssessment({ status: "classified", result: { ...result, confidence: 55 } }).status).toBe("classified");
  });
  it("does not invent absent confidence", () => {
    expect(validateAssessment({ status: "classified", result: { ...result, confidence: null } }).status).toBe("uncertain");
  });
  it("rejects an unknown category instead of labeling it residual", () => {
    expect(() => validateAssessment({ status: "classified", result: { ...result, category: "unknown" } })).toThrow();
  });
  it("rejects malformed disposal steps", () => {
    expect(() => validateAssessment({ status: "classified", result: { ...result, steps: [42] } })).toThrow();
  });
  it("rejects a mislabeled image payload", () => {
    expect(imageSchema.safeParse("data:image/jpeg;base64,aGVsbG8=").success).toBe(false);
  });
  it("rejects SVG and arbitrary URLs", () => {
    expect(imageSchema.safeParse("data:image/svg+xml;base64,PHN2Zz4=").success).toBe(false);
    expect(imageSchema.safeParse("https://example.com/image.jpg").success).toBe(false);
  });
  it("rejects an oversized encoded image", () => {
    expect(imageSchema.safeParse("data:image/jpeg;base64," + "A".repeat(8_000_001)).success).toBe(false);
  });
});