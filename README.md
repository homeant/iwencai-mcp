# iwencai-mcp

问财 (Iwencai / 同花顺) MCP server —— 聚合同花顺问财 SkillHub 的 **25 个官方技能**为一个 MCP 服务,不含任何第三方技能。

底层只有两种 HTTP 操作,全部技能收敛其上:

- `POST /v1/query2data` → 22 个工具(查询 + 筛选)
- `POST /v1/comprehensive/search` → 3 个工具(新闻 / 公告 / 研报,`channel` 区分)

## 工具一览 (25)

| 类别 | 工具 |
|---|---|
| 查询 (12) | `query_market_data` 行情 · `query_industry_data` 行业 · `query_finance_data` 财务 · `query_macro_data` 宏观 · `query_index_data` 指数 · `query_fund_data` 基金 · `query_futures_data` 期货期权 · `query_insresearch_data` 机构研究与评级 · `query_event_data` 事件 · `query_business_data` 经营 · `query_management_data` 股东股本 · `query_basicinfo_data` 基本资料 |
| 筛选 (10) | `select_astock` A股 · `select_etf` ETF · `select_cb` 可转债 · `select_fund` 基金 · `select_fundcompany` 基金公司 · `select_fundmanager` 基金经理 · `select_futures` 期货期权 · `select_sector` 板块 · `select_hkstock` 港股 · `select_usstock` 美股 |
| 搜索 (3) | `search_news` 资讯 · `search_announcements` 公告 · `search_reports` 研报 |

数据来源: **同花顺问财** https://www.iwencai.com/unifiedwap/chat

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `IWENCAI_API_KEY` | ✅ | API Key,从同花顺问财 SkillHub 获取 |
| `IWENCAI_BASE_URL` | 否 | 默认 `https://openapi.iwencai.com` |

## 启动

### stdio MCP(开发 / 本地)

```bash
npx -y tsx src/server.ts
```

### 通过 npm 安装后运行

```bash
npx iwencai-mcp
```

### 注册到 Claude Code(user scope)

```bash
claude mcp add iwencai \
  --env IWENCAI_API_KEY=xxx \
  --env IWENCAI_BASE_URL=https://openapi.iwencai.com \
  -- npx -y tsx /path/to/iwencai-mcp/src/server.ts
```

## 发布 (npm)

CI 在推送 `v*` 标签或手动触发时发布:

```bash
git tag v0.2.0
git push origin v0.2.0
```

需要先在 GitHub 仓库设置 secret `NPM_TOKEN`(npm 访问令牌)。

## License

MIT
