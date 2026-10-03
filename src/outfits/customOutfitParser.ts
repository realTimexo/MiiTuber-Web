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
      detected: false,
      supported: true,
      format: "standard-mii",
      message: "Standard-Mii-Daten erkannt.",
      metadata: {},
    };
  }
  if (LEGACY_MIIC_SIZES.has(bytes.length)) {
    return {
      detected: extension === "miic" || bytes.length > 96,
      supported: true,
      format: "legacy-miic",
      message: "Legacy-Mii-Creator-Daten erkannt; Standard-Mii-Payload übernommen.",
      metadata: { payloadBytes: "96", customLayer: "nicht in FFL.js abbildbar" },
    };
  }
  if (bytes.length === 128 || extension === "miic") {
    return {
      detected: true,
      supported: false,
      format: "modern-miic",
      message: "Modernes Mii-Creator-Format erkannt. Der Standard-Mii kann erst nach einem FFSD-Export gerendert werden; das Custom-Outfit wird nicht still verworfen.",
      metadata: { exportHint: "In Mii Creator als FFSD exportieren" },
    };
  }

  const text = printableText(bytes);
  const looksLikeContainer = /outfit|clothing|accessory|custom|gltf|glb/i.test(text);
  return {
    detected: looksLikeContainer,
    supported: STANDARD_SIZES.has(bytes.length),
    format: looksLikeContainer ? "custom-container" : "unknown",
    message: looksLikeContainer
      ? "Custom-Outfit-Container erkannt, aber kein sicher ausführbares 3D-Asset enthalten. Standard-Mii-Daten werden separat geprüft."
      : "Unbekanntes Mii-Format.",
    metadata: looksLikeContainer ? { containerText: text.slice(0, 160) } : {},
  };
}
