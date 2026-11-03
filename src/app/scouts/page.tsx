import type { Metadata } from "next";
import { parseFilters, searchScouts, listDestinations } from "@/lib/queries";
import { SearchExperience } from "@/components/SearchExperience";

export const metadata: Metadata = { title: "Find a scout" };

export default async function ScoutsPage({ searchParams }: PageProps<"/scouts">) {
  const filters = parseFilters(await searchParams);
  const [results, destinations] = await Promise.all([searchScouts(filters), listDestinations()]);
  return (
    <div className="wrap page">
      <h1>Find an accessibility scout</h1>
      <p className="lede">
        Every scout is a local with lived experience of disability. Filter by what matters to you; the list updates
        as you go.
      </p>
      <SearchExperience filters={filters} destinations={destinations} results={results} />
    </div>
  );
}
