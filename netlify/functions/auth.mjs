// Вход в админку Decap через GitHub без встроенного OAuth-провайдера Netlify.
// Шаг 1: отправляем пользователя на страницу авторизации GitHub.
// Нужны переменные окружения в Netlify: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
import crypto from "node:crypto";

export default async (req) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return new Response("GITHUB_CLIENT_ID не задан в настройках Netlify", { status: 500 });

  const url = new URL(req.url);
  const state = crypto.randomBytes(16).toString("hex");
  const origin = process.env.URL || url.origin; // адрес сайта из настроек Netlify, не из запроса
  const redirectUri = `${origin}/api/callback`;

  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", clientId);
  gh.searchParams.set("redirect_uri", redirectUri);
  gh.searchParams.set("scope", "public_repo"); // фиксированные права: только публичный репозиторий сайта
  gh.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: gh.toString(),
      "Set-Cookie": `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
};

export const config = { path: "/api/auth" };
