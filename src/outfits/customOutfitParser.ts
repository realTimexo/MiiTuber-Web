export type CustomOutfitInfo = {
  detected: boolean;
  supported: boolean;
  format: "standard-mii" | "legacy-miic" | "modern-miic" | "custom-container" | "unknown";
  message: string;
  metadata: Record<string, string>;
};

const STANDARD_SIZES = new Set([46, 47, 74, 76, 96]);
const LEGACY_MIIC_SIZES = new Set([104, 106, 108]);

function printableText(bytes: Uint8Array): string {
  let result = "";
  for (const value of bytes) {
    result += value >= 32 && value <= 126 ? String.fromCharCode(value) : " ";
  }
  return result.replace(/\s+/g, " ").trim();
}

export function inspectCustomOutfit(bytes: Uint8Array, filename = ""): CustomOutfitInfo {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  if (STANDARD_SIZES.has(bytes.length)) {
    return {
      detected: extension === "ffsd" || extension === "cfsd",
      supported: true,
      format: "standard-mii",
      message:
        "Standard FFSD detected. The Mii will load fully; Mii Creator caps and custom clothing are separate 3D assets and are not part of these 96 bytes.",
      metadata: {
        payloadBytes: String(bytes.length),
        customLayer: "separate GLB/GLTF required",
      },
    };
  }
  if (LEGACY_MIIC_SIZES.has(bytes.length)) {
    return {
      detected: extension === "miic" || bytes.length > 96,
      supported: true,
      format: "legacy-miic",
      message: "Legacy Mii Creator data detected; the standard Mii payload was mapped.",
      metadata: { payloadBytes: "96", customLayer: "not represented by FFL.js" },
    };
  }
  if (bytes.length === 128 || extension === "miic") {
    return {
      detected: true,
      supported: false,
      format: "modern-miic",
      message: "Modern Mii Creator data detected. Export an FFSD base Mii before rendering; the custom outfit was not silently discarded.",
      metadata: { exportHint: "Export the base Mii as FFSD in Mii Creator" },
    };
  }

  const text = printableText(bytes);
  const looksLikeContainer = /outfit|clothing|accessory|custom|gltf|glb/i.test(text);
  return {
    detected: looksLikeContainer,
    supported: STANDARD_SIZES.has(bytes.length),
    format: looksLikeContainer ? "custom-container" : "unknown",
    message: looksLikeContainer
      ? "Custom outfit container detected, but it does not contain a safe executable 3D asset. Standard Mii data will be checked separately."
      : "Unknown Mii format.",
    metadata: looksLikeContainer ? { containerText: text.slice(0, 160) } : {},
  };
}
