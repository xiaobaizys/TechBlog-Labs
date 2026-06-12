/**
 * 私密分享权限 API 集成测试 v3
 * 用法：npx tsx scripts/test-perm-api.ts
 */

const BASE = "http://localhost:4002";
const PUBLIC_ID = "cmqak1eml0002sqglw54mc102";
const PRIVATE_ID = "cmqak1emm0004sqglgr2qkr7j";

const ADMIN_LOGIN = { email: "admin@techblog.com", password: "Admin123" };
const AUTHOR_LOGIN = { email: "perm-test-user@techblog.com", password: "PermTest123" };

interface Jar {
  cookies: Map<string, string>;
}

function makeJar(): Jar {
  return { cookies: new Map() };
}

function cookieHeader(jar: Jar): string {
  return Array.from(jar.cookies.entries(), ([k, v]) => `${k}=${v}`).join("; ");
}

async function req(jar: Jar, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (jar.cookies.size > 0) headers.set("Cookie", cookieHeader(jar));
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  // collect Set-Cookie
  const all = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const sc of all) {
    const [pair] = sc.split(";");
    const [k, ...rest] = pair.split("=");
    jar.cookies.set(k.trim(), rest.join("=").trim());
  }
  return res;
}

async function login(jar: Jar, who: { email: string; password: string }): Promise<{ status: number; user: any }> {
  // 1. Get CSRF
  const csrfRes = await req(jar, "/api/auth/csrf");
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  // 2. Submit credentials
  const body = new URLSearchParams({
    csrfToken,
    email: who.email,
    password: who.password,
    callbackUrl: `${BASE}/`,
    json: "true",
  });
  const loginRes = await req(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  // 3. Verify session
  const sessionRes = await req(jar, "/api/auth/session");
  const session = await sessionRes.json();
  return { status: loginRes.status, user: session?.user ?? null };
}

function c(code: number, fg = "\x1b[0m") { return `${fg}${code}\x1b[0m`; }
const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", CYAN = "\x1b[36m", RESET = "\x1b[0m";

(async () => {
  console.log(`${CYAN}==========================================`);
  console.log(`  私密分享权限 API 集成测试 v3`);
  console.log(`==========================================${RESET}\n`);

  // ========================================
  // 1. GUEST
  // ========================================
  console.log(`${YELLOW}[1] GUEST (no login)${RESET}`);
  const g = makeJar();
  console.log(`    session = ${(await (await req(g, "/api/auth/session")).json())?.user ?? "(empty)"}`);
  const g200  = (await req(g, `/api/life-posts/${PUBLIC_ID}`)).status;
  const g404  = (await req(g, `/api/life-posts/${PRIVATE_ID}`)).status;
  const gDel  = (await req(g, `/api/life-posts/${PRIVATE_ID}`, { method: "DELETE" })).status;
  console.log(`    GET  public    = ${g200}  (expect 200)`);
  console.log(`    GET  private   = ${g404}  (expect 404)`);
  console.log(`    DELETE private = ${gDel}  (expect 401, no session)\n`);

  // ========================================
  // 2. ADMIN
  // ========================================
  console.log(`${YELLOW}[2] ADMIN  (admin@techblog.com / Admin123)${RESET}`);
  const a = makeJar();
  const admin = await login(a, ADMIN_LOGIN);
  console.log(`    login status   = ${admin.status}  user=${admin.user?.email ?? "(none)"}  role=${admin.user?.role ?? "(none)"}`);
  const a200 = (await req(a, `/api/life-posts/${PUBLIC_ID}`)).status;
  const a404 = (await req(a, `/api/life-posts/${PRIVATE_ID}`)).status;
  const aDel = (await req(a, `/api/life-posts/${PRIVATE_ID}`, { method: "DELETE" })).status;
  console.log(`    GET  public    = ${a200}  (expect 200)`);
  console.log(`    GET  private   = ${a404}  (expect 404) <-- KEY`);
  console.log(`    DELETE private = ${aDel}  (expect 403) <-- KEY\n`);

  // ========================================
  // 3. AUTHOR
  // ========================================
  console.log(`${YELLOW}[3] AUTHOR (perm-test-user@techblog.com / PermTest123)${RESET}`);
  const u = makeJar();
  const author = await login(u, AUTHOR_LOGIN);
  console.log(`    login status   = ${author.status}  user=${author.user?.email ?? "(none)"}  role=${author.user?.role ?? "(none)"}`);
  const u200  = (await req(u, `/api/life-posts/${PUBLIC_ID}`)).status;
  const u200b = (await req(u, `/api/life-posts/${PRIVATE_ID}`)).status;
  console.log(`    GET  public    = ${u200}  (expect 200)`);
  console.log(`    GET  private   = ${u200b}  (expect 200)\n`);

  // ========================================
  // 4. Summary
  // ========================================
  console.log(`${CYAN}==========================================`);
  console.log(`  Summary`);
  console.log(`==========================================${RESET}`);
  let pass = true;
  const check = (label: string, got: number, expected: number) => {
    if (got === expected) {
      console.log(`  ${GREEN}✓${RESET} ${label}  got=${got}`);
    } else {
      console.log(`  ${RED}✗${RESET} ${label}  got=${got}  expected=${expected}`);
      pass = false;
    }
  };
  check("guest GET public",    g200, 200);
  check("guest GET private",   g404, 404);
  check("guest DELETE private",gDel, 401);
  check("admin GET public",    a200, 200);
  check("admin GET private",   a404, 404);
  check("admin DELETE private",aDel, 403);
  check("author GET public",   u200, 200);
  check("author GET private",  u200b, 200);
  console.log();
  if (pass) {
    console.log(`${GREEN}ALL TESTS PASSED${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}SOME TESTS FAILED${RESET}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
