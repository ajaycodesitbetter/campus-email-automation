export default function NoCampaignSelected({
  action,
}: {
  action: "upload" | "compose";
  onCreateCampaign?: () => void;
}) {
  return (
    <div className="fw-empty">
      <span className="fw-empty-number">
        {action === "upload" ? "01" : "02"}
      </span>
      <div>
        <h2>
          {action === "upload"
            ? "Start with your people."
            : "Make it sound like you."}
        </h2>
        <p>
          {action === "upload"
            ? "Create or select a campaign on the left, then upload a CSV or Excel file."
            : "Select a campaign to write your email. Use custom variables to add a personal detail to every message."}
        </p>
      </div>
    </div>
  );
}
