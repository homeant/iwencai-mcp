---
name: iwencai
version: 1.0.0
description: "通过 iwencai MCP 服务查询同花顺问财(问财 SkillHub)金融数据。覆盖股票/ETF/指数/基金/期货期权/港股/美股/可转债行情,行业/财务/宏观指数/基本资料/公司经营/股东股本/机构研究/事件数据,以及选股/选ETF/选基金/选基金公司/选基金经理/选板块/选港股/选美股等筛选器,还有财经新闻、公司公告、券商研报搜索。当用户询问行情、股票价格、涨跌幅、成交量、主力资金、行业、财务、ROE、宏观、指数、基金、选股、新闻、公告、研报等金融数据问题时,必须使用此技能。"
metadata:
  requires:
    mcp: ["iwencai"]
  cliHelp: "claude mcp get iwencai"
---

# 问财 金融数据查询

## 概述

本技能**不直接调用 API**,而是指引使用已注册的 **`iwencai` MCP server**(聚合了同花顺问财官方 25 个技能)。数据来源:**同花顺问财** https://www.iwencai.com/unifiedwap/chat

核心流程:**识别意图 → 改写问句 → 调用对应工具 → 解析结果 → 注明数据来源**。

## 工具映射(意图 → MCP 工具)

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
| 按条件筛选 A股 | `select_astock` |
| 按条件筛选 ETF | `select_etf` |
| 按条件筛选 可转债 | `select_cb` |
| 按条件筛选 公募基金 | `select_fund` |
| 按条件筛选 基金公司 | `select_fundcompany` |
| 按条件筛选 基金经理 | `select_fundmanager` |
| 按条件筛选 期货期权 | `select_futures` |
| 按条件筛选 板块 | `select_sector` |
| 按条件筛选 港股 | `select_hkstock` |
| 按条件筛选 美股 | `select_usstock` |
| 财经新闻/资讯 | `search_news` |
| 公司公告(财报/分红/回购/重组) | `search_announcements` |
| 券商研报 | `search_reports` |

## 流程

### 步骤 1 识别意图
判断用户问的是行情 / 财务 / 选股 / 资讯 / 公告 / 研报等哪一类,查上表选工具。

### 步骤 2 改写问句
把口语问句改写为标准金融问句,保持原意:
- `同花顺今天多少钱` → `同花顺最新价格`
- `主力资金流向怎么样` → `主力资金流向`
- `MACD金叉的股票` → `MACD金叉`
- `银行业盈利怎么样` → `银行业盈利数据`

### 步骤 3 调用工具
向 iwencai MCP 传 `{query, page?, limit?}`(查询/筛选类)或 `{query, size?}`(搜索类)。query 用改写后的问句。

### 步骤 4 解析结果
- **查询/筛选**(`query2data`):响应含 `datas`(数组)、`code_count`(总条数)、`chunks_info`。若 `code_count > len(datas)`,用 `page` 翻页。
- **搜索**(`comprehensive/search`):响应含 `data`(数组,含 title/url/summary/publish_date)。

### 步骤 5 空数据 / 错误
- 若 `datas`/`data` 为空或无数据:放宽或简化条件重试,**最多 2 次**,并说明最终使用的问句。
- 若返回 `success:false` 或网关错误(如额度不足):把原始错误如实转述,不擅自改写。
- 若 MCP 未配置或 `IWENCAI_API_KEY` 缺失:提示用户去 https://www.iwencai.com/skillhub 获取并配置。

## 回答规范
- 结果清晰,表格数据正确解析为表格展示。
- **必须注明数据来源于同花顺问财**。
- 若改写了问句,要说明最终使用的查询问句。
