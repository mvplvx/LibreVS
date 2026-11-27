import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { initialFieldSync, reduceFieldSync } from "./autosave";

describe("VS 2026 autosave state", () => {
  it("keeps a newer draft when an older response arrives", () => {
    let state = initialFieldSync("1", "t1");
    state = reduceFieldSync(state, { type: "edit", draft: "2" });
    assert.equal(state.status, "unsaved");
    state = reduceFieldSync(state, { type: "begin", epoch: 1 });
    state = reduceFieldSync(state, { type: "edit", draft: "3" });
    state = reduceFieldSync(state, { type: "success", epoch: 1, stored: "2", updatedAt: "t2" });
    assert.equal(state.draft, "3");
    assert.equal(state.stored, "2");
    assert.equal(state.updatedAt, "t2");
    assert.equal(state.status, "unsaved");
    state = reduceFieldSync(state, { type: "success", epoch: 1, stored: "9", updatedAt: "t9" });
    assert.equal(state.draft, "3");
    assert.equal(state.stored, "2");
  });

  it("ignores an out-of-order success and preserves zero, false, and an intentional clear", () => {
    let state = initialFieldSync("", null);
    state = reduceFieldSync(state, { type: "edit", draft: "0" });
    state = reduceFieldSync(state, { type: "begin", epoch: 1 });
    state = reduceFieldSync(state, { type: "success", epoch: 1, stored: "0", updatedAt: "t1" });
    assert.equal(state.status, "saved");
    assert.equal(state.stored, "0");

    state = reduceFieldSync(state, { type: "edit", draft: "false" });
    state = reduceFieldSync(state, { type: "begin", epoch: 2 });
    state = reduceFieldSync(state, { type: "success", epoch: 1, stored: "stale", updatedAt: "old" });
    assert.equal(state.status, "saving");
    assert.equal(state.draft, "false");
    state = reduceFieldSync(state, { type: "success", epoch: 2, stored: "false", updatedAt: "t2" });
    assert.equal(state.stored, "false");

    state = reduceFieldSync(state, { type: "edit", draft: "" });
    state = reduceFieldSync(state, { type: "begin", epoch: 3 });
    state = reduceFieldSync(state, { type: "success", epoch: 3, stored: "", updatedAt: null });
    assert.equal(state.status, "saved");
    assert.equal(state.stored, "");
    assert.equal(state.updatedAt, null);
  });

  it("keeps the local draft after a failure or a conflict", () => {
    let state = initialFieldSync("saved", "t1");
    state = reduceFieldSync(state, { type: "edit", draft: "draft" });
    state = reduceFieldSync(state, { type: "begin", epoch: 1 });
    state = reduceFieldSync(state, { type: "failure", epoch: 1, message: "The save failed." });
    assert.equal(state.status, "failed");
    assert.equal(state.draft, "draft");
    assert.equal(state.stored, "saved");

    state = reduceFieldSync(state, { type: "begin", epoch: 2 });
    state = reduceFieldSync(state, { type: "conflict", epoch: 2, message: "Conflict detected" });
    assert.equal(state.status, "conflict");
    assert.equal(state.draft, "draft");
    assert.equal(state.updatedAt, "t1");
  });

  it("does not start a second request while one is in flight", () => {
    let state = initialFieldSync("", null);
    state = reduceFieldSync(state, { type: "edit", draft: "1" });
    state = reduceFieldSync(state, { type: "begin", epoch: 1 });
    const ignored = reduceFieldSync(state, { type: "begin", epoch: 2 });
    assert.equal(ignored.pendingEpoch, 1);
    assert.equal(ignored.status, "saving");
  });
});
