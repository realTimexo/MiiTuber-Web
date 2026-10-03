import { describe, expect, it } from "vitest";
import { inspectCustomOutfit } from "./customOutfitParser";

describe("inspectCustomOutfit", () => {
  it("recognizes a native FFSD payload", () => {
    expect(inspectCustomOutfit(new Uint8Array(96), "avatar.ffsd").supported).toBe(true);
  });

  it("explains the modern Mii Creator limitation", () => {
    const result = inspectCustomOutfit(new Uint8Array(128), "avatar.miic");
    expect(result.detected).toBe(true);
    expect(result.supported).toBe(false);
    expect(result.message).toMatch(/FFSD/);
  });

  it("detects readable custom container hints without executing them", () => {
    const bytes = new TextEncoder().encode("custom outfit accessory");
    expect(inspectCustomOutfit(bytes, "avatar.bin").format).toBe("custom-container");
  });
});
