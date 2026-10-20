import { describe, expect, it } from "vitest";
import { documentSchema } from "@/features/documents/schemas";

describe("document form schema messages", () => {
  it("returns keys for required customers and document items", () => {
    const parsed = documentSchema.safeParse({ customerId: "", items: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toEqual([
        "validation.document.customerRequired",
        "validation.document.itemRequired",
      ]);
    }
  });
});
