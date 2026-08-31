#!/usr/bin/env node
/**
 * 问财 MCP server — 聚合 25 个官方技能为 1 个 MCP 服务(不含任何第三方技能)。
 *
 * 官方技能清单来源: 同花顺问财 SkillHub (www.iwencai.com/skillhub) square 接口,
 * 仅收录 classify=OFFICIAL 且 is_public=1 的 25 个.
 *
 * 全部技能只有两种 HTTP 操作:
 *  - query2data(22 个: hithink-*-query + hithink-*-selector): POST /v1/query2data
 *  - search(3 个: news / announcement / report):                POST /v1/comprehensive/search
 *
 * 启动: npx -y tsx src/server.ts   (dev / 注册用)
 *        npm run build && node dist/server.js   (编译产物)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { query2data, search, type IWENCaiOptions } from "./client.js";

const apiKey = process.env.IWENCAI_API_KEY;
if (!apiKey) {
  process.stderr.write(
    "IWENCAI_API_KEY is not set. 请把它放进环境(如 ~/.zshenv),或在注册 MCP 时用 --env 传入。\n"
  );
  process.exit(1);
}

const options: IWENCaiOptions = {
  apiKey,
  baseUrl: process.env.IWENCAI_BASE_URL || undefined,
};

const ATTRIBUTION = "数据来源于同花顺问财 (https://www.iwencai.com/unifiedwap/chat)";

function payload(result: unknown): Record<string, unknown> {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return { ...(result as Record<string, unknown>), _attribution: ATTRIBUTION };
  }
  return { data: result, _attribution: ATTRIBUTION };
}

function textResult(data: unknown, isError = false) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

async function safe(fn: () => Promise<Record<string, unknown>>) {
  try {
    return textResult(payload(await fn()));
  } catch (err) {
    return textResult(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      true
    );
  }
}

// ---- query2data 系(22 个) ----
const QUERY_TOOLS = [
  { tool: "query_market_data", skillId: "hithink-market-query", title: "行情数据查询（股票/ETF/指数）", desc: "获取股票、ETF、指数等实时行情：最新价、涨跌幅、涨跌额、成交量、换手率、主力资金流向、大小单、技术指标(MACD/KDJ/RSI/布林线)等。输入自然语言问句。" },
  { tool: "query_industry_data", skillId: "hithink-industry-query", title: "行业数据查询", desc: "查询行业估值、财务、盈利、行情、板块排名等数据。输入自然语言问句。" },
  { tool: "query_finance_data", skillId: "hithink-finance-query", title: "财务数据查询", desc: "查询全市场个股营业收入、净利润、ROE、负债率、现金流等财务指标。输入自然语言问句。" },
  { tool: "query_macro_data", skillId: "hithink-macro-query", title: "宏观数据查询", desc: "查询 GDP、CPI、PPI、利率、汇率、社融、M2 等宏观经济指标。输入自然语言问句。" },
  { tool: "query_index_data", skillId: "hithink-zhishu-query", title: "指数数据查询", desc: "查询上证指数、沪深300、创业板指、恒生指数、纳斯达克指数等指数行情(涨跌幅/成交量/点位)。输入自然语言问句。" },
  { tool: "query_fund_data", skillId: "hithink-fund-query", title: "基金理财查询", desc: "对基金做业绩、持仓、风险、评级、获奖、基金经理、基金公司综合分析。输入自然语言问句。" },
  { tool: "query_futures_data", skillId: "hithink-futures-query", title: "期货期权数据查询", desc: "查询期货期权行情、波动率、产销、会员持仓、会员榜单、行权等数据。输入自然语言问句。" },
  { tool: "query_insresearch_data", skillId: "hithink-insresearch-query", title: "机构研究与评级查询", desc: "查询研报评级、业绩预测、ESG、信用评级、主体评级、基金评级、券商金股等机构观点数据。输入自然语言问句。" },
  { tool: "query_event_data", skillId: "hithink-event-query", title: "事件数据查询", desc: "查询个股业绩预告、增发、质押、解禁、调研、监管函等事件数据。输入自然语言问句。" },
  { tool: "query_business_data", skillId: "hithink-business-query", title: "公司经营数据查询", desc: "查询主营业务构成、主要客户、供应商、参控股公司、股权投资、重大合同等经营数据。输入自然语言问句。" },
  { tool: "query_management_data", skillId: "hithink-management-query", title: "公司股东股本查询", desc: "查询股本结构、股权结构、股东户数、前十大股东/流通股东、主要持有人、实控人等股权信息。输入自然语言问句。" },
  { tool: "query_basicinfo_data", skillId: "hithink-basicinfo-query", title: "基本资料查询", desc: "查询全品类标的（股票、指数、基金、期货、期权、转债、债券、理财、保险等）基础信息、发行主体、机构资料、费率、上市地点/日期等静态信息。输入自然语言问句。" },
  { tool: "select_astock", skillId: "hithink-astock-selector", title: "问财选A股", desc: "通过自然语言查询进行 A 股筛选，支持行情指标、技术形态、财务指标、行业概念等多条件组合筛选。" },
  { tool: "select_etf", skillId: "hithink-etf-selector", title: "问财选ETF", desc: "根据行情、跟踪指数基本面、规模、风格类型等条件筛选 ETF。" },
  { tool: "select_cb", skillId: "hithink-cb-selector", title: "问财选可转债", desc: "通过转股溢价率、正股表现、评级、剩余期限等多条件组合筛选可转债。" },
  { tool: "select_fund", skillId: "hithink-fund-selector", title: "问财选基金", desc: "根据基金类型、业绩、基金经理、风险、持仓、资产配置等维度筛选公募基金。" },
  { tool: "select_fundcompany", skillId: "hithink-fundcompany-selector", title: "问财选基金公司", desc: "根据管理规模、旗下产品业绩、投研实力、风险评级等维度筛选公募基金公司。" },
  { tool: "select_fundmanager", skillId: "hithink-fundmanager-selector", title: "问财选基金经理", desc: "根据历史业绩、管理规模、投资风格、风险控制等维度筛选公募基金经理。" },
  { tool: "select_futures", skillId: "hithink-futures-selector", title: "问财选期货期权", desc: "通过行情、波动率、产销、会员持仓、会员榜单、行权等多条件组合筛选期货期权。" },
  { tool: "select_sector", skillId: "hithink-sector-selector", title: "问财选板块", desc: "通过行业估值、资金流向、涨跌幅、板块类型等多条件组合筛选市场板块。" },
  { tool: "select_hkstock", skillId: "hithink-hkstock-selector", title: "问财选港股", desc: "通过自然语言查询进行港股筛选，支持行情指标、财务指标、行业概念、陆港通等多条件组合筛选。" },
  { tool: "select_usstock", skillId: "hithink-usstock-selector", title: "问财选美股", desc: "通过自然语言查询进行美股筛选，支持行情指标、财务指标、行业概念、业绩预测、研报评级等多条件组合筛选。" },
];

// ---- search 系(3 个) ----
type SearchChannel = "news" | "announcement" | "report";
const SEARCH_TOOLS: {
  tool: string;
  channel: SearchChannel;
  skillId: string;
  title: string;
  desc: string;
}[] = [
  { tool: "search_news", channel: "news", skillId: "news-search", title: "财经资讯搜索", desc: "财经为主的资讯搜索引擎，覆盖官媒、主流财经媒体、垂直行业网站、知名上市公司/非上市公司官网。返回标题、URL、摘要、来源、发布时间。" },
  { tool: "search_announcements", channel: "announcement", skillId: "announcement-search", title: "公告搜索", desc: "查询 A股、港股、基金、ETF 等金融标的公告，类型含定期财务报告、分红派息、回购增持、资产重组等。返回标题、链接、摘要、公告日期。" },
  { tool: "search_reports", channel: "report", skillId: "report-search", title: "研报搜索", desc: "收录主流投研机构发布的研究报告，返回分析逻辑、投资评级、目标价等投研决策信息。" },
];

const querySchema = {
  query: z.string().describe("自然语言查询问句（可被改写为标准金融问句）"),
  page: z.string().optional().describe("分页参数，默认 1"),
  limit: z.string().optional().describe("每页条数，默认 10"),
};
const searchSchema = {
  query: z.string().describe("自然语言搜索问句"),
  size: z.string().optional().describe("返回条数，默认 10"),
};

const server = new McpServer({ name: "iwencai", version: "0.2.0" });

for (const t of QUERY_TOOLS) {
  server.registerTool(
    t.tool,
    {
      title: `${t.title}（同花顺问财）`,
      description: `${t.desc}\n${ATTRIBUTION}`,
      inputSchema: querySchema,
    },
    async (args) => safe(() => query2data(args, options, t.skillId))
  );
}

for (const t of SEARCH_TOOLS) {
  server.registerTool(
    t.tool,
    {
      title: `${t.title}（同花顺问财）`,
      description: `${t.desc}\n${ATTRIBUTION}`,
      inputSchema: searchSchema,
    },
    async (args) => safe(() => search(args, options, t.channel))
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
