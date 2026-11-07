/**
 * Estimate-form regression tests against the real script.js and the contact
 * form markup in index.html.
 *
 * Run: node tests/estimate-form.test.mjs
 *
 * Fetch is mocked in the page. Nothing is sent to FormSubmit or to any inbox.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUCCESS = "Thanks! We received your request and will contact you soon.";
const ERROR = "Something went wrong — please call (916) 686-1704.";
const RECIPIENT = "zewdoo9@gmail.com";
const SITE_URL = "https://www.sulcascarpets.com/";

const failures = [];
let passed = 0;
function check(name, cond, detail) {
  if (!cond) failures.push(name + (detail ? " — " + detail : ""));
  else passed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function staticChecks() {
  const script = read("script.js");
  const index = read("index.html");
  const flooring = read("flooring.html");

  check("recipient stays Eddie's test inbox", script.includes('const FORM_RECIPIENT = "zewdoo9@gmail.com"'));
  check("form identity URL is the live www site", script.includes('const FORM_SITE_URL = "https://www.sulcascarpets.com/"'));
  check("ajax endpoint uses that recipient", script.includes("formsubmit.co/ajax/"));
  check("success requires boolean true or the string true", /data\.success === true \|\| data\.success === "true"/.test(script));
  check("form is cleared only after the accepted branch", (script.match(/form\.reset\(\)/g) || []).length === 2);
  check("homepage has one estimate form", index.match(/js-estimate-form/g).length === 1);
  check("homepage includes the toast and script", index.includes('id="toast"') && index.includes("script.js"));
  check("flooring page does not post its own estimate form", !flooring.includes("js-estimate-form"));
  check("showroom tour and lightbox stay in the live script", script.includes("tourStart") && script.includes("lb-close"));
}

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Could not find " + startMarker);
  return html.slice(start, end + endMarker.length);
}

function testPage() {
  const index = read("index.html");
  const form = extractBetween(index, '<form class="estimate-form', "</form>");
  const toast = extractBetween(index, '<div class="toast"', "</div>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Estimate form test</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main style="max-width:520px;margin:2rem auto">${form}</main>
  ${toast}
  <script src="/script.js"></script>
</body>
</html>`;
}

function startServer(pageHtml) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml",
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/__form_test__.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(pageHtml);
      return;
    }
    const rel = decodeURIComponent(url.pathname);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function launchChrome() {
  const dir = fs.mkdtempSync("/tmp/sulcas-chrome-");
  const chrome = spawn("/usr/bin/google-chrome-stable", [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=0",
    "--user-data-dir=" + dir,
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let buf = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome did not open a DevTools port")), 15000);
    chrome.stderr.on("data", (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ chrome, wsUrl: match[1], dir });
      }
    });
    chrome.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Chrome exited early: " + code + " " + buf.slice(-400)));
    });
  });
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const waits = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const slot = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else slot.resolve(msg.result);
      return;
    }
    for (let i = waits.length - 1; i >= 0; i--) {
      if (waits[i].match(msg)) {
        const slot = waits.splice(i, 1)[0];
        slot.resolve(msg);
      }
    }
  });
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("DevTools socket failed")));
  });
  function send(method, params = {}, sessionId) {
    const my = ++id;
    return new Promise((resolve, reject) => {
      pending.set(my, { resolve, reject });
      const payload = { id: my, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  }
  function waitEvent(match) {
    return new Promise((resolve) => waits.push({ match, resolve }));
  }
  return { ready, send, waitEvent, close: () => ws.close() };
}

async function browserChecks(origin) {
  const launched = await launchChrome();
  const cdp = connectCdp(launched.wsUrl);
  await cdp.ready;
  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    const loaded = cdp.waitEvent((msg) => msg.method === "Page.loadEventFired" && msg.sessionId === sessionId);
    await cdp.send("Page.navigate", { url: origin + "/__form_test__.html" }, sessionId);
    await loaded;
    const result = await cdp.send("Runtime.evaluate", {
      expression: "(" + pageSuite.toString() + ")()",
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error("Page suite failed: " + JSON.stringify(result.exceptionDetails));
    }
    const report = result.result.value;
    for (const item of report.checks) check(item.name, item.ok, item.detail || "");
    if (report.error) check("page suite ran", false, report.error);
  } finally {
    cdp.close();
    launched.chrome.kill("SIGKILL");
    fs.rmSync(launched.dir, { recursive: true, force: true });
  }
}

async function pageSuite() {
  const SUCCESS = "Thanks! We received your request and will contact you soon.";
  const ERROR = "Something went wrong — please call (916) 686-1704.";
  const checks = [];
  function check(name, ok, detail) { checks.push({ name, ok: !!ok, detail: detail || "" }); }
  const form = document.querySelector("form.js-estimate-form");
  const toast = document.getElementById("toast");
  const button = form.querySelector('button[type="submit"]');
  const calls = [];
  let responder = () => jsonResponse(200, { success: "true" });

  function jsonResponse(status, data) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  window.fetch = function (url, init) {
    calls.push({
      url: String(url),
      method: init && init.method,
      body: init && init.body,
      headers: init && init.headers,
    });
    return Promise.resolve(responder());
  };
  function fill(extra) {
    form.elements.name.value = "Ada Test";
    form.elements.phone.value = "9165550100";
    form.elements.email.value = "ada@example.com";
    form.elements.project.value = "Carpet";
    form.elements.message.value = "testing";
    form.elements._honey.value = "";
    if (extra) extra();
  }
  function snapshot() {
    return {
      name: form.elements.name.value,
      phone: form.elements.phone.value,
      email: form.elements.email.value,
      project: form.elements.project.value,
      message: form.elements.message.value,
    };
  }
  async function submit() {
    const before = calls.length;
    form.requestSubmit(button);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    return calls.slice(before);
  }
  function toastState() {
    return {
      text: toast.textContent.trim(),
      error: toast.classList.contains("is-error"),
      visible: toast.classList.contains("is-visible") && !toast.hidden,
    };
  }
  function fieldsKept(saved) {
    const now = snapshot();
    return Object.keys(saved).every((key) => now[key] === saved[key]);
  }

  if (!form || !toast || !button) {
    return { checks: [{ name: "form markup is on the page", ok: false, detail: "missing form, toast, or button" }] };
  }

  // Invalid fields never reach the provider and do not claim success.
  fill(() => { form.elements.name.value = "  "; });
  let sent = await submit();
  check("blank name does not call the provider", sent.length === 0, JSON.stringify(sent));
  check("blank name is marked invalid", form.elements.name.classList.contains("is-invalid"));
  check("blank name does not show a thank-you", !toast.classList.contains("is-visible"));
  check("blank name keeps the other fields", form.elements.message.value === "testing" && form.elements.project.value === "Carpet");

  fill(() => { form.elements.email.value = "not-an-email"; });
  sent = await submit();
  check("bad email does not call the provider", sent.length === 0);
  check("bad email is marked invalid", form.elements.email.classList.contains("is-invalid"));
  check("bad email keeps what was typed", form.elements.email.value === "not-an-email" && form.elements.message.value === "testing");

  // Honeypot: pretend success to the bot and do not transmit.
  fill(() => { form.elements._honey.value = "http://spam.example"; });
  sent = await submit();
  check("honeypot does not call the provider", sent.length === 0);
  let state = toastState();
  check("honeypot does not show the error toast", state.visible && !state.error && state.text === SUCCESS, JSON.stringify(state));

  // Provider accepts with the string "true" (FormSubmit's actual JSON).
  fill();
  responder = () => jsonResponse(200, { success: "true", message: "The form was submitted successfully." });
  sent = await submit();
  state = toastState();
  check("string success shows the thank-you", state.visible && !state.error && state.text === SUCCESS, JSON.stringify(state));
  check("string success clears the form", snapshot().message === "" && snapshot().name === "" && snapshot().project === "");
  check("string success posts once to FormSubmit", sent.length === 1 && sent[0].method === "POST");
  check(
    "request keeps Eddie's test recipient",
    sent[0] && sent[0].url === "https://formsubmit.co/ajax/" + encodeURIComponent("zewdoo9@gmail.com"),
    sent[0] && sent[0].url
  );
  const payload = sent[0] ? JSON.parse(sent[0].body) : {};
  check("payload keeps the visitor's fields", payload.name === "Ada Test" && payload.phone === "9165550100" && payload.email === "ada@example.com" && payload.project === "Carpet" && payload.message === "testing");
  check("payload keeps the fixed site URL and captcha flag", payload._url === "https://www.sulcascarpets.com/" && payload._captcha === "false");
  check("payload does not retarget the business inbox", !JSON.stringify(payload).includes("customfloors") && !(sent[0] && sent[0].url.includes("customfloors")));
  check("button is usable again after success", !button.disabled && button.textContent === "Send request", button.textContent);

  // Boolean true is also acceptance. String "false" is not, even though it is truthy.
  fill();
  responder = () => jsonResponse(200, { success: true });
  sent = await submit();
  state = toastState();
  check("boolean success shows the thank-you", state.visible && !state.error && state.text === SUCCESS, JSON.stringify(state));
  check("boolean success clears the form", snapshot().email === "");

  fill();
  const keptFalse = snapshot();
  responder = () => jsonResponse(200, { success: "false", message: "This form needs Activation. An Activate Form link will be actived." });
  sent = await submit();
  state = toastState();
  check("string false is not treated as success", state.visible && state.error && state.text === ERROR, JSON.stringify(state));
  check("activation refusal keeps every field", fieldsKept(keptFalse), JSON.stringify(snapshot()));
  check("activation refusal still contacted the provider once", sent.length === 1);
  check("button is usable again after a provider refusal", !button.disabled && button.textContent === "Send request", button.textContent);

  // A friendly message must not override success:false.
  fill();
  const keptMessage = snapshot();
  responder = () => jsonResponse(200, { success: "false", message: SUCCESS });
  await submit();
  state = toastState();
  check("a thank-you string inside an error body is still an error", state.error && state.text === ERROR && fieldsKept(keptMessage), JSON.stringify(state));

  // HTTP 200 with no success flag, and HTTP ok:false even if the flag says true.
  fill();
  const keptEmpty = snapshot();
  responder = () => jsonResponse(200, { message: "Whoops, looks like something went wrong." });
  await submit();
  state = toastState();
  check("HTTP 200 without success true is an error", state.error && state.text === ERROR && fieldsKept(keptEmpty), JSON.stringify(state));

  fill();
  const kept500 = snapshot();
  responder = () => jsonResponse(500, { success: true, message: "stored" });
  await submit();
  state = toastState();
  check("HTTP 500 is an error even if success is true", state.error && state.text === ERROR && fieldsKept(kept500), JSON.stringify(state));

  // Provider origin timeout: HTML 522, same shape Cloudflare returned for formsubmit.co.
  fill();
  const kept522 = snapshot();
  responder = () => new Response("<html>error code: 522</html>", { status: 522, headers: { "Content-Type": "text/html" } });
  await submit();
  state = toastState();
  check("HTTP 522 shows the error and keeps the form", state.error && state.text === ERROR && fieldsKept(kept522), JSON.stringify(state) + " " + JSON.stringify(snapshot()));

  // Network/CORS failure: fetch rejects and there is no response body.
  fill();
  const keptNet = snapshot();
  window.fetch = function () {
    calls.push({ url: "network-failure", method: "POST", body: "" });
    return Promise.reject(new TypeError("Failed to fetch"));
  };
  await submit();
  state = toastState();
  check("network failure shows the error and keeps the form", state.error && state.text === ERROR && fieldsKept(keptNet), JSON.stringify(state));
  check("button is usable again after a network failure", !button.disabled && button.textContent === "Send request");

  return { checks };
}

async function main() {
  staticChecks();
  const server = await startServer(testPage());
  const origin = "http://127.0.0.1:" + server.address().port;
  try {
    await browserChecks(origin);
  } finally {
    server.close();
    await once(server, "close");
  }
  if (failures.length) {
    console.error("FAILED " + failures.length + " (" + passed + " passed)");
    for (const item of failures) console.error(" - " + item);
    process.exit(1);
  }
  console.log("PASSED " + passed + " checks. Success, provider refusal, HTTP 522, and network failure. Recipient " + RECIPIENT + " site " + SITE_URL);
  console.log("Visitor copy locked: success [" + SUCCESS + "] error [" + ERROR + "]");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
