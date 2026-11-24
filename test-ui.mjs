import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5173"],
  { stdio: "ignore" },
);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5173")).ok) break;
    } catch {}
    await pause(250);
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let campaigns = [
    {
      id: 1,
      name: "Placement drive · 2026",
      description: "Student placement updates",
    },
    { id: 2, name: "Alumni conversations", description: "Alumni outreach" },
  ];
  const people = [
    {
      id: 1,
      campaignId: 1,
      name: "Maya Shah",
      email: "maya@example.com",
      section: "CSE",
      additionalFields: { Company: "Forma", Student_id: "CS024" },
    },
    {
      id: 2,
      campaignId: 1,
      name: "Arjun Mehta",
      email: "arjun@example.com",
      section: "CSE",
      additionalFields: { Company: "Studio", Student_id: "CS025" },
    },
  ];
  const requests = [];
  await page.route("**/api/**", async (route) => {
    const r = route.request(),
      u = new URL(r.url()),
      p = u.pathname;
    requests.push({ method: r.method(), path: p });
    let data = {};
    if (p === "/api/auth-status") data = { authenticated: true };
    else if (p === "/api/campaigns") {
      if (r.method() === "POST") {
        const body = r.postDataJSON();
        data = { id: 3, ...body };
        campaigns.push(data);
      } else data = campaigns;
    } else if (p === "/api/email-config")
      data = {
        configured: true,
        senderEmail: "placement@example.com",
        dailyLimit: 150,
        usedToday: 28,
      };
    else if (p === "/api/stats" || p.endsWith("/stats"))
      data = {
        totalStudents: 50,
        emailsSent: 28,
        emailsFailed: 2,
        emailsPending: 20,
        totalEmails: 50,
      };
    else if (p === "/api/students") data = people;
    else if (p === "/api/sections") data = ["CSE"];
    else if (p === "/api/placeholders")
      data = {
        availableFields: ["Name", "Email", "Section", "Company", "Student_id"],
        fieldMapping: { company: "Company", student_id: "Student_id" },
      };
    else if (p === "/api/email-logs")
      data = [
        {
          id: 1,
          studentId: 1,
          email: "maya@example.com",
          subject: "Placement update",
          message: "Hi Maya",
          status: "sent",
          sentAt: new Date().toISOString(),
        },
        {
          id: 2,
          studentId: 2,
          email: "arjun@example.com",
          subject: "Placement update",
          message: "Hi Arjun",
          status: "failed",
          errorMessage: "Invalid mailbox",
          sentAt: new Date().toISOString(),
        },
      ];
    else if (p === "/api/activity-logs")
      data = [
        {
          id: 1,
          action: "CSV_UPLOAD",
          description: "50 people imported into Placement drive",
          createdAt: new Date().toISOString(),
          metadata: { campaignId: 1 },
        },
        {
          id: 2,
          action: "BULK_EMAIL_SENT",
          description: "Campaign queued for sending",
          createdAt: new Date().toISOString(),
          metadata: { campaignId: 1 },
        },
      ];
    else if (p === "/api/upload-csv")
      data = {
        recordCount: 2,
        students: people,
        availableFields: ["Name", "Email", "Section", "Company"],
      };
    else if (p === "/api/database-usage")
      data = { totalRecords: 52, storageUsed: "12 KB" };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("http://127.0.0.1:5173");
  await page
    .getByRole("heading", { name: "Good messages start here." })
    .waitFor();
  await page
    .getByRole("button", { name: /^01 Placement drive · 2026/ })
    .click();
  await page
    .locator("#compose")
    .getByText("Write your email", { exact: true })
    .waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: "/downloads/mail-fieldwork-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "{{Company}}", exact: true }).click();
  if (
    !(await page
      .locator("#compose textarea")
      .inputValue()
      .then((s) => s.includes("{{Company}}")))
  )
    throw new Error("Custom variable did not insert");
  await page
    .getByRole("button", { name: "Preview Email", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "demo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "name,email,section,company\nMaya,maya@example.com,CSE,Forma",
      ),
    });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Process File", exact: true }).click();
  await page
    .getByRole("button", { name: "View All Logs", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "/downloads/mail-fieldwork-logs.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.screenshot({
    path: "/downloads/mail-fieldwork-reports.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Campaigns", exact: true }).click();
  await page.getByRole("button", { name: "New campaign", exact: true }).click();
  await page.getByLabel("Campaign name").fill("Test campaign");
  await page
    .getByRole("button", { name: "Create campaign", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Test campaign", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: /^01 Placement drive · 2026/ })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-radix-toast-announce]").evaluateAll(nodes => nodes.forEach(n => n.remove()));
  await page.locator("[role=status]").evaluateAll(nodes => nodes.forEach(n => { if(n.closest("[data-state=open]")) n.closest("[data-state=open]").remove(); }));
  await page.waitForTimeout(700);
  await page.screenshot({
    path: "/downloads/mail-fieldwork-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/auth-status", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Offline" }),
    }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Your workspace is taking a break." })
    .waitFor();
  await page.screenshot({ path: "/downloads/mail-fieldwork-offline.png" });
  await page.route("**/api/auth-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"authenticated":false}',
    }),
  );
  await page.reload();
  await page.getByText("Welcome to Campus Mail").waitFor();
  await page.screenshot({ path: "/downloads/mail-fieldwork-login.png" });
  if (errors.length) throw new Error("Browser errors: " + errors.join("; "));
  if (overflow.scroll > overflow.width)
    throw new Error("Mobile overflow " + JSON.stringify(overflow));
  await writeFile(
    "/downloads/mail-ui-test-results.json",
    JSON.stringify(
      {
        passed: true,
        tests: [
          "desktop dashboard",
          "campaign selection",
          "reports navigation",
          "custom variable insertion",
          "email preview",
          "settings dialog",
          "CSV import",
          "mail logs dialog",
          "campaign creation",
          "390px responsive overflow check",
          "backend failure recovery",
          "admin login rendering",
        ],
        overflow,
        requests,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "UI smoke tests passed",
    overflow,
    requests.length,
    "mocked API requests, no real mail sent",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
