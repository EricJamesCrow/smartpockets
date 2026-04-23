import { describe, expect, it } from "vitest";
import "../agent/tools/propose/proposeReminderCreate";
import "../agent/tools/propose/proposeReminderDelete";
import { buildReminderCreateAffectedIds } from "../agent/tools/propose/proposeReminderCreate";
import { filterReminderRows } from "../agent/tools/read/listReminders";
import {
  getReversalHandler,
  getToolExecutor,
} from "../agent/writeTool";

type Reminder = {
  _id: string;
  userId: string;
  title: string;
  dueAt: number;
  isDone: boolean;
  dismissedAt?: number;
  notes?: string;
  relatedResourceType: string;
  relatedResourceId?: string;
  channels: Array<"chat" | "email">;
  createdByAgent: boolean;
};

function makeCtx(opts: { viewerId: string; reminders: Reminder[] }) {
  const store = new Map<string, Reminder>(
    opts.reminders.map((r) => [r._id, { ...r }]),
  );
  let nextId = 1;
  const handle = (id: string) => ({
    _id: id,
    get userId() { return store.get(id)!.userId; },
    get title() { return store.get(id)!.title; },
    get dismissedAt() { return store.get(id)!.dismissedAt; },
    patch: async (p: Partial<Reminder>) => {
      const prev = store.get(id)!;
      store.set(id, { ...prev, ...p });
    },
  });
  return {
    viewerX: () => ({ _id: opts.viewerId }),
    table: (name: string) => {
      if (name !== "reminders") throw new Error("unexpected table " + name);
      return {
        get: async (id: string) => (store.has(id) ? handle(id) : null),
        getX: async (id: string) => {
          if (!store.has(id)) throw new Error("reminder_missing");
          return handle(id);
        },
        insert: async (doc: Omit<Reminder, "_id">) => {
          const id = "rem_" + nextId++;
          store.set(id, { _id: id, ...doc });
          return id;
        },
      };
    },
    store,
  };
}

describe("propose_reminder_create executor", () => {
  it("uses title and dueAt for create dedupe", () => {
    const first = {
      title: "Pay card",
      dueAt: 1_800_000_000_000,
      relatedResourceType: "none" as const,
    };
    const second = { ...first, dueAt: 1_800_086_400_000 };
    expect(buildReminderCreateAffectedIds(first)).toEqual([
      "new:pay card:1800000000000",
    ]);
    expect(buildReminderCreateAffectedIds(second)).toEqual([
      "new:pay card:1800086400000",
    ]);
  });

  it("inserts a reminder with createdByAgent and chat channel default", async () => {
    const ctx = makeCtx({ viewerId: "user_1", reminders: [] });
    const exec = getToolExecutor("propose_reminder_create")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({
        title: "Pay card",
        dueAt: 1_800_000_000_000,
        relatedResourceType: "none",
      }),
    });
    expect((result.reversalPayload as any).kind).toBe("reminder_dismiss");
    const [r] = Array.from(ctx.store.values());
    expect(r.createdByAgent).toBe(true);
    expect(r.channels).toEqual(["chat"]);
    expect(r.userId).toBe("user_1");
  });

  it("reversal dismisses the created reminder", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      reminders: [
        {
          _id: "rem_1",
          userId: "user_1",
          title: "x",
          dueAt: 1,
          isDone: false,
          relatedResourceType: "none",
          channels: ["chat"],
          createdByAgent: true,
        },
      ],
    });
    const reverse = getReversalHandler("propose_reminder_create")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify({ reminderId: "rem_1" }),
    });
    expect(ctx.store.get("rem_1")!.dismissedAt).toBeGreaterThan(0);
  });
});

describe("list_reminders filtering", () => {
  it("excludes dismissed reminders", () => {
    const rows = filterReminderRows(
      [
        {
          _id: "rem_1",
          dueAt: 1_800_000_000_000,
          isDone: false,
        },
        {
          _id: "rem_2",
          dueAt: 1_800_000_000_000,
          isDone: false,
          dismissedAt: 1_700_000_000_000,
        },
      ],
      { now: 1_700_000_000_000 },
    );
    expect(rows.map((r) => r._id)).toEqual(["rem_1"]);
  });
});

describe("propose_reminder_delete executor", () => {
  it("dismisses a reminder owned by the viewer", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      reminders: [
        {
          _id: "rem_1",
          userId: "user_1",
          title: "x",
          dueAt: 1,
          isDone: false,
          relatedResourceType: "none",
          channels: ["chat"],
          createdByAgent: false,
        },
      ],
    });
    const exec = getToolExecutor("propose_reminder_delete")!;
    const result = await exec(ctx as any, {
      argsJson: JSON.stringify({ reminderId: "rem_1" }),
    });
    expect((result.reversalPayload as any).kind).toBe("reminder_undismiss");
    expect(ctx.store.get("rem_1")!.dismissedAt).toBeGreaterThan(0);
  });

  it("rejects deleting a reminder owned by another user", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      reminders: [
        {
          _id: "rem_1",
          userId: "user_2",
          title: "x",
          dueAt: 1,
          isDone: false,
          relatedResourceType: "none",
          channels: ["chat"],
          createdByAgent: false,
        },
      ],
    });
    const exec = getToolExecutor("propose_reminder_delete")!;
    await expect(
      exec(ctx as any, {
        argsJson: JSON.stringify({ reminderId: "rem_1" }),
      }),
    ).rejects.toThrow(/not_authorized/);
  });

  it("reversal clears dismissedAt", async () => {
    const ctx = makeCtx({
      viewerId: "user_1",
      reminders: [
        {
          _id: "rem_1",
          userId: "user_1",
          title: "x",
          dueAt: 1,
          isDone: false,
          dismissedAt: 12345,
          relatedResourceType: "none",
          channels: ["chat"],
          createdByAgent: false,
        },
      ],
    });
    const reverse = getReversalHandler("propose_reminder_delete")!;
    await reverse(ctx as any, {
      reversalPayloadJson: JSON.stringify({ reminderId: "rem_1" }),
    });
    expect(ctx.store.get("rem_1")!.dismissedAt).toBeUndefined();
  });
});
