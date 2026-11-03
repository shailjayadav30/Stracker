import { describe, expect, it } from "vitest";
import { capPromptText } from "../src/lib/promptText.js";

describe("capPromptText (PDF text sent to the AI)", () => {
  it("leaves short text untouched", () => {
    expect(capPromptText("Unit 1\nTopic A", 100)).toEqual({
      promptText: "Unit 1\nTopic A",
      truncated: false,
    });
  });

  it("keeps text exactly at the limit", () => {
    const text = "x".repeat(100);
    expect(capPromptText(text, 100)).toEqual({ promptText: text, truncated: false });
  });

  it("cuts at the last line break near the limit, never mid-line", () => {
    // A line break at 90 of 100: cut there, dropping the half line after it
    const text = `${"a".repeat(90)}\n${"b".repeat(50)}`;
    const { promptText, truncated } = capPromptText(text, 100);
    expect(truncated).toBe(true);
    expect(promptText).toBe("a".repeat(90));
  });

  it("hard-cuts when the last line break is too far back", () => {
    // Only line break at 10 of 100: cutting there would lose too much text
    const text = `${"a".repeat(10)}\n${"b".repeat(200)}`;
    const { promptText, truncated } = capPromptText(text, 100);
    expect(truncated).toBe(true);
    expect(promptText).toHaveLength(100);
  });

  it("hard-cuts text with no line breaks", () => {
    expect(capPromptText("z".repeat(150), 100).promptText).toHaveLength(100);
  });
});
