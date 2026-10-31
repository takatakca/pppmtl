/**
 * A small map of one address. Google Maps' basic embed needs no API key and costs nothing; it loads lazily so the
 * checkout stays fast.
 */
export function CheckoutMap({ query, title }: { query: string; title: string }) {
  return (
    <iframe
      title={title}
      src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="h-44 w-full border border-border grayscale-[30%] sm:h-52"
    />
  );
}
