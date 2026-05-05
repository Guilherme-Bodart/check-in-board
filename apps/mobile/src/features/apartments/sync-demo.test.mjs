import { strict as assert } from "node:assert";
import test from "node:test";

import { createDemoIcalText } from "./sync-demo.ts";

test("createDemoIcalText builds one valid UTC VEVENT", () => {
  const icsText = createDemoIcalText({
    endsAt: new Date("2026-05-07T15:00:00.000Z"),
    startsAt: new Date("2026-05-06T18:00:00.000Z"),
    summary: "Reserved - Demo Sync",
    uid: "demo-source@example.com",
  });

  assert.match(icsText, /BEGIN:VCALENDAR/);
  assert.match(icsText, /BEGIN:VEVENT/);
  assert.match(icsText, /UID:demo-source@example.com/);
  assert.match(icsText, /DTSTART:20260506T180000Z/);
  assert.match(icsText, /DTEND:20260507T150000Z/);
  assert.match(icsText, /SUMMARY:Reserved - Demo Sync/);
});
