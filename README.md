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
  -- npx -y iwencai-mcp
```

> 本地开发 / 未发布改动时,可改用 `npx -y tsx /path/to/iwencai-mcp/src/server.ts`。

## Skill (`iwencai`)

仓库附带一个 **`iwencai` 技能**,把 Claude Code 与上面的 MCP 串起来:它不直接调 API,而是**指引调用 `iwencai` MCP 的 25 个工具**,负责意图识别、问句改写、结果解析与来源标注。安装:把 `iwencai` 目录/symlink 放到 `~/.claude/skills/`。

### 意图 → 工具映射

| 用户问什么 | 工具 |
|---|---|
| 股票/ETF/指数 价格、涨跌幅、成交量、主力资金、技术指标 | `query_market_data` |
| 行业估值、财务、盈利、板块排名 | `query_industry_data` |
| 个股营收、净利润、ROE、负债率、现金流 | `query_finance_data` |
| GDP、CPI、PPI、利率、汇率、社融、M2 | `query_macro_data` |
| 指数行情(上证/沪深300/创业板/恒生/纳指) | `query_index_data` |
| 基金业绩、持仓、风险、评级、基金经理 | `query_fund_data` |
| 期货期权行情、波动率、产销、会员持仓、行权 | `query_futures_data` |
| 研报评级、业绩预测、ESG、信用评级、券商金股 | `query_insresearch_data` |
| 业绩预告、增发、质押、解禁、调研、监管函 | `query_event_data` |
| 主营业务、主要客户/供应商、参控股公司、重大合同 | `query_business_data` |
| 股本结构、股东户数、前十大股东、实控人 | `query_management_data` |
| 全品类标的基础信息、发行主体、上市地/日期 | `query_basicinfo_data` |
| 按条件筛选 A股 / ETF / 可转债 / 基金 / 基金公司 / 基金经理 / 期货期权 / 板块 / 港股 / 美股 | `select_astock` · `select_etf` · `select_cb` · `select_fund` · `select_fundcompany` · `select_fundmanager` · `select_futures` · `select_sector` · `select_hkstock` · `select_usstock` |
| 财经新闻 / 公司公告 / 券商研报 | `search_news` · `search_announcements` · `search_reports` |

### 使用流程

1. **识别意图** → 查上表选工具。
2. **改写问句**为标准金融问句(如 `同花顺今天多少钱` → `同花顺最新价格`)。
3. **调用工具**,传 `{query, page?, limit?}`(查询/筛选)或 `{query, size?}`(搜索)。
4. **解析结果**:查询/筛选响应含 `datas`/`code_count`,条数多时用 `page` 翻页;搜索响应含 `data`(title/url/summary)。
5. **空数据/错误**:放宽条件重试 ≤2 次;网关错误(如额度不足)如实转述;MCP 未配置或缺 key 时引导去 https://www.iwencai.com/skillhub 获取。
6. **回答规范**:清晰展示 + 表格解析正确 + **必须注明数据来源于同花顺问财**。

## License

MIT
