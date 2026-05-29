import { describe, expect, it } from "vitest";
import { MAX_DEPTH, type TreeComment, buildTree, clampDepth, pruneDeleted } from "./tree.ts";

function c(id: string, parent_id: string | null, created_at: number, deleted = false): TreeComment {
  return { id, parent_id, created_at, deleted };
}

describe("buildTree", () => {
  it("nests replies under their parent", () => {
    const tree = buildTree([c("a", null, 1), c("b", "a", 2), c("c", "b", 3)]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.comment.id).toBe("a");
    expect(tree[0]?.children[0]?.comment.id).toBe("b");
    expect(tree[0]?.children[0]?.children[0]?.comment.id).toBe("c");
  });

  it("orders siblings and roots by created_at", () => {
    const tree = buildTree([c("a", null, 3), c("b", null, 1), c("a2", "b", 5), c("a1", "b", 4)]);
    expect(tree.map((n) => n.comment.id)).toEqual(["b", "a"]);
    expect(tree[0]?.children.map((n) => n.comment.id)).toEqual(["a1", "a2"]);
  });

  it("treats a reply with a missing parent as a root", () => {
    const tree = buildTree([c("a", null, 1), c("orphan", "gone", 2)]);
    expect(tree.map((n) => n.comment.id)).toEqual(["a", "orphan"]);
  });
});

describe("pruneDeleted", () => {
  it("keeps a deleted parent that still has live replies (tombstone)", () => {
    const tree = pruneDeleted(buildTree([c("a", null, 1, true), c("b", "a", 2)]));
    expect(tree).toHaveLength(1);
    expect(tree[0]?.comment.deleted).toBe(true);
    expect(tree[0]?.children[0]?.comment.id).toBe("b");
  });

  it("drops a deleted leaf entirely", () => {
    const tree = pruneDeleted(buildTree([c("a", null, 1), c("b", "a", 2, true)]));
    expect(tree[0]?.children).toHaveLength(0);
  });

  it("drops a deleted subtree with no live descendants", () => {
    const tree = pruneDeleted(buildTree([c("a", null, 1, true), c("b", "a", 2, true)]));
    expect(tree).toHaveLength(0);
  });
});

describe("clampDepth", () => {
  it("passes shallow depths through", () => {
    expect(clampDepth(0)).toBe(0);
    expect(clampDepth(2)).toBe(2);
  });

  it("clamps deep nesting to MAX_DEPTH", () => {
    expect(clampDepth(MAX_DEPTH + 5)).toBe(MAX_DEPTH);
  });
});
