import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  LogOut,
  RefreshCw,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CampaignSidebar from "@/components/CampaignSidebar";
import CampaignMetrics from "@/components/CampaignMetrics";
import StatsCards from "@/components/StatsCards";
import FileUpload from "@/components/FileUpload";
import EmailComposer from "@/components/EmailComposer";
import GmailConfig from "@/components/GmailConfig";
import Settings from "@/components/Settings";
import StudentTable from "@/components/StudentTable";
import RecentActivity from "@/components/RecentActivity";
export default function SafeDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [tab, setTab] = useState("workspace");
  const [refreshing, setRefreshing] = useState(false);
  const { logout, isLoggingOut } = useAuth();
  const qc = useQueryClient();
  const { data: config } = useQuery<{
    senderEmail: string;
    configured: boolean;
    dailyLimit: number;
  }>({ queryKey: ["/api/email-config"] });
  const { data: campaigns = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/campaigns"],
  });
  const name = campaigns.find((c) => c.id === selectedCampaign)?.name;
  return (
    <div className="fw-page">
      <div className="fw-app">
        <header className="fw-header">
          <a className="fw-brand" href="/">
            <ArrowUpRight size={25} />
            <span>
              campus<span className="fw-brand-light">mail</span>
            </span>
          </a>
          <nav aria-label="Workspace">
            <button
              className={tab === "workspace" ? "active" : ""}
              onClick={() => setTab("workspace")}
            >
              Campaigns
            </button>
            <button
              className={tab === "contacts" ? "active" : ""}
              onClick={() => setTab("contacts")}
            >
              Contacts
            </button>
            <button
              className={tab === "reports" ? "active" : ""}
              onClick={() => setTab("reports")}
            >
              Reports
            </button>
          </nav>
          <div className="fw-header-right">
            <span className="fw-sender">
              {config?.configured
                ? config.senderEmail
                : "Sender not configured"}
            </span>
            <button
              aria-label="Refresh all data"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await qc.invalidateQueries();
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
            <button
              aria-label="Open settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 size={18} />
            </button>
            <button
              aria-label="Sign out"
              onClick={logout}
              disabled={isLoggingOut}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <div className="fw-layout">
          <CampaignSidebar
            selectedCampaign={selectedCampaign}
            onSelectCampaign={(id) => {
              setSelectedCampaign(id);
              setTab("workspace");
            }}
          />
          <main className="fw-main">
            <div className="fw-title-row">
              <div>
                <p className="fw-eyebrow">
                  {selectedCampaign
                    ? "Campaign workspace"
                    : "Your email workspace"}
                </p>
                <h1>{name || "Good messages start here."}</h1>
                <p className="fw-subtitle">
                  {selectedCampaign
                    ? "Your people, your words. A personal email for every row."
                    : "Keep your campaigns organised. Make every email personal."}
                </p>
              </div>
              <span className="fw-workspace-mark">FIELDWORK / 01</span>
            </div>
            <ErrorBoundary componentName="Reports summary">
              <StatsCards campaignId={selectedCampaign} />
            </ErrorBoundary>
            {tab === "workspace" && (
              <>
                <div className="fw-steps" aria-label="Campaign workflow">
                  <a href="#import">
                    <span>1</span>Import your people
                  </a>
                  <ArrowRight size={15} />
                  <a href="#compose">
                    <span>2</span>Write your email
                  </a>
                  <ArrowRight size={15} />
                  <a href="#contacts">
                    <span>3</span>Review & send
                  </a>
                </div>
                <div className="fw-columns">
                  <div className="fw-primary-column">
                    <section id="import">
                      <ErrorBoundary componentName="Spreadsheet import">
                        <FileUpload
                          key={selectedCampaign}
                          campaignId={selectedCampaign}
                        />
                      </ErrorBoundary>
                    </section>
                    <section id="compose">
                      <ErrorBoundary componentName="Email composer">
                        <EmailComposer
                          key={selectedCampaign}
                          campaignId={selectedCampaign}
                        />
                      </ErrorBoundary>
                    </section>
                  </div>
                  <aside className="fw-secondary-column">
                    <ErrorBoundary componentName="Sender settings">
                      <GmailConfig />
                    </ErrorBoundary>
                    {selectedCampaign && (
                      <ErrorBoundary componentName="Campaign metrics">
                        <CampaignMetrics campaignId={selectedCampaign} />
                      </ErrorBoundary>
                    )}
                    <ErrorBoundary componentName="Recent activity">
                      <RecentActivity selectedCampaign={selectedCampaign} />
                    </ErrorBoundary>
                  </aside>
                </div>
              </>
            )}
            {tab !== "reports" && (
              <section id="contacts">
                <ErrorBoundary componentName="Contacts">
                  <StudentTable
                    key={selectedCampaign}
                    campaignId={selectedCampaign}
                  />
                </ErrorBoundary>
              </section>
            )}
            {tab === "reports" && (
              <div className="fw-columns">
                <div>
                  <ErrorBoundary componentName="Mail reports">
                    <RecentActivity selectedCampaign={selectedCampaign} />
                  </ErrorBoundary>
                  <StudentTable
                    key={selectedCampaign}
                    campaignId={selectedCampaign}
                  />
                </div>
                <div>
                  {selectedCampaign && (
                    <CampaignMetrics campaignId={selectedCampaign} />
                  )}
                </div>
              </div>
            )}
            <footer className="fw-footer">
              <span>Campus Mail · Fieldwork edition</span>
              <span>
                Sent means accepted by the mail server, not inbox delivery.
              </span>
            </footer>
          </main>
        </div>
        <Settings open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </div>
  );
}
