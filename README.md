# 俄语旅行口袋课 v3.2 · 视频教程版

## v3.2 视频教程

已有 v3.1 用户解压 `video-tutorial-update.zip` 到应用仓库的原目录，合并覆盖同名文件并提交，等待 GitHub Pages Actions 部署。视频模块与每日课程、语法专项和进度记录独立；B站视频由官方播放器在线播放，页内可暂停和拖动，无法嵌入时可点“去B站观看”。离线下载不包含第三方视频。更新后在手机“…”检查更新，完全关闭 PWA 再重新打开，设置中的版本提示应显示 v3.2。不要用旧补丁再覆盖新版程序文件。

### 以后增加视频：只上传一份 JSON

在 `videos/` 下新建 `lesson-16.json`，内容格式例如（把 BV 号替换为新视频的编号）：

```json
{
  "id": "lesson-16",
  "title": "第16课 · 我填写的视频标题",
  "description": "这节视频练什么",
  "provider": "bilibili",
  "bvid": "BV1dT4y1A7Ma",
  "p": 1,
  "order": 16,
  "categories": ["发音", "入门"]
}
```

`id` 必须与文件名一致且不重复；`order` 是你指定的列表编号，也不能重复，正序从小到大、倒序相反。`categories` 自由填写，可有多个标签，分类选项会从所有视频 JSON 中自动汇总，不能使用保留标签“全部”。`bvid` 填链接 `/video/` 后面的 BV 号，`p` 是从 1 开始的分P编号。当前仓库已有 `videos/lesson-01.json` 到 `videos/lesson-15.json`；你可以直接修改各文件的 `title`、`description` 和 `categories`，不用修改程序。

提交新增的 JSON 后，`.github/workflows/pages.yml` 会扫描 `videos/`、校验条目、自动重新生成 `videos/catalog.json` 并发布。**先在仓库 Settings → Pages → Build and deployment 将 Source 设为 GitHub Actions。** 此后只提交原始 JSON 即可；不必手改 catalog，也不用重新上传全站。如果继续使用从 `main` 分支直接发布的模式，则每次还要运行 `node scripts/build.mjs`，提交生成的 `videos/catalog.json`。确保应用部署路径的文件夹层级不变。

## v3.1 辅音拼读录音

将 `alphabet-audio-update.zip` 解压到仓库应用根目录，覆盖同名文件并提交。字母表和日常课的字母卡片会从同一份 `alphabet.json` 取音源；辅音大字播放卡片上标明的俄语音节，例如 М → ма，字母名称单独播放。原有 10 个元音录音没有变动。字母表可单独下载录音离线使用。部署后在应用“…”里检查更新并完全关闭再打开。不要再使用旧补丁覆盖新版本。

手机 PWA，适合旅行前的俄语入门。每日课程现有13周、90课、1342项任务（316道键盘输入题），可继续追加第14周、第15周等。

首页新增“语法专项”：6类、36个专题、288项练习，其中72道手机键盘输入题。专题自由进入，按分类分页，不按天解锁；讲解、词形表、朗读例句、练习和学习记录放在一起。专项进度、首次成绩与重练记录独立保存，不增加每日打卡。

## 已有应用如何升级

已有前90课版本，解压 `grammar-module-update.zip`，把包内文件和文件夹合并到应用原位置，覆盖同名文件并一起提交。保留已有 `courses/`、`assets/` 和其他自加内容。等待部署成功后，在手机“…”中检查更新，完全关闭并重新打开，声音设置应显示 v3.0。

完整安装包 `russian_90_day_pwa_github.zip` 包含全部程序、每日课程、语法专题和资源。第一次安装或版本较旧时使用完整包。部署与原站点共存说明见 [升级说明](docs/UPGRADE.md)。

## 以后只添加内容

| 要添加的内容 | 上传位置 | 配套 Actions 自动处理 |
|---|---|---|
| 第N周每日课程 | `courses/weekN-course.json` | 验证并生成周目录 |
| 新专题模块 | `modules/新模块编号/module.json` 和分类 JSON | 自动增加首页入口、分类和分页 |
| 既有模块的新分类 | `modules/既有模块编号/新分类编号.json` | 自动增加分类及专题 |
| 某分类的新专题 | 更新该分类 JSON 的 `lessons` | 自动更新专题数量与页数 |

**“只上传模块文件”需要使用包内 GitHub Actions 发布流程。** 构建扫描文件夹生成 `courses/catalog.json` 与 `modules/catalog.json`，不需要手改目录、首页、路由或 Service Worker。生成的目录只进入发布产物，不自动提交回源码仓库。

使用 “Deploy from a branch” 时，须同时上传重新生成的对应目录，或上传构建后的静态文件。详细结构与完整可用示例见 [模块格式](docs/MODULE-FORMAT.md)。只添加 JSON 适用于已有讲解结构、六种题型和朗读方式；新录音需附资源，新增交互类型需升级引擎。

## GitHub Pages

将完整包 `russian_90_day_pwa/` 内的内容放到俄语应用专用仓库根目录，包括 `.github`、`scripts`、`tests`、`courses`、`modules`、`assets`。网页上传可分两批：先整个 `assets` 文件夹，再其余内容。Settings → Pages → Source 选择 **GitHub Actions**，提交默认分支后等待 “Publish Russian pocket course” 成功。

如果同一仓库还有其他 Pages 内容，需统一构建发布，或给俄语应用使用独立仓库；包内工作流发布整个俄语站点，不能用两个独立工作流轮流覆盖。

## 记录、声音与离线

沿用原来的存储键及每日题号。同址、同浏览器保留旧记录；设置可导出每日与所有模块进度，也可导入旧版备份。备份没有的模块记录仍会保留，同一专题以导入内容为准，可撤销上一次导入。

每日课程可“下载本周＋字母音频”；模块可“下载本分类”。词句朗读沿用设备俄语语音，离线需本地俄语声音。没有声音时可用文字辅助，仍记为听力待练。口语由学习者自检，不含自动语音识别。

保留 v2.2 的重复点播、动态喇叭及 iOS 媒体播放会话处理。iPhone 静音下的系统朗读仍需实机验证；不保证所有系统版本一致。不要再将旧 `ios-audio-update.zip` 覆盖到 v3.0 上。

## 文件与维护

- [升级与后续上传说明](docs/UPGRADE.md)
- [每日课程格式](docs/COURSE-FORMAT.md)；[模块格式](docs/MODULE-FORMAT.md)
- 每日完整讲解与答案：`docs/weekN-complete-lessons.md`
- 语法完整讲解与答案：[grammar-complete-lessons.md](docs/grammar-complete-lessons.md)
- [本次验证记录](docs/VALIDATION.md)
- [录音许可](AUDIO-CREDITS.html)；字体许可 `assets/fonts/LICENSE.txt`

无需 npm 依赖。Node.js 22 或更新版本运行：

```sh
node --test tests/*.test.cjs
node scripts/build.mjs
```

`site/` 为静态产物。`modules.js` 负责通用校验与加载，`module-ui.js` 负责通用专题界面；都不包含固定模块列表。数据 JSON 是课程维护的依据，不要运行早期 `scripts/make-courses.py` 覆盖已有课程。

本次已通过自动检查及浏览器手机宽度交互验证，尚未替用户执行真实 GitHub 部署或 iPhone 实机试听。
