import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: cuadro azul con check (urna verificada).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 18,
            height: 32,
            borderRight: "8px solid white",
            borderBottom: "8px solid white",
            transform: "rotate(45deg)",
            marginTop: -6,
          }}
        />
      </div>
    ),
    size
  );
}
