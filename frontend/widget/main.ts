// Widget app — renders inside the iframe at /embed?thread=<slug>.

import { escapeHtml, fmtDate } from "./format.ts";
import { type TreeNode, buildTree, clampDepth, pruneDeleted } from "./tree.ts";

interface CommentAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Reactions {
  up: number;
  user_reacted: boolean;
}

interface Comment {
  id: string;
  thread_id: string;
  parent_id: string | null;
  body: string;
  body_html: string;
  created_at: number;
  updated_at: number;
  deleted: boolean;
  author: CommentAuthor | null;
  reactions: Reactions;
}

const INDENT_PX = 20;

interface Me {
  id: string;
  display_name: string;
  avatar_url: string | null;
  provider: string;
}

const params = new URLSearchParams(location.search);
const thread = params.get("thread") ?? "default";

function mustGet(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`[sic] missing #${id} element`);
  return el;
}

const root = mustGet("app");

let me: Me | null = null;
let comments: Comment[] = [];
let replyingTo: string | null = null;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function notifyResize(): void {
  const h = document.documentElement.scrollHeight;
  window.parent.postMessage({ type: "sic:resize", height: h }, "*");
}

function replyForm(parentId: string): string {
  return `
    <form class="composer reply" data-parent="${parentId}">
      <textarea name="body" required maxlength="10000" placeholder="Write a reply…"></textarea>
      <div class="honeypot" aria-hidden="true">
        <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>
      <div class="row">
        <span class="error" data-role="composer-error"></span>
        <span>
          <button type="button" data-action="cancel-reply">Cancel</button>
          <button type="submit" class="primary">Reply</button>
        </span>
      </div>
    </form>`;
}

function renderNode(node: TreeNode<Comment>, depth: number): string {
  const c = node.comment;
  const indent = clampDepth(depth) * INDENT_PX;
  const inner = c.deleted
    ? `<div class="meta tombstone">[comment deleted]</div>`
    : `
        <div class="meta"><strong>${escapeHtml(c.author?.display_name ?? "")}</strong> · ${fmtDate(c.created_at)}</div>
        <div class="body">${c.body_html}</div>
        <div class="actions">
          <button data-action="up" class="${c.reactions.user_reacted ? "upvoted" : ""}">
            ▲ <span class="count">${c.reactions.up}</span>
          </button>
          ${me ? `<button data-action="reply">Reply</button>` : ""}
          ${me && c.author && me.id === c.author.id ? `<button data-action="delete">Delete</button>` : ""}
        </div>
        ${replyingTo === c.id ? replyForm(c.id) : ""}`;

  const avatar =
    !c.deleted && c.author?.avatar_url
      ? `<img class="avatar" src="${escapeHtml(c.author.avatar_url)}" alt="" />`
      : `<div class="avatar" aria-hidden="true"></div>`;

  const children = node.children.map((child) => renderNode(child, depth + 1)).join("");

  return `
    <article class="comment${depth > 0 ? " nested" : ""}" data-id="${c.id}" style="margin-left:${indent}px">
      ${avatar}
      <div style="flex:1; min-width:0;">
        ${inner}
      </div>
    </article>
    ${children}`;
}

function render(): void {
  const composer = me
    ? `
      <form class="composer" id="composer">
        <div class="meta">Posting as <strong>${escapeHtml(me.display_name)}</strong>
          · <button type="button" id="logout">Sign out</button></div>
        <textarea name="body" required maxlength="10000" placeholder="Write a comment…"></textarea>
        <div class="honeypot" aria-hidden="true">
          <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        </div>
        <div class="row">
          <span class="error" id="composer-error"></span>
          <button type="submit" class="primary">Comment</button>
        </div>
      </form>`
    : `
      <div class="composer">
        <div>Sign in to comment:</div>
        <div class="row">
          <span></span>
          <span>
            <a href="/auth/github/login?return_to=${encodeURIComponent(location.href)}"><button type="button">GitHub</button></a>
            <a href="/auth/google/login?return_to=${encodeURIComponent(location.href)}"><button type="button">Google</button></a>
          </span>
        </div>
      </div>`;

  const tree = pruneDeleted(buildTree(comments));
  const list = tree.map((node) => renderNode(node, 0)).join("");

  root.innerHTML = `
    ${composer}
    <section id="list">${list || '<p class="meta">No comments yet.</p>'}</section>
  `;

  bind();
  notifyResize();
}

function bind(): void {
  const composer = document.getElementById("composer") as HTMLFormElement | null;
  composer?.addEventListener("submit", onSubmit);
  document.getElementById("logout")?.addEventListener("click", onLogout);

  for (const form of document.querySelectorAll<HTMLFormElement>(".composer.reply")) {
    form.addEventListener("submit", onSubmit);
  }

  for (const article of document.querySelectorAll<HTMLElement>(".comment")) {
    const id = article.dataset.id;
    if (!id) continue;
    article
      .querySelector<HTMLButtonElement>('[data-action="up"]')
      ?.addEventListener("click", () => onReact(id));
    article
      .querySelector<HTMLButtonElement>('[data-action="delete"]')
      ?.addEventListener("click", () => onDelete(id));
    article
      .querySelector<HTMLButtonElement>('[data-action="reply"]')
      ?.addEventListener("click", () => onReply(id));
    article
      .querySelector<HTMLButtonElement>('[data-action="cancel-reply"]')
      ?.addEventListener("click", () => onReply(null));
  }
}

function onReply(id: string | null): void {
  replyingTo = replyingTo === id ? null : id;
  render();
}

async function onSubmit(ev: SubmitEvent): Promise<void> {
  ev.preventDefault();
  const form = ev.currentTarget as HTMLFormElement;
  const fd = new FormData(form);
  const body = String(fd.get("body") ?? "").trim();
  const website = String(fd.get("website") ?? "");
  const parentId = form.dataset.parent ?? null;
  const err =
    form.querySelector<HTMLElement>('[data-role="composer-error"]') ??
    document.getElementById("composer-error");
  if (err) err.textContent = "";

  if (!body) return;

  try {
    const created = await api<Comment>(`/api/threads/${encodeURIComponent(thread)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, website, ...(parentId ? { parent_id: parentId } : {}) }),
    });
    comments.push(created);
    replyingTo = null;
    render();
  } catch (e) {
    if (err) err.textContent = (e as Error).message;
  }
}

async function onReact(id: string): Promise<void> {
  const c = comments.find((x) => x.id === id);
  if (!c || !me) return;
  const method = c.reactions.user_reacted ? "DELETE" : "POST";
  try {
    await api<void>(`/api/comments/${id}/reactions/up`, { method });
    c.reactions.user_reacted = !c.reactions.user_reacted;
    c.reactions.up += c.reactions.user_reacted ? 1 : -1;
    render();
  } catch (e) {
    console.error(e);
  }
}

async function onDelete(id: string): Promise<void> {
  if (!confirm("Delete this comment?")) return;
  try {
    await api<void>(`/api/comments/${id}`, { method: "DELETE" });
    const c = comments.find((x) => x.id === id);
    if (c) {
      c.deleted = true;
      c.body = "";
      c.author = null;
    }
    render();
  } catch (e) {
    console.error(e);
  }
}

async function onLogout(): Promise<void> {
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  me = null;
  render();
}

async function load(): Promise<void> {
  try {
    me = await api<Me | null>("/api/me");
    const data = await api<{ comments: Comment[] }>(
      `/api/threads/${encodeURIComponent(thread)}/comments`
    );
    comments = data.comments;
  } catch (e) {
    root.innerHTML = `<p class="error">Failed to load comments: ${escapeHtml((e as Error).message)}</p>`;
    notifyResize();
    return;
  }
  render();
}

const ro = new ResizeObserver(() => notifyResize());
ro.observe(document.documentElement);

void load();
