import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <h1>Page not found</h1>
      <p>We couldn&apos;t find that page. It may have moved, or the link may be wrong.</p>
      <p>
        <Link href="/scouts">Find a scout</Link> or <Link href="/">go to the home page</Link>.
      </p>
    </div>
  );
}
