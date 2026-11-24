import assert from "node:assert/strict";
import express from "express";
import { registerRoutes } from "../server/routes";
import { storage } from "../server/storage";
import { emailService } from "../server/services/emailService";
const states: any[] = [];
Object.assign(storage, {
  getEmailConfig: async () => ({
    senderEmail: "sender@example.com",
    dailyLimit: 150,
    usedToday: 0,
  }),
  getStudentById: async () => ({
    id: 1,
    campaignId: 1,
    email: "person@example.com",
    name: "Maya",
    section: "CSE",
  }),
  getStudents: async () => [
    {
      id: 1,
      campaignId: 1,
      email: "person@example.com",
      name: "Maya",
      section: "CSE",
    },
  ],
  createEmailLog: async (data: any) => ({ id: 1, ...data }),
  updateEmailLogStatus: async (...args: any[]) => states.push(args),
  createActivityLog: async () => ({}),
});
let calls = 0;
Object.assign(emailService, {
  initialize: async () => {},
  sendEmail: async () => {
    calls++;
    return { success: false, error: "Mock rejection" };
  },
});
const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.session = { userId: req.headers["x-test-session"] ? 1 : undefined };
  next();
});
const server = await registerRoutes(app);
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const address = server.address() as any;
const base = `http://127.0.0.1:${address.port}`;
try {
  for (const path of [
    "/api/campaigns",
    "/api/students",
    "/api/email-config",
    "/api/email-logs",
    "/api/export-students",
  ])
    assert.equal((await fetch(base + path)).status, 401, path);
  assert.equal(
    (
      await fetch(base + "/api/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Test",
          message: "Test",
          targetSection: "all",
          campaignId: 1,
        }),
      })
    ).status,
    401,
  );
  assert.equal(calls, 0);
  const headers = {
    "Content-Type": "application/json",
    "x-test-session": "yes",
  };
  const r = await fetch(base + "/api/send-individual", {
    method: "POST",
    headers,
    body: JSON.stringify({ studentId: 1, subject: "Test", message: "Test" }),
  });
  assert.equal(r.status, 500);
  assert.equal(states.at(-1)[1], "failed");
  assert.ok(!states.some((s) => s[1] === "sent"));
  const t = await fetch(base + "/api/send-test", {
    method: "POST",
    headers,
    body: JSON.stringify({
      testEmail: "self@example.com",
      subject: "Test",
      message: "Test",
    }),
  });
  assert.equal(t.status, 500);
  const b = await fetch(base + "/api/send-bulk", {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject: "Test",
      message: "Test",
      targetSection: "all",
      campaignId: 1,
    }),
  });
  assert.equal(b.status, 200);
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(!states.some((s) => s[1] === "sent"));
  assert.equal(states.at(-1)[1], "failed");
  console.log(
    "PASS: private API authentication; unauthenticated send blocked; individual/test/bulk failures never recorded sent",
  );
} finally {
  await new Promise<void>((r) => server.close(() => r()));
}
