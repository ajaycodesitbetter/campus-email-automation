import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpRight, Layers, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
interface Campaign {
  id: number;
  name: string;
  description: string;
}
export default function CampaignSidebar({
  selectedCampaign,
  onSelectCampaign,
}: {
  selectedCampaign: number | null;
  onSelectCampaign: (id: number | null) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const {
    data: campaigns = [],
    isPending,
    error,
  } = useQuery<Campaign[]>({ queryKey: ["/api/campaigns"] });
  const create = useMutation({
    mutationFn: async () =>
      (
        await apiRequest("POST", "/api/campaigns", {
          name: name.trim(),
          emoji: "",
          description: "",
        })
      ).json(),
    onSuccess: (campaign) => {
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onSelectCampaign(campaign.id);
      setCreating(false);
      setName("");
    },
    onError: (e) =>
      toast({
        title: "Could not create campaign",
        description: e.message,
        variant: "destructive",
      }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      onSelectCampaign(null);
      qc.invalidateQueries();
    },
    onError: (e) =>
      toast({
        title: "Could not delete campaign",
        description: e.message,
        variant: "destructive",
      }),
  });
  return (
    <aside className="fw-sidebar">
      <div className="fw-sidebar-title">
        <span>Your workspace</span>
        <span>{campaigns.length.toString().padStart(2, "0")}</span>
      </div>
      <button className="fw-new" onClick={() => setCreating(!creating)}>
        <Plus size={17} /> New campaign
      </button>
      {creating && (
        <form
          className="fw-create"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <label htmlFor="campaign-name">Campaign name</label>
          <input
            id="campaign-name"
            value={name}
            maxLength={100}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Placement updates"
            required
          />
          <div>
            <button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create campaign"}
            </button>
            <button
              type="button"
              aria-label="Cancel new campaign"
              onClick={() => setCreating(false)}
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}
      <button
        className={`fw-campaign ${selectedCampaign === null ? "is-selected" : ""}`}
        onClick={() => onSelectCampaign(null)}
      >
        <Layers size={17} />
        <span>
          All campaigns<small>The whole picture</small>
        </span>
      </button>
      <div className="fw-sidebar-title fw-list-title">Campaigns</div>
      {isPending && <p className="fw-muted">Loading campaigns...</p>}
      {error && <p role="alert">Campaigns could not load. Try Refresh.</p>}
      {!isPending && !error && !campaigns.length && (
        <p className="fw-muted">
          Your first campaign starts here. Create one above.
        </p>
      )}
      {campaigns.map((c, i) => (
        <div className="fw-campaign-row" key={c.id}>
          <button
            className={`fw-campaign ${selectedCampaign === c.id ? "is-selected" : ""}`}
            onClick={() => onSelectCampaign(c.id)}
          >
            <span className="fw-index">{String(i + 1).padStart(2, "0")}</span>
            <span>
              {c.name}
              <small>Campaign workspace</small>
            </span>
          </button>
          <button
            className="fw-delete"
            aria-label={`Delete ${c.name}`}
            disabled={remove.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${c.name}" and its contacts and reports? This cannot be undone.`,
                )
              )
                remove.mutate(c.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="fw-sidebar-note">
        <ArrowUpRight size={21} />
        <strong>One row. One person.</strong>
        <p>
          Import your list, add personal details, then review before sending.
        </p>
        <span>CSV + Excel supported</span>
      </div>
    </aside>
  );
}
