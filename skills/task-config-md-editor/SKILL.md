---
name: task-config-md-editor
description: Edit and validate the task configuration Markdown data file used by the task-config-md-prototype project. Use when Codex needs to create, modify, import, normalize, review, or validate `任务项运行配置工具.md`, especially tables containing workflow nodes, checklist rows, enable status, and second-level gear parameter rows.
---

# Task Config Markdown Editor

## Scope

Use this skill for `任务项运行配置工具.md` in the `task-config-md-prototype` project. The Markdown file is the data source for `任务项运行配置工具.html`; invalid table structure can make the page import stale or wrong data.

Always edit as UTF-8. Preserve Chinese text exactly unless the user asks for content changes.

## Workflow

1. Read the target Markdown and locate the relevant node heading, element heading, and table.
2. Edit the Markdown table, not the generated HTML.
3. Keep primary rows and second-level parameter rows together.
4. Run the validator:

```bash
node skills/task-config-md-editor/scripts/validate-task-config-md.js 任务项运行配置工具.md
```

5. If the page is running, refresh it and confirm the edited table renders as expected.

## Required Document Shape

The top-level skeleton must stay recognizable:

```markdown
模板：统建版

一、业务：
业务关联方\任务单元\应用任务项

输出形式：
业务关联方：业务关联方
业务单元：任务单元
任务单元：应用任务项

二、流程及要素内容
（一） 核实身份
1、办理条件：
```

Node headings must use Chinese parenthesized numbering:

```markdown
（一） 核实身份
```

Element headings must use Arabic numbering and a Chinese comma:

```markdown
1、办理条件：
```

## Table Rules

Tables drive the page import. Keep the header text exact.

Content-style tables do not have `配置参数`:

```markdown
| 序号 | 内容所属对象 | 内容名称 | 内容说明 | 是否应用 |
| --- | --- | --- | --- | --- |
```

Rule/condition/standard tables normally have `配置参数`:

```markdown
| 序号 | 业务资格公式 | 业务资格制度描述 | 是否应用 | 配置参数 |
| --- | --- | --- | --- | --- |
```

Other accepted formula columns include `属性名称`, `指标名称`, `公式`, `额度计算公式`, `推送规则`, `风险配置`, `配置项`, and `内容名称`.

Use only `是` or `否` in the `是否应用` column. `否` turns the row switch off in the page.

Escape literal pipe characters inside cells as `\|`. Represent intended line breaks inside cells as `<br>`.

## Primary Rows

Primary rows use an integer `序号`:

```markdown
| 1 | 前置受理条件 | 明确进入“核实身份”节点前必须满足的前置受理条件。 | 否 | 见下级参数 |
```

Use `无` in `配置参数` when there are no second-level parameters.

Use `见下级参数` only when one or more second-level parameter rows immediately follow the primary row.

## Second-Level Parameter Rows

Parameter rows must immediately follow their primary row and use `主序号.参数序号`:

```markdown
| 1.1 | 配置参数：资格校验来源 | 参数值：账户状态校验、缴存记录校验 |  | 业务标准值：“前置受理条件”默认校验账户状态和缴存记录。 |
```

For tables with an object column, the parameter row has one extra cell:

```markdown
| 1.1 | 配置参数 | 资格校验来源 | 参数值：账户状态校验、缴存记录校验 |  | 业务标准值：默认校验账户状态。 |
```

Rules:

- The parameter label must start with `配置参数：` in non-object tables.
- The parameter values cell should start with `参数值：`.
- The business standard cell should start with `业务标准值：`.
- Multiple parameter values use `、`, for example `账户状态校验、缴存记录校验`.
- Do not create orphan `1.1` rows without a preceding `1` primary row.

## Deleting And Reordering

When deleting a primary row, delete all of its second-level rows too.

After deleting or reordering rows within a table:

- Renumber primary rows from `1`.
- Renumber each primary row's parameter rows from `.1`.
- Keep each parameter row directly under its primary row.

Do not delete only the table row text and leave its parameter rows behind.

Do not remove an entire table unless the intent is to leave that page group untouched on import. The importer replaces groups for tables that are present; absent tables are not a deletion signal.

## Adding Rows

When adding a primary row:

1. Choose the right table under the right node and element heading.
2. Add the primary row with `是` or `否`.
3. Set `配置参数` to `无` or `见下级参数`.
4. If using `见下级参数`, add at least one `N.1` parameter row immediately below.

Prefer concise business text. Avoid Markdown lists, nested tables, HTML blocks, or comments inside table cells.

## Common Failure Modes

- Deleted rows still appear in the UI: the table was not imported as a replacement, or the old row remained in the same table.
- Gear parameters disappear: `配置参数` is `无`, or parameter rows are not directly under the primary row.
- Values shift columns: a cell contains an unescaped `|`.
- Row state does not change: `是否应用` is not exactly `是` or `否`.
