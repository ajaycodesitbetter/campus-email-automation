import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
export default function StatsCards({
  campaignId,
}: {
  campaignId?: number | null;
}) {
  const {
    data: stats,
    isPending,
    error,
  } = useQuery({
    queryKey: ["/api/stats", campaignId],
    queryFn: async () => {
      const r = await fetch(
        getApiUrl(`/api/stats${campaignId ? `?campaignId=${campaignId}` : ""}`),
        { credentials: "include" },
      );
      if (!r.ok) throw new Error("Reports unavailable");
      return r.json();
    },
  });
  return (
    <div className="fw-stats" aria-label="Campaign summary">
      {[
        ["People", stats?.totalStudents],
        ["Sent", stats?.emailsSent],
        ["Failed", stats?.emailsFailed],
        ["Queued", stats?.emailsPending],
      ].map(([label, value], i) => (
        <div key={label} className={`fw-stat fw-stat-${i}`}>
          <span>{label}</span>
          <strong>
            {error ? "Unavailable" : isPending ? "..." : (value ?? 0)}
          </strong>
          <small>
            {
              [
                "In your contact list",
                "Accepted by mail server",
                "Need your attention",
                "Waiting to be processed",
              ][i]
            }
          </small>
        </div>
      ))}
    </div>
  );
}
