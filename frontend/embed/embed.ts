// Tiny loader. Injected on the host page. Finds <div id="sic-comments" data-thread="...">,
// renders an <iframe>, and listens for postMessage height updates from the widget.

(() => {
  const scriptEl = (document.currentScript ?? null) as HTMLScriptElement | null;
  const origin = scriptEl ? new URL(scriptEl.src).origin : window.location.origin;

  const mount = document.getElementById('sic-comments');
  if (!mount) {
    console.warn('[sic] No <div id="sic-comments"> found on page.');
    return;
  }

  const thread =
    mount.dataset.thread ?? document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? location.pathname;

  const iframe = document.createElement('iframe');
  iframe.src = `${origin}/embed?thread=${encodeURIComponent(thread)}`;
  iframe.title = 'Comments';
  iframe.loading = 'lazy';
  iframe.style.width = '100%';
  iframe.style.border = '0';
  iframe.style.colorScheme = 'normal';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');

  mount.appendChild(iframe);

  window.addEventListener('message', (ev) => {
    if (ev.source !== iframe.contentWindow) return;
    if (ev.origin !== origin) return;
    const data = ev.data as { type?: string; height?: number } | undefined;
    if (!data || data.type !== 'sic:resize') return;
    if (typeof data.height === 'number' && data.height > 0) {
      iframe.style.height = `${Math.ceil(data.height)}px`;
    }
  });
})();
