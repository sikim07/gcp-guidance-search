import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F3EEE4",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 4,
            color: "#9A3412",
            textTransform: "uppercase",
          }}
        >
          ICH GCP · FDA · MFDS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#1F1B16", lineHeight: 1.1 }}>
            GCP Guidance Search
          </div>
          <div style={{ fontSize: 32, color: "#6B5E52", lineHeight: 1.4, maxWidth: 900 }}>
            Audit trail, informed consent, and KGCP clauses — unofficial lookup for
            clinical research teams.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
