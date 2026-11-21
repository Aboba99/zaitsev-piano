// Шаг 2: GitHub вернул код — меняем его на токен и передаём токен окну админки Decap.
// Токен отдаётся только странице нашего же сайта (проверка origin).

const js = (v) => JSON.stringify(v).replace(/</g, "\\u003c"); // символ < нельзя оставлять внутри <script>

const page = (status, payload, origin) => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Вход в админку</title></head>
<body><p>${status === "success" ? "Вход выполнен, окно закроется само." : "Не удалось войти. Закройте окно и попробуйте снова."}</p>
<script>
(function () {
  var allowed = ${js(origin)};
  var msg = "authorization:github:${status}:" + ${js(JSON.stringify(payload))};
  function receive(e) {
    if (e.origin !== allowed) return;
    window.opener.postMessage(msg, allowed);
    window.removeEventListener("message", receive, false);
    setTimeout(function () { window.close(); }, 500);
  }
  window.addEventListener("message", receive, false);
  if (window.opener) window.opener.postMessage("authorizing:github", allowed);
})();
</script></body></html>`;

const html = (body, extraHeaders = {}) =>
  new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      ...extraHeaders,
    },
  });

export default async (req) => {
  const url = new URL(req.url);
  const origin = process.env.URL || url.origin; // адрес сайта из настроек Netlify
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = req.headers.get("cookie") || "";
  const saved = (cookie.match(/(?:^|;\s*)decap_oauth_state=([a-f0-9]+)/) || [])[1];

  if (!code || !state || !saved || state !== saved) {
    return html(page("error", { message: "Неверный или устаревший запрос входа" }, origin));
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${origin}/api/callback`,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (!data.access_token) {
    return html(page("error", { message: data.error_description || "GitHub не выдал токен" }, origin));
  }
  return html(page("success", { token: data.access_token, provider: "github" }, origin));
};

export const config = { path: "/api/callback" };
