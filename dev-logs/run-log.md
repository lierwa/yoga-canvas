# dev-logs/run-log.md（记录手册）

这个文件只负责“记录手册”：告诉 AI 要做什么、怎么记录、按什么格式输出。

真正的开发记录条目请写在：[`dev-logs/dev-log.md`](./dev-log.md)

阅读顺序建议：先读 `project.md`，再读 `dev-logs/dev-log.md` 最近 1-3 条。

---

## 1) 文件分工与目标

- `project.md`：项目概览与关键入口（长期稳定的背景）
- `dev-logs/run-log.md`：记录手册（本文件，只放规则与 Prompt）
- `dev-logs/dev-log.md`：实际开发日志（只追加条目，不写规则）

目标：让 AI 在新 context 里只需要读 `project.md` + `dev-log.md` 最近条目，就能知道我们做过什么、有哪些注意事项、接下来要做什么。

---

## 2) dev-log.md 的格式约定（给 AI 的规则）

### 2.1 文件结构

`dev-logs/dev-log.md` 建议长这样：

1) 顶部一个 `DEV_LOG_META`（每次新增条目后更新）  
2) 下面持续追加 `## Log Entry` / `## Amendment` 条目

示例（放在 dev-log.md 顶部）：

```yaml
DEV_LOG_META:
  LastLogId: BOOTSTRAP-YYYY-MM-DD/01
  LastAnchorCommit: UNKNOWN
  LastAnchorDate: UNKNOWN
```

### 2.2 追加规则（解决“新增/更正/拆分”）

- 新增：只追加新的 `## Log Entry` 到 `dev-log.md` 末尾（永不改历史条目正文）。
- 更正：追加 `## Amendment`，用 `RefLogId` 指向被更正条目。
- 拆分：当一次改动过大时，把同一天拆成多条 Entry（LogId 用 `YYYY-MM-DD/NN`）。
- Anchor：每次新增 Entry 后，把 `DEV_LOG_META.LastAnchorCommit` 更新为本次记录结束时的 commit（通常是 `HEAD`）。

---

## 3) Prompt（复制后直接跑）

### 3.1 Prompt：生成“本批次增量日志”（写入 dev-log.md）

> 你是“yoga-canvas 仓库的开发日志生成器”。你要生成一个可直接追加到 `dev-logs/dev-log.md` 的 Markdown 条目，用于总结本批次从 `LastAnchorCommit（不含）..HEAD（含）` 的所有变更。  
> 你必须先读：
> - `project.md`
> - `dev-logs/dev-log.md` 顶部的 `DEV_LOG_META`（拿到 LastAnchorCommit）
>
> 如果你能访问终端，请在仓库根目录执行并读取结果（必要时裁剪，但必须足以写出结构化日志）：
> - git rev-parse --short HEAD
> - git log --oneline --decorate ${LastAnchorCommit}..HEAD
> - git diff --name-status ${LastAnchorCommit}..HEAD
> - git diff --stat ${LastAnchorCommit}..HEAD
> - （可选）git diff ${LastAnchorCommit}..HEAD -- packages/core packages/react src packages/demo packages/taro
>
> 如果你不能访问终端，请向用户索取以上命令输出（至少要有：log + name-status + stat）。
>
> 输出格式要求（严格遵守，便于后续机器读取与人工浏览）：
> 1) 先输出“建议更新后的 DEV_LOG_META”（只包含 LastLogId/LastAnchorCommit/LastAnchorDate 三个字段即可）
> 2) 再输出一个新的 `## Log Entry`（按下面模板）
> 3) 不要粘贴大量代码全文；只摘录关键 diff 片段/函数签名/接口变更点
>
> Log Entry 模板（严格按此结构输出）：
>
> ## Log Entry: <LogId>
> - Date: <YYYY-MM-DD>
> - Range: <LastAnchorCommit>.. <NewAnchorCommit>
> - Focus: <一句话概括本批次目标>
>
> ### Summary
> - <3-8 条，强调“做了什么 + 为什么”>
>
> ### Changes By Area
> - Core (@yoga-canvas/core):
>   - <要点 + 受影响入口文件路径>
> - React (@yoga-canvas/react):
>   - <要点 + 受影响入口文件路径>
> - Editor (root src/):
>   - <要点 + 受影响入口文件路径>
> - Demo / Taro:
>   - <要点 + 受影响入口文件路径>
>
> ### Notable API / Data Model Changes
> - <类型/接口/行为变化；若是 breaking change 必须标出>
>
> ### Notes & Gotchas
> - <平台差异、性能陷阱、仓库约束（例如 project.md 里的规则）>
>
> ### Open Issues
> - <未解决问题/欠债/待验证点>
>
> ### Next
> - <下一批次 3-6 项建议>
>
> 最后输出一个 `---` 分割线（用于直接追加到文件末尾）。

### 3.2 Prompt：生成“更正条目”（Amendment，写入 dev-log.md）

> 你是开发日志的勘误生成器。不要修改旧条目正文；请生成一个新的 Amendment 追加到文件末尾。  
> 你需要读取 `dev-logs/dev-log.md`，找到要更正的 LogId，然后输出：
>
> ## Amendment: <AmendId>
> - Date: <YYYY-MM-DD>
> - RefLogId: <被更正的 LogId>
>
> ### What Changed
> - <说明更正点>
>
> ### Corrected Content
> - <给出替换后的要点/段落（只给必要部分）>
>
> ---

---

## 4) Bootstrap（历史阶段的第一次落盘怎么写）

当你已经开发了一段时间、但还没开始按批次写日志时，建议先在 `dev-logs/dev-log.md` 里写一条 `BOOTSTRAP`，把现状沉淀下来。

BOOTSTRAP 的目的不是覆盖所有 commit 历史，而是提供“现在有哪些模块/能力/约束/注意事项”，让后续增量日志有落点。

建议模板（写入 dev-log.md 的第一条 Log Entry）：

```md
## Log Entry: BOOTSTRAP-YYYY-MM-DD/01
- Date: YYYY-MM-DD
- Range: UNKNOWN..UNKNOWN
- Focus: 建立可复用的项目上下文（供后续按批次增量记录）

### Summary
- <5-10 条，描述目前已有的能力与结构>

### Changes By Area
- Core (@yoga-canvas/core):
  - <要点 + 文件路径>
- React (@yoga-canvas/react):
  - <要点 + 文件路径>
- Editor (root src/):
  - <要点 + 文件路径>
- Demo / Taro:
  - <要点 + 文件路径>

### Notes & Gotchas
- <项目约束、平台差异等>

### Open Issues
- <尚未解决的问题/欠债>

### Next
- <接下来 3-6 项建议>

---
```
