import Home from "@/components/Home";
import SiteNav from "@/components/SiteNav";
import { getArchive, getRecentlyAdded } from "@/lib/posts";

export default function Page() {
  const recent = getRecentlyAdded(4);
  const archive = getArchive();
  const countries = [...new Set(archive.map((p) => p.trip.country))];
  return (
    <>
      <SiteNav />
      <Home recent={recent} archive={archive} countries={countries} />
    </>
  );
}
