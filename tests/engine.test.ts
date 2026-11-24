import ExcelJS from "exceljs";
import assert from "node:assert/strict";
import { EmailService } from "../server/services/emailService";
import { CSVService } from "../server/services/csvService";
import { storage } from "../server/storage";
const mock = storage as any;
const mail = { to: "person@example.com", subject: "Test", text: "Hello" };
let calls = 0,
  used = 0;
mock.getEmailConfig = async () => ({
  senderEmail: "sender@example.com",
  senderPassword: "mock-only",
  dailyLimit: 2,
  usedToday: used,
});
mock.incrementDailyUsage = async () => {
  used++;
};
const service = new EmailService(() => {});
(service as any).transporter = {
  sendMail: async () => {
    calls++;
    return { messageId: "mock-id", rejected: [] };
  },
};
const results = await Promise.all([
  service.sendEmail(mail),
  service.sendEmail(mail),
  service.sendEmail(mail),
]);
assert.deepEqual(
  results.map((r) => r.success),
  [true, true, false],
);
assert.equal(calls, 2);
assert.equal(used, 2);
used = 0;
calls = 0;
const rejected = new EmailService(() => {});
(rejected as any).transporter = {
  sendMail: async () => {
    calls++;
    return { messageId: "rejected", rejected: ["person@example.com"] };
  },
};
assert.equal((await rejected.sendEmail(mail)).success, false);
assert.equal(calls, 1);
assert.equal(used, 0);
const authFailure = new EmailService(() => {});
calls = 0;
(authFailure as any).transporter = {
  sendMail: async () => {
    calls++;
    throw Object.assign(new Error("Authentication failed"), { code: "EAUTH" });
  },
};
assert.equal((await authFailure.sendEmail(mail)).success, false);
assert.equal(calls, 1);
const accounting = new EmailService(() => {});
calls = 0;
(accounting as any).transporter = {
  sendMail: async () => {
    calls++;
    return { messageId: "accepted", rejected: [] };
  },
};
mock.incrementDailyUsage = async () => {
  throw new Error("DB down");
};
assert.equal((await accounting.sendEmail(mail)).success, true);
assert.equal(calls, 1);
assert.equal((await accounting.sendEmail(mail)).success, false);
assert.equal(calls, 1);
const unresolved = new EmailService(() => {});
(unresolved as any).transporter = {
  sendMail: async () => {
    throw new Error("Must not send");
  },
};
mock.incrementDailyUsage = async () => {
  used++;
};
assert.equal(
  (await unresolved.sendEmail({ ...mail, text: "Hi {{Missing}}" })).success,
  false,
);
assert.equal(
  service.replacePlaceholders("Hi {{Name}}, {{Company}} / {{Unknown}}", {
    Name: "Maya",
    Company: "Forma",
  }),
  "Hi Maya, Forma / {{Unknown}}",
);
const csv = new CSVService();
const parsed = csv.parseCSV(
  "name,email,section,company\nMaya,maya@example.com,CSE,Forma\nArjun,arjun@example.com,CSE,Studio",
  { campaignId: 1 },
);
assert.equal(parsed.valid, true);
assert.equal(parsed.data.length, 2);
assert.equal(parsed.data[0].campaignId, 1);
assert.equal((parsed.data[0].additionalFields as any).company, "Forma");
assert.equal(
  csv.parseCSV("name,email,section\nMaya,invalid,CSE", { campaignId: 1 }).valid,
  false,
);
assert.equal(
  (await csv.parseFile("test", "bad.exe", { campaignId: 1 })).valid,
  false,
);
console.log(
  "PASS: concurrent daily cap; accurate failure; no permanent-error retry; accounting failure does not duplicate; custom variables; CSV import and invalid rows",
);

const book = new ExcelJS.Workbook();
const sheet = book.addWorksheet("Contacts");sheet.addRow(["name","email","section","company"]);sheet.addRow(["Maya","maya@example.com","CSE","Forma"]);
const excel = await csv.parseFile(Buffer.from(await book.xlsx.writeBuffer()), "contacts.xlsx", {campaignId:1});assert.equal(excel.valid,true);assert.equal(excel.data.length,1);
const duplicates=csv.parseCSV('name,email,section\nMaya,maya@example.com,CSE\nMaya,maya@example.com,CSE',{campaignId:1});assert.equal(duplicates.valid,false);assert.equal(duplicates.duplicates.length,1);
console.log("PASS: XLSX import and duplicate detection");
