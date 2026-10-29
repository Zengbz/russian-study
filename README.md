# 俄语90天 · 第1周完整样课 v0.2

中文零基础俄语旅行课，手机优先，纯静态PWA，可上传GitHub Pages。第1—7天已完成互动样课；第8—90天展示已经确定的课程主题，尚未制作互动内容。

## 本次内容

- 第1—5天：每天4个字母、4—6个重点词／语块、2个核心表达、15项练习／任务。
- 第6天：20字母复习、语境、听力、拼读与4句口头自检，共15项任务。
- 第7天：热身、5轮连续场景、听懂检查和2项口头任务，共12项任务。
- 共102项任务：94项可按答案核对，8项口头自检。字母配对题内部包含多个配对。
- 题型包含选择、大小写配对、词块排序、先听后答和口头自检；每题给答案或参考与解析。
- 保存当前答题位置、首次答案、本轮结果、首次完成成绩和复习清单；重练不覆盖首次成绩。
- 全部任务完成后才记录课程完成；做错可以继续。完成与掌握程度分别呈现。

## 语音与离线范围

朗读使用设备／浏览器的俄语Speech Synthesis声音，提供慢速和常速。请先在右上角“语音与学习记录”中试听。语音可能需要设备预先提供俄语声音，部分声音需要联网；没有内置真人配音。当前云端测试浏览器没有俄语声音，因此未验证真实俄语播放质量和iPhone扬声器效果。

听力题先隐藏脚本，开始播放后才能选答案。没有声音时可明确选择文字辅助，题目会记录为“听力待练”，不算听力得分。口头任务是自己说出后核对，不会自动判断弹舌、发音或口音。

界面、课程数据、字体之外的本地资源与图标首次成功缓存后可离线使用。全部字体使用系统字体，没有外部字体或CDN依赖。离线朗读仍取决于设备是否有本地俄语声音。

学习记录保存在当前浏览器；不会自动跨设备同步。可用设置里的“导出学习记录”备份。原版的记录键保留，本周新练习的完成情况单独记录。

## 上传到GitHub Pages

1. 解压后，打开`russian_90_day_pwa`文件夹。
2. 将文件夹里面的全部内容上传到仓库发布目录，确保`index.html`在该目录顶层；不要只上传单独一个HTML。
3. 仓库Settings → Pages → Build and deployment，选择Deploy from a branch。
4. 选择main分支与`/(root)`目录，保存。
5. 等待发布完成后打开GitHub给出的HTTPS地址。

所有资源、PWA作用域和启动地址使用相对路径，适配项目仓库的子路径。无需安装Node依赖或后端。`.nojekyll`用于按静态文件发布。

如果更新后还看到旧版，先刷新；必要时关闭该站点的所有窗口再重新打开。不要先清除网站数据，以免删除本机学习记录。

## iPhone使用

用Safari打开发布地址，先试听俄语声音，再从分享菜单添加到主屏幕。首次保持联网直到页面正常加载并完成缓存。后续从主屏幕启动。

## 文件说明

| 文件 | 作用 |
|---|---|
| index.html、styles.css | 页面入口与手机布局 |
| app.js | 学习、练习、听力、结果、复习清单与本机记录 |
| core.js | 成绩、首次记录、选项顺序和本地日期逻辑 |
| course-data.js | 浏览器直接加载的7天内容与90天主题 |
| week1-course.json | 相同内容的结构化JSON，便于后续扩课 |
| sw.js、manifest.webmanifest、icon文件 | PWA、离线缓存和安装图标 |
| docs/russian_week1_complete_lessons.md | 每日讲解、全部题目、答案与解析 |
| docs/russian_90_day_curriculum.md | 已确定的90天课程规划 |
| tests/course.test.cjs | 不依赖第三方包的内容与逻辑检查 |

## 验证

在当前目录使用Node运行`node --test tests/course.test.cjs`。检查内容覆盖任务和字母范围、答案唯一性、随机位置、重音归一化、未完成阻断、首次成绩保留、文字辅助计分、连续天数、子路径离线缓存。

本次已完成桌面浏览器的首课整套流程、刷新续学、选择／配对／排序／文字辅助／口头自检与结果记录检查。手机窄屏通过390px内嵌视口检查；iPhone实机、系统俄语声音和实际离线朗读尚需设备试学。

## 参考

- [GitHub Pages发布来源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [MDN SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

版本日期：2026-10-29。
