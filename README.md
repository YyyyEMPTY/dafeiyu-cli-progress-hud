# 大肥鱼命令行进度条（Dafeiyu CLI Progress HUD）

> 在 DeepSeek Harness Web UI 的输入框下方，实时显示命令行任务的进度。
>
> 非官方社区插件 · 作者 YEMPTY（溯） · v0.1.0 · 测试于 DSH `0.2.2-rc.1` · MIT

当 agent 在 DSH 里跑 `git clone`、下载或上传时，你不用再盯着“运行中”三个字猜它卡在哪。插件把当前会话的 shell job 输出接到 composer 下方，解析出命令、阶段、百分比和耗时，渲染成一条轻量进度条。

> **非官方声明**：这是社区项目，不是 DeepSeek 官方项目，也不代表 DeepSeek 背书。DeepSeek、DeepSeek Harness 名称仅用于说明兼容对象。

## 快速开始

1. 获取本目录（`git clone` 或下载压缩包）。
2. 在 DSH 的插件管理器里安装本地 bundle，选择 `dafeiyu-cli-progress-hud` 目录（或你克隆下来的目录名）。
3. 刷新 Web 页面。
4. 让 agent 跑一条带进度的命令，例如 `git clone --progress https://github.com/octocat/Hello-World.git`。

不需要配置，也没有额外的运行时依赖。

## 先说清楚：先例与边界

我们查了一圈，**面向 DSH Web GUI、把 shell job 进度放到输入框下方的同类插件，暂未发现**。但这不等于“全球首创”：

- 解析 `git clone` 输出并画进度条，早有人做过（见[开源借鉴](#开源借鉴与致谢)）。
- 终端里用 OSC 9;4 报告进度，是 Windows Terminal / ConEmu 等终端已有的协议。
- DSH 自带的 `@deepseek-ai/dsh-client-ui-jobs` 已经在会话头部展示后台任务与流式输出。

更准确的说法是：**这是一个把 DSH 的 job 输出流接进 composer、并解析常见 CLI 进度行的实现**。它不是第一个解析 git 进度的，也不是第一个做终端进度的；如果后来发现更早的同类 DSH 插件，欢迎补充，我们会更新这段。

## 它解决什么问题

DSH 的工具结果通常在命令结束后才回到对话里。跑一个几分钟的 clone，中间只有“运行中”；命令是在下载、解包，还是已经卡住，界面看不出来。

DSH 本身已经把 shell 命令登记成 job，并向客户端暴露 `ctx.jobs` 流。这个插件做的是：

- 只读当前会话的运行中任务；
- 跟随 job 输出，取尾部 16 KB；
- 解析常见进度行；
- 在 `conversation.composer.dock` 渲染一条进度条。

它不修改命令、不包裹进程、不伪造进度。

## 效果

下面是**示意**，不是真实截图（真实截图待补）：

```text
命令行任务 2
git clone --progress https://github.com/…            42%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Receiving objects                                     0:07

curl --progress-bar -O model.bin                      61%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
curl                                                  0:12

另有 1 个任务
```

实际界面使用宿主主题 token：细轨、低透明度占位、等宽数字耗时，不额外加卡片背景。

## 特性

- **自动跟随当前会话**：不需要在命令里加特殊包装，也不用手动点“开始”。
- **常见进度格式**：
  - git：`Receiving objects`、`Compressing objects`、`Resolving deltas`、`Writing objects`、`remote: Counting objects`；
  - curl 默认进度表；
  - 通用 `NN%` 行。
- **阶段与耗时**：显示阶段名和已运行时间，并按秒刷新。
- **快速命令不闪烁**：运行不足 1.2 秒且没有百分比的命令不显示。
- **不刷屏**：最多 3 行，其余折叠成“另有 N 个任务”。
- **主题自适应**：只使用 `--dsw-alias-label-*`、`--dsw-alias-fill-l1` 等宿主 token。
- **中英文**：locale 提供 `zh` / `en`，其他语言回退英文。
- **无遥测**：插件代码不发起网络请求，不写文件，不写 `localStorage`。

## 工作原理

```text
pwsh tool call
     │
     ▼
DSH job registry（前台命令在运行期也会登记，结束后移除）
     │
     ├── ctx.jobs.watchRows(sessionId) ──► 当前会话的 JobView[]
     │
     └── ctx.jobs.observe(sessionId, jobId)
               │
               ▼
         output chunks（非消费式流）
               │
               ▼
     parseProgress(尾部 16 KB)
               │
               ▼
   { percent, phase, line }
               │
               ▼
conversation.composer.dock（React，最多 3 行）
```

1. DSH 的 shell 工具（当前环境是 `pwsh`）把每条命令登记为 job。按当前实现，前台命令在运行期也会出现在注册表里，结束后移除；后台命令同理。
2. 客户端 `ctx.jobs` 提供 `watchRows` 和 `observe`，都是引用计数、非消费式流，不会影响模型自己的 `job_output` 游标。
3. 插件只读当前 session；对 `running` / `stopping` 的 job 开 observe，取输出尾部 16 KB。
4. 解析优先级：通用 `NN%` → git 阶段名 → curl 表头。没有百分比就不猜。
5. 渲染在 composer dock；任务结束后从条上消失，历史留在 DSH 自带的任务列表里。

### 为什么不用 OSC 9;4 或终端模拟器？

DSH 也有终端面板，但本插件面向的是普通工具调用，不是终端模拟器。OSC 9;4 需要终端解释转义序列；普通 Web 聊天里没有这层解释器，所以这里直接解析文本。交互式 TUI 请继续用 DSH 的终端面板。

## 环境要求

| 项目 | 要求 / 测试状态 |
| --- | --- |
| DSH | `0.2.2-rc.1` 实测；其他版本未验证 |
| 宿主 | DSH 桌面版内置 Web UI 实测；独立浏览器未单独测试 |
| 操作系统 | Windows 11 实测；macOS / Linux 未实测 |
| Shell | PowerShell 5.1 实测；其他 shell 走同一 job 管线，未逐一测试 |
| Node | 仅跑测试需要；插件运行时不需要 Node |

代码本身平台中立，但“实测过”只覆盖上表。

## 安装

### 1. 获取代码

```bash
git clone https://github.com/YyyyEMPTY/dafeiyu-cli-progress-hud.git
cd dafeiyu-cli-progress-hud
```

或下载仓库压缩包并解压。

### 2. 安装本地 bundle

在 DSH 的插件管理器里选择“安装本地 bundle”，指向 `dafeiyu-cli-progress-hud` 目录（包含 `package.json` 和 `cordis.patch.yml` 的那一层）。

安装本地 bundle 通常需要一次授权。

### 3. 刷新页面

安装完成后刷新 Web 页面。插件会注册到 `conversation.composer.dock`，`order` 为 10。

### 4. 验证

让 agent 跑一条会输出进度的命令：

```bash
git clone --progress --depth 1 https://github.com/octocat/Hello-World.git demo
```

输入框下方应出现“命令行任务”标题和一条进度条。

### 重装 / 升级

直接覆盖安装会报 `already-installed`。先卸载旧版本，再安装新目录：

```text
plugin_manager remove_bundle  target=dafeiyu-cli-progress-hud
plugin_manager install_bundle target=<absolute-path>\dafeiyu-cli-progress-hud
```

（`plugin_manager` 是 DSH 的插件管理入口；如果你用的是图形界面，对应“卸载/安装本地 bundle”。）

## 用法

安装后无需配置。agent 执行 shell 命令时，插件自动跟随。

### 让命令输出进度

进度条是否出现，最终取决于命令自己是否输出进度。插件会通过宿主 `systemPrompt` 注入一条提示，提醒 agent：

```text
The web composer shows a live progress strip for running shell jobs.
When a command may run longer than a few seconds, run it in the background
if the shell tool supports that, and force progress output where the command
offers a flag: git clone/fetch/push --progress, curl --progress-bar,
rsync --info=progress2.
Do not add a flag to a command that does not accept it.
```

常用写法：

```bash
# git：非 TTY 下默认不输出进度，必须加 --progress
git clone --progress https://github.com/octocat/Hello-World.git
git fetch --progress
git push --progress

# curl：下载 / 上传
curl --progress-bar -O https://example.com/model.bin
curl --progress-bar -T model.bin https://example.com/upload

# rsync：总进度
rsync --info=progress2 src/ user@host:/dest/
```

提示只是建议，不保证 agent 一定照做；也不保证每条命令都支持对应参数。

### 显示规则

| 情况 | 行为 |
| --- | --- |
| 命令运行 < 1.2 秒，且没有百分比 | 不显示，避免快速命令闪烁 |
| 解析到百分比 | 立即显示，哪怕命令刚开始 |
| 超过 1.2 秒仍无百分比 | 显示低透明度占位条 + 阶段/“等待输出…” + 耗时 |
| `stopping` | 立即显示“正在停止…” |
| 同时超过 3 个任务 | 显示前 3 个 + “另有 N 个任务” |
| 任务结束（completed / killed / failed） | 从条上消失 |

## 已知限制与注意事项

### 1. 没有进度输出的命令，它也无能为力

插件不会为了让条动起来而编造百分比。`git clone` 不带 `--progress` 时通常只输出 `Cloning into '…'...`，这时最多显示一条没有百分比的占位条。

### 2. git 必须加 `--progress`

我们在 git 2.53.0.windows.1 上验证过：stderr 不是 TTY 时，`git clone` 默认不输出百分比；加 `--progress` 后才有 `Receiving objects: 42% ...`。`git fetch` / `git push` 同理。

### 3. 前台命令的可见性

按 DSH 当前的 job 管线，前台命令在运行期也应出现在 `ctx.jobs` 中。本版本的可视化验证主要用后台 job 完成；如果你跑前台长命令看不到条，请带 DSH 版本、命令和截图开 issue。

### 4. 宿主提示是全局的

安装后，该 profile 下所有会话的 agent 都会收到这条提示。它只是建议，可能被忽略；卸载插件后提示消失。它不会修改任何命令，也不会自动给不支持的命令加参数。

### 5. 命令全文会显示

进度条的 label 是完整命令，可能包含 token、内网 URL、用户名或文件名。共享屏幕、截图、贴 issue 前请打码。插件本身不额外持久化命令，但 DSH 会话记录会保存工具调用。

### 6. 依赖 DSH 内部接口

`ctx.jobs`、`conversation.composer.dock`、`ctx.systemPrompt.section` 都来自当前 DSH 版本。DSH 升级后这些接口可能变化；本版本只保证在 `0.2.2-rc.1` 上测试过。

### 7. 并行任务有额外开销

每个运行中的 job 会开一条 observe 流，并有 1 秒一次的耗时刷新。通常任务数很少，开销可以忽略；同时几十个任务时会有额外解析和渲染成本。

### 8. 不是终端

不渲染 ANSI 全屏 UI、不转发按键、不支持 OSC 9;4、不提供交互式 TUI。它只解析文本行。

### 9. 语言覆盖有限

目前只有 `zh` 和 `en`。其他语言回退英文。

### 10. 没有取消按钮

v0.1.0 不能在进度条上 kill 任务；请用 DSH 自带的任务管理。

### 11. npm 发布状态

包名是 `dafeiyu-cli-progress-hud`，但仓库当前仍是 `private: true`，没有发布到 npm。要发布时请按 [PUBLISHING.md](./PUBLISHING.md) 改 `private`、确认包名可用并补 `publishConfig`。

## 隐私与安全

- 插件代码不发起网络请求、不写文件、不写 `localStorage`、不接入第三方分析。
- 只读当前 session 的 job 数据；不跨会话读取。
- 不在插件里保存历史；会话记录由 DSH 管理。
- 命令输出可能含敏感信息；截图和 issue 请先脱敏。
- 代码量很小，建议在安装前自己读一遍 [`client.js`](./client.js) 与 [`index.js`](./index.js)。

## 兼容性

| 项目 | 状态 |
| --- | --- |
| DSH `0.2.2-rc.1` | 已测试 |
| 其他 DSH 版本 | 未测试，接口可能不兼容 |
| Windows 11 + PowerShell 5.1 | 已测试 |
| macOS / Linux | 未测试 |
| DSH 桌面版内置 Web UI | 已测试 |
| 独立浏览器打开 Web UI | 未测试 |
| 移动端 / 窄屏 | 未专门适配 |

如果你在别的组合上验证成功或失败，欢迎开 issue 补充。

## 卸载

1. 在 DSH 插件管理器里卸载 `dafeiyu-cli-progress-hud`。
2. 刷新页面。
3. 进度条和宿主提示都会消失。

插件不往项目目录外写文件；卸载后不会留下运行时数据。

## 开发与测试

```bash
cd dafeiyu-cli-progress-hud
npm test
node --check client.js
node --check index.js
```

`npm test` 用 Node `vm` 加载真实的 `client.js`（stub 掉 `window.__ModuleLoader__` 和 `react`），覆盖：

- git `Receiving` / `Compressing` / `Counting` / `Resolving` / `Writing`；
- 回车流里取最后一条；
- curl 默认进度表；
- ANSI / OSC 转义；
- 无百分比不臆造；
- 150% clamp 到 100；
- `formatElapsed` 的 0 秒、65 秒、1 小时 2 分 3 秒。

测试不依赖网络和 DSH 运行时。

### 仓库结构

| 文件 | 作用 |
| --- | --- |
| [`client.js`](./client.js) | 客户端 UI、`ctx.jobs` 订阅、进度解析 |
| [`index.js`](./index.js) | 宿主半：一条 `systemPrompt` 提示 |
| [`package.json`](./package.json) | DSH bundle 清单、测试脚本 |
| [`cordis.patch.yml`](./cordis.patch.yml) | 把 bundle 插入 Cordis 组合 |
| [`locale/zh.json`](./locale/zh.json) / [`locale/en.json`](./locale/en.json) | 插件元数据文案 |
| [`icon.svg`](./icon.svg) | 插件图标 |
| [`test/parse-progress.test.mjs`](./test/parse-progress.test.mjs) | 解析器离线测试 |

没有构建步骤：改完 `client.js` / `index.js` 后，卸载再安装即可。

## 开源借鉴与致谢

| 来源 | 用途 | 许可证 / 说明 |
| --- | --- | --- |
| [hack3ric/git-clone-progress](https://github.com/hack3ric/git-clone-progress) | 参考“解析 `git clone` 输出并转成进度”的思路 | GitHub API 的 `license` 为 `null`（未声明许可证）。**未复制代码**；如要复用其代码，请先联系作者取得许可 |
| [Windows Terminal: Progress Bar Sequences](https://learn.microsoft.com/en-us/windows/terminal/tutorials/progress-bar-sequences) | 了解 OSC 9;4 终端进度协议 | 文档参考；本插件**未实现** OSC 9;4 |
| [OSGeo/gdal PR #11461](https://github.com/OSGeo/gdal/pull/11461) | 了解 OSC 9;4 在真实项目中的接入方式 | 仅思路参考，未复制代码；不擅自断言其许可证 |
| DSH 自带包 `@deepseek-ai/dsh-client-ui-jobs`、`@deepseek-ai/dsh-api-job-controller` | 参考客户端 slot 注册方式与 `ctx.jobs` 的公开用法 | 独立实现，未复制源码；本项目非 DeepSeek 官方项目 |

特别感谢 DSH 把 job 输出做成客户端可读的流；没有这层接口，这个插件不会这么轻。

## 贡献

欢迎 issue 和 PR。报告问题时请附上：

- DSH 版本、操作系统、shell；
- 完整命令（先脱敏）；
- 期望看到什么、实际看到什么；
- 如果方便，附一张打过码的截图。

PR 请尽量保持：零运行时依赖、不联网、不新增遥测、不伪造进度、不把未验证的平台写成“支持”。

## 许可证

[MIT](./LICENSE) © 2026 YEMPTY（溯）

---

## English summary

**Dafeiyu CLI Progress HUD (大肥鱼命令行进度条)** is an unofficial, MIT-licensed plugin for the DeepSeek Harness Web UI. It watches the current session's shell jobs through the official client `ctx.jobs` service and renders up to three live progress strips below the composer: command label, phase, percent, elapsed time, and a thin bar.

It parses git progress lines, curl's default meter, and generic `NN%` output. It is client-only for rendering, has no telemetry and no runtime dependencies, and hides commands that finish in under 1.2 seconds without a percent.

To our knowledge, no equivalent composer-dock progress plugin for DSH existed when this was written. That is not a claim of being first: parsing git progress and terminal progress reporting both have prior art (see the credits above). `git clone/fetch/push` needs `--progress` when stderr is not a TTY; `curl` users can use `--progress-bar`; `rsync` users can use `--info=progress2`.
