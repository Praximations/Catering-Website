/**
 * The browser checks, against a running server.
 *
 *   npm run dev -- --port 3100
 *   node scripts/smoke.mjs                       # or --base http://localhost:3200
 *
 * NOT part of `npm run verify`, and Playwright is NOT a dependency of this
 * project. Install it where you want to run this:
 *
 *   npm i -g playwright && npx playwright install chromium
 *
 * WHY THIS EXISTS SEPARATELY. The tests in tests/ cover logic. Five things
 * here can only be checked in a browser, and each one has been a real bug in
 * this codebase or is a claim that cannot be verified any other way:
 *
 *   1. Checkout uses post, redirect, get. An inline success state is destroyed
 *      when clearing the cart re-renders /cart into its empty state, which
 *      reads to the customer as a lost order. That was a real bug.
 *   2. The Content Security Policy blocks an injected script AND does not
 *      break hydration. A policy that does the first and not the second looks
 *      fine in a header and breaks the site.
 *   3. Signing out everywhere ends a session in a DIFFERENT browser. That
 *      needs two browser contexts.
 *   4. An order token is the only way to an order.
 *   5. Nothing makes a phone's page wider than the phone. Two real bugs: a
 *      grid column sized by its longest line, and a screen reader label that
 *      escaped a sideways carousel once its reveal animation ended. Both only
 *      showed after scrolling, which is why this scrolls and waits.
 *
 * It waits for "load", not "networkidle": links prefetch the pages they point
 * at, so the network is rarely idle on a page with a navbar.
 *
 * THIS SCRIPT WRITES REAL DATA. Point it at a development server.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  try {
    // A global install, which is the usual way to have it without adding it
    // to this project.
    ({ chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs"));
  } catch {
    console.error(
      "\n  Playwright is not installed. It is deliberately not a dependency of this project.\n" +
        "    npm i -g playwright && npx playwright install chromium\n"
    );
    process.exit(2);
  }
}

const args = process.argv.slice(2);
const at = args.indexOf("--base");
const BASE = (at >= 0 && args[at + 1] ? args[at + 1] : "http://localhost:3100").replace(/\/$/, "");

let pass = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? `  <- ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? `  <- ${detail}` : ""}`);
  }
}

const reachable = await fetch(BASE).then(
  (response) => response.ok,
  () => false
);
if (!reachable) {
  console.error(`\n  Nothing answering at ${BASE}. Start the dev server first.\n`);
  process.exit(2);
}

const browser = await chromium.launch();
const stamp = Date.now();
const ownerEmail = `smoke-owner-${stamp}@example.com`;
const password = "a-long-enough-password";

/* ------------------------- the whole customer journey ---------------------- */

console.log("\nThe customer journey\n");

const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(`${BASE}/signup`);
await page.fill('input[name="name"]', "Smoke Owner");
await page.fill('input[name="email"]', ownerEmail);
await page.fill('input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/(admin|account)/, { timeout: 30_000 });
const isOwner = page.url().includes("/admin");
check("signup signs the account straight in", true);

await page.goto(`${BASE}/shop`, { waitUntil: "load" });
const addButtons = page.locator('form button:has-text("Add")');
check("the shop lists orderable products", (await addButtons.count()) > 0);
await addButtons.first().click();
await page.waitForTimeout(1500);

await page.goto(`${BASE}/cart`, { waitUntil: "load" });
check("the cart prices the line server side", /\d[.,]\d\d/.test((await page.textContent("body")) ?? ""));

const eventDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
await page.fill('input[name="name"]', "Smoke Buyer");
await page.fill('input[name="email"]', `smoke-buyer-${stamp}@example.com`);
await page.fill('input[name="phone"]', "5550100000");
await page.fill('input[name="eventDate"]', eventDate);
await page.fill('input[name="guests"]', "60");
await page.fill('input[name="address"]', "1 Placeholder Road");
// Named, because each cart line also has an Update button of type submit.
await page.locator('button:has-text("Place order")').click();
await page.waitForURL(/\/orders\//, { timeout: 30_000 });

// The bug this is really for: an inline success state would leave the customer
// looking at an empty cart wondering whether the order went through.
check("checkout redirects to the order's own page", /\/orders\/[0-9a-f-]{36}/.test(page.url()), page.url());
const orderUrl = page.url();
const orderText = (await page.textContent("body")) ?? "";
check("the order page shows a reference and a total", /10\d\d/.test(orderText) && /\d[.,]\d\d/.test(orderText));

await page.goto(`${BASE}/cart`, { waitUntil: "load" });
check("the cart is empty afterwards", /empty/i.test((await page.textContent("body")) ?? ""));

// From the path alone: checkout lands on /orders/<token>?placed=1, and a regex
// anchored at the end of the full URL once quietly re-requested the real order.
const guessed = `${BASE}/orders/00000000-0000-0000-0000-000000000000`;
check("the guess really is a different address", !orderUrl.includes("00000000-0000"), orderUrl);
const guessedResponse = await page.goto(guessed);
check("a guessed order token is a plain 404", guessedResponse.status() === 404, `status ${guessedResponse.status()}`);
// Expected, so it is not counted as a finding below.
const expectedErrors = consoleErrors.length;

if (isOwner) {
  await page.goto(`${BASE}/admin`, { waitUntil: "load" });
  check("the owner dashboard lists the order", /Smoke Buyer/.test((await page.textContent("body")) ?? ""));
  await page.goto(`${BASE}/admin/praxi`, { waitUntil: "load" });
  check(
    "the Praxi permission dashboard renders",
    /Never|Ask me first|Allowed/.test((await page.textContent("body")) ?? "")
  );
}

check(
  "no uncaught client errors beyond the deliberate 404",
  consoleErrors.length === expectedErrors,
  consoleErrors.slice(expectedErrors, expectedErrors + 2).join(" | ")
);

/* ------------------------------ the CSP ------------------------------------ */

console.log("\nThe Content Security Policy\n");

const cspPage = await (await browser.newContext()).newPage();
const refusals = [];
cspPage.on("console", (message) => {
  if (/Refused to|Content Security Policy/i.test(message.text())) refusals.push(message.text());
});

const nonces = new Set();
for (let visit = 0; visit < 3; visit += 1) {
  const response = await cspPage.goto(BASE, { waitUntil: "load" });
  const policy = response.headers()["content-security-policy"] ?? "";
  nonces.add(policy.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1] ?? "");
}
check("the nonce is different on every request", nonces.size === 3, `${nonces.size} distinct`);
check("nothing on the page is refused by the policy", refusals.length === 0, refusals[0]?.slice(0, 120) ?? "");

// Hydration: client-side validation cannot render unless the nonced scripts ran.
await cspPage.goto(`${BASE}/signup`, { waitUntil: "load" });
await cspPage.fill('input[name="name"]', "x");
await cspPage.fill('input[name="email"]', "not-an-email");
await cspPage.fill('input[name="password"]', "short");
await cspPage.click('button[type="submit"]');
await cspPage.waitForTimeout(2500);
check(
  "the page hydrated, so the policy did not break it",
  /does not look like an email|at least 8 characters/i.test((await cspPage.textContent("body")) ?? "")
);

// Reflected XSS: the payload arrives in the server's HTML and is parsed with
// the real policy applied. A script inserted by already-trusted code is a
// DIFFERENT thing, which 'strict-dynamic' allows on purpose.
await cspPage.route(BASE + "/", async (route) => {
  const response = await route.fetch();
  const html = (await response.text()).replace(
    "</body>",
    '<script>window.__inline = true;</script>' +
      '<script src="/evil.js"></script>' +
      '<img src=x onerror="window.__handler = true">' +
      "</body>"
  );
  await route.fulfill({ response, body: html, headers: response.headers() });
});
await cspPage.goto(BASE, { waitUntil: "load" });
await cspPage.waitForTimeout(600);
const injected = await cspPage.evaluate(() => ({
  inline: Boolean(window.__inline),
  handler: Boolean(window.__handler),
}));
check("an injected inline script does not run", injected.inline === false);
check("an injected event handler does not run", injected.handler === false);

/* -------------------------- sessions across browsers ---------------------- */

console.log("\nSessions\n");

const first = await (await browser.newContext()).newPage();
await first.goto(`${BASE}/login`);
await first.fill('input[name="email"]', ownerEmail);
await first.fill('input[name="password"]', password);
await first.click('button[type="submit"]');
await first.waitForURL(/\/(admin|account)/, { timeout: 30_000 });

const secondCtx = await browser.newContext();
const second = await secondCtx.newPage();
await second.goto(`${BASE}/login`);
await second.fill('input[name="email"]', ownerEmail);
await second.fill('input[name="password"]', password);
await second.click('button[type="submit"]');
await second.waitForURL(/\/(admin|account)/, { timeout: 30_000 });

const cookie = (await secondCtx.cookies()).find((entry) => entry.name === "catering_session");
check("the session cookie is httpOnly", cookie?.httpOnly === true);
check("the session cookie is sameSite lax", cookie?.sameSite === "Lax", String(cookie?.sameSite));

await first.goto(`${BASE}/account/details`, { waitUntil: "load" });
const everywhere = first.getByRole("button", { name: "Sign out everywhere" });
check("the account details offer sign out everywhere", (await everywhere.count()) > 0);
await Promise.all([first.waitForURL(`${BASE}/`, { timeout: 30_000 }), everywhere.click()]);

// The second browser's cookie is untouched. The epoch it was signed against
// has moved, which is the whole point.
await second.goto(`${BASE}/account`, { waitUntil: "load" });
check("it ended the session in the OTHER browser", second.url().includes("/login"), second.url());

/* ------------------------------ phone width -------------------------------- */

console.log("\nPhone width\n");

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
// The welcome card is not what is being measured.
await phone.addInitScript(() => {
  try {
    localStorage.setItem("catering:welcome", "done");
  } catch {}
});
const phonePage = await phone.newPage();

async function widthAfterScrolling(path) {
  await phonePage.goto(`${BASE}${path}`, { waitUntil: "load" });
  await phonePage.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  });
  // Long enough for the scroll reveals to finish, which is when one bug showed.
  await phonePage.waitForTimeout(1500);
  return phonePage.evaluate(() => window.innerWidth);
}

for (const path of ["/", "/shop", "/catalog", "/cart", "/policies/privacy"]) {
  const width = await widthAfterScrolling(path);
  check(`${path} fits a 390px phone`, width === 390, `${width}px wide`);
}

if (isOwner) {
  await phonePage.goto(`${BASE}/login`, { waitUntil: "load" });
  await phonePage.fill('input[name="email"]', ownerEmail);
  await phonePage.fill('input[name="password"]', password);
  await phonePage.click('button[type="submit"]');
  await phonePage.waitForURL(/\/admin/, { timeout: 30_000 });
  for (const path of ["/admin", "/admin/orders", "/admin/inbox", "/admin/settings"]) {
    const width = await widthAfterScrolling(path);
    check(`${path} fits a 390px phone`, width === 390, `${width}px wide`);
  }
}

/* -------------------------------- results --------------------------------- */

await browser.close();

console.log(`\n  ${pass} passed, ${failures.length} failed\n`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAILED: ${failure}`);
  process.exit(1);
}
