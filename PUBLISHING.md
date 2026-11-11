# 发布手册

这份文档面向要把 `dafeiyu-cli-progress-hud` 开源到自己仓库的人。它不替你执行 Git 命令，只把发布前要确认的事、容易写错的文案、以及可以直接改的发布步骤列清楚。

> 文中 `<absolute-path>` 是本地路径占位符；仓库地址已按 `YyyyEMPTY/dafeiyu-cli-progress-hud` 填好。

## 0. 一句话结论

- **可以开源**：代码是独立实现，MIT 许可，没有复制未授权代码。
- **不要称“全球首创”**：解析 git 进度、终端 OSC 9;4 都有先例；准确说法是“据我们所知，暂未发现同类 DSH 插件”。
- **不要直接 `npm publish`**：当前 `private: true` 会阻止误发；包名 `dafeiyu-cli-progress-hud` 已就位，但发布前仍要走完本清单。
- **发布前必须补**：真实截图（脱敏）、仓库元数据、`npm test` 通过、一次干净的安装/卸载验证。

## 1. 先对齐事实边界

对外文案只能基于以下事实：

| 事实 | 可以怎么写 | 不要怎么写 |
| --- | --- | --- |
| 这是社区插件 | “非官方社区插件” | “DeepSeek 官方插件”“官方推荐” |
| 我们没搜到同类 DSH 插件 | “据我们所知，暂未发现同类 DSH 插件” | “全球首创”“唯一实现”“DSH 第一个” |
| git 进度解析有先例 | “参考了 git-clone-progress 的思路” | “我们发明了 git 进度解析” |
| 终端有 OSC 9;4 | “终端场景已有 OSC 9;4 协议” | “我们实现了 OSC 9;4”（本插件没有） |
| DSH 自带 job 列表 | “DSH 已有任务列表；本插件补充 composer 下的实时进度” | “DSH 没有任务管理” |
| 只在有限环境实测 | “测试于 DSH 0.2.2-rc.1 / Windows 11 / PowerShell 5.1” | “全平台支持”“所有 shell 都支持” |

推荐的标准表述：

> 据我们所知，这是较早把 DSH shell job 进度接到 composer 下方的一批尝试之一；它不是全球首创，git 进度解析和终端进度协议都有更早的先例。

如果不想写“较早的一批”，就写：

> 据我们所知，暂未发现面向 DSH Web UI 的同类 composer 进度插件；欢迎补充更早的先例。

## 2. 发布前检查清单

### 2.1 代码与清单

- [ ] `npm test` 全部通过（解析器 9 个用例 + clamp + 无百分比 + elapsed）。
- [ ] `node --check client.js` 通过。
- [ ] `node --check index.js` 通过。
- [ ] 没有 `console.log` / `HUD DEBUG` / 临时探针。
- [ ] `package.json` 的 `version`、`description`、`license`、`keywords` 是最新的。
- [ ] `package.json` 的 `private` 仍为 `true`（当前如此；准备发 npm 时再改）。
- [ ] `cordis.patch.yml` 的 `id` / `name` 与包名一致。
- [ ] `client.js` 里 `window.__ModuleLoader__.load({ id: ... })` 的 id 与包名一致。
- [ ] `README.md` 里的安装命令、重装命令、flag 示例与实际行为一致。
- [ ] `LICENSE` 年份、版权人已替换（已写 `YEMPTY（溯）`）。
- [ ] `.gitignore` 覆盖 `node_modules/`、`.tmp/`、`dist/`、`coverage/`、`*.log`。
- [ ] `git status` 里没有测试克隆、截图原图、`.tmp`、个人路径或密钥。

### 2.2 真机验证

在发布前，至少完整走一遍：

- [ ] 从干净目录安装 bundle。
- [ ] 刷新页面，确认 `conversation.composer.dock` 出现 `cli-progress-hud`。
- [ ] 跑 `git clone --progress --depth 1 https://github.com/octocat/Hello-World.git demo`，看到百分比。
- [ ] 跑一条 3 秒以上的无百分比命令，看到低透明度占位条和耗时。
- [ ] 跑一条 1 秒内结束的命令，确认不闪烁。
- [ ] 同时跑 2–4 个任务，确认最多 3 行 + “另有 N 个任务”。
- [ ] 任务结束后条目消失。
- [ ] 卸载后刷新，进度条和宿主提示都消失。
- [ ] 窄窗口下不溢出（当前未专门适配，但至少不应撑破布局）。

如果某项没验证，就在 README 的兼容性表里如实写“未测试”，不要写成“支持”。

### 2.3 截图与隐私

- [ ] 截图/GIF 是真实界面，不是手绘 mock。
- [ ] 命令 label 里的 token、内网 URL、用户名、文件名已打码。
- [ ] 截图里没有其他会话的隐私内容。
- [ ] 截图放进 `docs/` 或 `assets/`，并在 README 的“效果”一节替换 ASCII 示意。
- [ ] 如果发布到 npm，README 里的图片用绝对 URL（例如 GitHub raw），或把图片加进 `files`；否则 npm 页面可能不显示相对路径图片。

当前 README 明确写了“示意，不是真实截图”。补图后请删掉这句话，改成“截图：”。

## 3. 改名与仓库元数据

### 3.1 包名

包名已定为 `dafeiyu-cli-progress-hud`，这是 npm/DSH 都能接受的小写 ASCII 名。中文“大肥鱼命令行进度条”只作显示标题，写在 `locale/zh.json` 的 `meta.title` 与 README 标题里，不要塞进 `name`。

如果以后改名，同步三处：

1. `package.json` → `"name"`；
2. `cordis.patch.yml` → `name:`（插件模块 id）；
3. `client.js` → `window.__ModuleLoader__.load({ id: '...' })` 的 `id`。

改完先卸载旧 bundle，再安装新目录；否则旧 id 可能仍在组合里。

### 3.2 仓库字段

`package.json` 中已写入：

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/YyyyEMPTY/dafeiyu-cli-progress-hud.git"
  },
  "homepage": "https://github.com/YyyyEMPTY/dafeiyu-cli-progress-hud#readme",
  "bugs": {
    "url": "https://github.com/YyyyEMPTY/dafeiyu-cli-progress-hud/issues"
  },
  "author": "YEMPTY (溯)"
}
```

如果准备发布 npm，再补：

```json
{
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

注意：当前是无 scope 包，不需要 `publishConfig.access`；只有改用 scoped 包时才需要。

### 3.3 版本与 tag

- `package.json` 的 `version` 与 Git tag 保持一致，例如 `0.1.0` ↔ `v0.1.0`。
- 首个公开版本建议就发 `0.1.0`，不要假装成 `1.0.0`。
- `CHANGELOG.md` 已按 `0.1.0 / 2026-11-12` 写好，发布前补上仓库链接与对比链接（可选）。

## 4. GitHub 发布步骤

以下命令只作参考，请在你的机器上确认路径后再执行。

```bash
cd dafeiyu-cli-progress-hud

git init
git add .
git commit -m "feat: initial Dafeiyu CLI progress HUD"

git branch -M main
git remote add origin https://github.com/YyyyEMPTY/dafeiyu-cli-progress-hud.git
git push -u origin main
```

创建 tag 与 release：

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

Release notes 可以直接用：

```markdown
## 大肥鱼命令行进度条 / Dafeiyu CLI Progress HUD v0.1.0

首个公开版本。

- 在 DSH Web UI 输入框下方显示当前会话 shell job 的进度
- 解析 git（Receiving / Compressing / Counting / Resolving / Writing）、curl 默认进度表、通用百分比
- 最多 3 行，快速命令不闪烁
- 中英文 locale，零运行时依赖，无遥测
- 测试于 DSH 0.2.2-rc.1 / Windows 11 / PowerShell 5.1

已知限制：无进度输出的命令不会造假进度；git 非 TTY 需要 `--progress`；前台长命令的可见性尚未充分验证；DSH 内部接口可能随版本变化。

非官方社区项目，MIT 许可。
```

如果仓库在 Gitee / GitLab，把远端地址换掉即可；命令本身通用。

## 5. 发布 npm（可选）

如果不打算发布 npm，跳过本节，保留 `private: true`。

发布前：

```bash
npm test
npm pack --dry-run
```

`npm pack --dry-run` 用来确认包里没有 `.tmp`、测试克隆、个人截图或多余文件。确认后：

```bash
npm publish
```

首次发布 scoped 包要加 `--access public`，或者依赖 `publishConfig.access`。

发布后回填：

- README 安装段可以增加 `npm` / DSH 插件市场的安装方式（如果已经有）。
- `package.json` 的 `repository` / `homepage` / `bugs` 必须指向真实仓库。
- 在 release notes 里写清“这是 DSH bundle，不是独立 Node 应用”。

## 6. 对外文案（可直接改）

### 6.1 一句话

> 给 DSH Web UI 写了个小插件：agent 跑 `git clone`、下载、上传时，输入框下方实时显示进度、阶段和耗时。非官方、MIT、零运行时依赖。

### 6.2 一段话

> DSH 的工具结果通常在命令结束后才回到对话里，跑几分钟的 clone 时中间只有“运行中”。这个插件订阅 DSH 的 `ctx.jobs` 流，解析 shell job 输出里的 git/curl/通用百分比，在 composer 下方渲染最多 3 条进度。它不修改命令、不伪造进度；git 需要 `--progress`，curl 可以用 `--progress-bar`。测试于 DSH 0.2.2-rc.1 / Windows 11，其他平台未验证。

### 6.3 长文开头

> 我用 DSH 跑 `git clone` 时，最大的痛点不是慢，是不知道它到底在下载、解包，还是已经卡死。DSH 其实已经把 shell 命令登记成 job，也有客户端可读的 `ctx.jobs`，只是 composer 上方没有把这层信息露出来。于是我写了一个纯客户端插件：订阅当前会话的 job 输出，解析常见进度行，在输入框下方画一条轻量进度条。
>
> 先说清楚：这不是全球首创。解析 git 进度有 `git-clone-progress` 这样的先例，终端里也有 OSC 9;4；DSH 自己也已有会话头部的任务列表。这个插件补的是“composer 下方的实时进度”这一小块。代码是独立写的，MIT，欢迎拍砖。

### 6.4 English blurb

> A small, unofficial plugin for the DeepSeek Harness Web UI. It subscribes to the current session's shell jobs through `ctx.jobs`, parses git/curl/generic progress lines, and renders up to three live progress strips below the composer. No telemetry, no runtime dependencies, MIT. Tested on DSH 0.2.2-rc.1 / Windows 11. To our knowledge no equivalent composer-dock plugin existed, but this is not a claim of being first: git progress parsing and terminal OSC 9;4 both have prior art.

## 7. 不要做的事

- 不要写“全球首创”“唯一”“官方”。
- 不要说“支持所有命令”或“自动给 git 加 `--progress`”；提示只是建议。
- 不要把未验证的 macOS / Linux / 其他 DSH 版本写成“支持”。
- 不要提交带 token、内网地址、用户名的截图。
- 不要在 `private: true` 时直接 `npm publish`；先确认改名与权限。
- 不要复制 `git-clone-progress` 的代码；它没有声明许可证，复用前必须先联系作者。
- 不要声称实现了 OSC 9;4；本插件只解析文本。
- 不要把 `node_modules/`、`.tmp/`、测试克隆、个人绝对路径提交进仓库。
- 不要让 README 的截图和实际 UI 不一致；补图后删掉“待补/示意”。

## 8. 发布后

- 在 README 顶部补仓库徽章（CI、license、version）——只有真的配置了 CI 才加 CI 徽章。
- 开 issue 模板：DSH 版本 / OS / shell / 命令（脱敏）/ 期望与实际 / 截图。
- 记录已知问题，不要把“前台长命令可见性”说成已完全验证。
- DSH 升级后回归一次 `ctx.jobs`、`conversation.composer.dock`、`ctx.systemPrompt.section` 三处接口。
- 如果收到“更早的同类插件”线索，更新 README 的先例段落，不要辩护“我们就是第一个”。

## 9. 最小发布检查表

发布前最后过一遍：

- [ ] 事实边界段落已读，文案没有“首创/官方/全平台”。
- [ ] 包名、`cordis.patch.yml`、`client.js` module id 三处一致。
- [ ] `npm test` / `node --check` 通过。
- [ ] 真机安装、刷新、进度、卸载都走通。
- [ ] 截图已脱敏，README 已替换“示意”。
- [ ] `git status` 干净，没有 `.tmp` / 测试克隆 / 密钥。
- [ ] `LICENSE` 版权人已替换。
- [ ] tag 与 `package.json` 版本一致。
- [ ] Release notes 写明“非官方”和已知限制。
