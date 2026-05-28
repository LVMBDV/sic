// Widget app — renders inside the iframe at /embed?thread=<slug>.

import { escapeHtml, fmtDate } from "./format.ts";

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
  body: string;
  created_at: number;
  updated_at: number;
  author: CommentAuthor;
  reactions: Reactions;
}

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

  const list = comments
    .map(
      (c) => `
        <article class="comment" data-id="${c.id}">
          ${
            c.author.avatar_url
              ? `<img class="avatar" src="${escapeHtml(c.author.avatar_url)}" alt="" />`
              : `<div class="avatar" aria-hidden="true"></div>`
          }
          <div style="flex:1; min-width:0;">
            <div class="meta"><strong>${escapeHtml(c.author.display_name)}</strong> · ${fmtDate(c.created_at)}</div>
            <div class="body">${escapeHtml(c.body)}</div>
            <div class="actions">
              <button data-action="up" class="${c.reactions.user_reacted ? "upvoted" : ""}">
                ▲ <span class="count">${c.reactions.up}</span>
              </button>
              ${me && me.id === c.author.id ? `<button data-action="delete">Delete</button>` : ""}
            </div>
          </div>
        </article>`
    )
    .join("");

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

  for (const article of document.querySelectorAll<HTMLElement>(".comment")) {
    const id = article.dataset.id;
    if (!id) continue;
    article
      .querySelector<HTMLButtonElement>('[data-action="up"]')
      ?.addEventListener("click", () => onReact(id));
    article
      .querySelector<HTMLButtonElement>('[data-action="delete"]')
      ?.addEventListener("click", () => onDelete(id));
  }
}

async function onSubmit(ev: SubmitEvent): Promise<void> {
  ev.preventDefault();
  const form = ev.currentTarget as HTMLFormElement;
  const fd = new FormData(form);
  const body = String(fd.get("body") ?? "").trim();
  const website = String(fd.get("website") ?? "");
  const err = document.getElementById("composer-error");
  if (err) err.textContent = "";

  if (!body) return;

  try {
    const created = await api<Comment>(`/api/threads/${encodeURIComponent(thread)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, website }),
    });
    comments.push(created);
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
    comments = comments.filter((c) => c.id !== id);
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
