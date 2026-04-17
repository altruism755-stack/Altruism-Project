interface LogoProps {
  size?: number;
  color?: string;
  tagline?: boolean;
  taglineColor?: string;
  taglineSize?: number;
  align?: "left" | "center";
}

export function Logo({
  size = 22,
  color = "#FFFFFF",
  tagline = false,
  taglineColor,
  taglineSize,
  align = "left",
}: LogoProps) {
  const tSize = taglineSize ?? Math.max(10, Math.round(size * 0.3));
  const tGap = Math.round(size * 0.12);
  const tColor = taglineColor ?? color;

  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
          fontWeight: 800,
          fontSize: size,
          color,
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        Altruism
      </span>
      {tagline && (
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 400,
            fontSize: tSize,
            color: tColor,
            marginTop: tGap,
            letterSpacing: "0.02em",
            lineHeight: 1.1,
          }}
        >
          Volunteer Management Platform
        </span>
      )}
    </span>
  );
}
