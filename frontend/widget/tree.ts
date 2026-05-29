// Pure comment-tree helpers, kept separate from main.ts so they're unit-testable
// without standing up the DOM. The backend returns a flat list (parent_id per
// comment); the widget assembles the tree, prunes dead branches, and clamps how
// deep nesting visually indents.

export const MAX_DEPTH = 3;

export interface TreeComment {
  id: string;
  parent_id: string | null;
  created_at: number;
  deleted: boolean;
}

export interface TreeNode<T extends TreeComment> {
  comment: T;
  children: TreeNode<T>[];
}

// Assemble a forest from the flat list. Siblings (and roots) are ordered by
// created_at ASC. A comment whose parent_id points at something not in the list
// (e.g. a hidden parent) is treated as a root so it isn't lost.
export function buildTree<T extends TreeComment>(comments: T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>();
  for (const comment of comments) {
    nodes.set(comment.id, { comment, children: [] });
  }

  const roots: TreeNode<T>[] = [];
  for (const node of nodes.values()) {
    const parentId = node.comment.parent_id;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const byDate = (a: TreeNode<T>, b: TreeNode<T>) => a.comment.created_at - b.comment.created_at;
  const sortRec = (list: TreeNode<T>[]) => {
    list.sort(byDate);
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

// Drop deleted subtrees that have no surviving (non-deleted) descendants. A
// deleted node that still has live replies is kept as a tombstone so the thread
// stays intact.
export function pruneDeleted<T extends TreeComment>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  const result: TreeNode<T>[] = [];
  for (const node of nodes) {
    const children = pruneDeleted(node.children);
    if (node.comment.deleted && children.length === 0) continue;
    result.push({ comment: node.comment, children });
  }
  return result;
}

// Visual indentation level for a node at the given true depth (root = 0).
export function clampDepth(depth: number): number {
  return Math.min(depth, MAX_DEPTH);
}
