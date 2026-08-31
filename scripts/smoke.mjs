/**
 * MCP stdio 冒烟测试: 以 JSON-RPC 方式驱动 iwencai-mcp server。
 *
 * 用法:
 *   node scripts/smoke.mjs                                   默认跑 query_market_data
 *   node scripts/smoke.mjs '{"tool":"search_news","args":{"query":"贵州茅台今日新闻","size":"1"}}'
 *
 * 依赖: 启动前需要有 IWENCAI_API_KEY 环境变量(建议用 `zsh -c '...'` 让 .zshenv 生效)。
 */
import { spawn } from "node:child_process";

const child = spawn("npx", ["-y", "tsx", "src/server.ts"], {
  cwd: process.cwd(),
  env: process.env,
});

let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString("utf8");
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue; // 忽略非 JSON 行
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  }
});
child.stderr.on("data", (d) => process.stderr.write("[server] " + d));
child.on("exit", (code) => {
  if (code !== 0) process.stderr.write(`[server exit] code=${code}\n`);
  process.exit(code === 0 ? 0 : code);
});

function rpc(id, method, params) {
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const parsed = process.argv[2] ? JSON.parse(process.argv[2]) : null;
const tool = parsed?.tool ?? "query_market_data";
const args = parsed?.args ?? { query: "同花顺最新价格", limit: "1" };

try {
  const init = await rpc(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke", version: "0" },
  });
  console.log("== serverInfo:", JSON.stringify(init.result?.serverInfo ?? init));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  await delay(150);

  const list = await rpc(2, "tools/list", {});
  console.log("== tools:", JSON.stringify((list.result?.tools ?? []).map((t) => t.name)));

  const call = await rpc(3, "tools/call", { name: tool, arguments: args });
  const text = call.result?.content?.[0]?.text ?? "";
  console.log(`== tools/call "${tool}" -> isError=${!!call.result?.isError}`);
  console.log(text.slice(0, 1400));
  process.exit(call.result?.isError ? 1 : 0);
} catch (e) {
  console.error("SMOKE ERROR:", e);
  process.exit(2);
} finally {
  try {
    child.stdin.end();
  } catch {}
  setTimeout(() => child.kill(), 300);
}
