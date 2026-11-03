export function Rating({ value, count }: { value: number | null; count: number }) {
  if (value === null || count === 0) return <span className="rating">New scout, no reviews yet</span>;
  const rounded = Math.round(value);
  return (
    <span className="rating">
      <span className="stars" aria-hidden="true">
        {"★".repeat(rounded)}
        {"☆".repeat(5 - rounded)}
      </span>{" "}
      <span aria-hidden="true">
        {value.toFixed(1)} ({count})
      </span>
      <span className="visually-hidden">
        Rated {value.toFixed(1)} out of 5 from {count} {count === 1 ? "review" : "reviews"}
      </span>
    </span>
  );
}
