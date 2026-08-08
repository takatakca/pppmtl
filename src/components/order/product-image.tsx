import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

/**
 * Product imagery is temporary and will be replaced by real catalog media.
 * Every state — loading, loaded, missing, broken — keeps the same box so a
 * missing photo can never collapse the layout.
 */
export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "broken">(src ? "loading" : "broken");

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {src && status !== "broken" && (
        <img
          ref={(el) => {
            // A cached image can finish decoding before onLoad is attached.
            if (el?.complete && el.naturalWidth > 0) setStatus("loaded");
          }}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("broken")}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {status !== "loaded" && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
        >
          {status === "broken" ? (
            <UtensilsCrossed className="h-5 w-5" />
          ) : (
            <span className="h-full w-full animate-pulse bg-muted" />
          )}
        </div>
      )}
    </div>
  );
}
