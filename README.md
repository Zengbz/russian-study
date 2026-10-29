# 俄语旅行口袋课 v2.1.1

适合手机PWA的俄语旅行入门课程。已完成第1—4周，共28课、406项任务，含67道键盘输入题。课程按周增加，不限90天。

**首次升级请先阅读 [升级说明](docs/UPGRADE.md)。已装上一版时，本次第4周需要同时更新`tests/extension.test.cjs`，修正发布测试固定周数的问题；后续继续只添加JSON。**

- 每周数据：`courses/week1-course.json`、`week2-course.json`、`week3-course.json`、`week4-course.json`。
- 第2—4周完整文字与答案：`docs/week2-complete-lessons.md`、`docs/week3-complete-lessons.md`、`docs/week4-complete-lessons.md`。
- 后续JSON结构：[课程格式](docs/COURSE-FORMAT.md)。
- 录音许可：[录音署名](AUDIO-CREDITS.html)。字体许可：`assets/fonts/LICENSE.txt`。
- 验证记录：`docs/VALIDATION.md`。

## GitHub Pages

网页上传请分两批：先上传整个`assets`文件夹，再上传其他内容到俄语应用专用仓库根目录，包含`.github`、`scripts`、`tests`、`courses`与`assets`。在Settings → Pages中将Source设为GitHub Actions。默认分支每次提交都会自动检查、生成课程目录并发布。必要时在Actions中手动运行Publish Russian pocket course。

以后只上传新周JSON到`courses/`并提交即可。手机在“…”中检查课程更新。不需要每周修改程序或手动登记目录。已有另一个Pages站点时，请使用独立仓库，或先合并现有发布流程。

## 本地维护

不需要安装npm依赖。使用Node.js 22或更新版本运行：

```sh
node --test tests/*.test.cjs
node scripts/build.mjs
```

`site/`是构建结果；预览应使用HTTP访问。不要用file://双击打开。`scripts/make-courses.py`是本次第1—3周的编写源，后续上传新周JSON不需要运行它。日常部署直接使用已打包音频，录音处理信息保存在`assets/audio/credits.json`。
