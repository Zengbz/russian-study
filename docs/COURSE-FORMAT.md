# 每周课程文件格式 v2

存放于 `courses/weekN-course.json`，根对象的 `week` 与文件名一致。程序没有周数、课数上限；同一份发布目录内课号与题号必须唯一。

```json
{
  "schemaVersion": 2,
  "week": 4,
  "title": "这一周的主题",
  "summary": "这一周的学习目标",
  "lessons": []
}
```

这里的空数组仅表示结构。正式文件至少要有一堂完整课，一般一周7课。每课字段可参照第2、3周完整文件：`day`、`title`、`subtitle`、`kind`、`minutes`、`goal`、`notes`、`reading`、`letters`、`vocabulary`、`phrases`、`questions`。

每题都要有唯一 `id`、`type`、`prompt`、`bucket`、`explanation`。现有题型的其他字段：

| type | 必要数据 |
|---|---|
| choice | `options` 不重复，`answer` 为其中一项 |
| listen | 同选择题，加 `audio` 朗读文本、`reveal` 作答后文字；可选 `audioFile` 本地录音路径 |
| match | `pairs`，例如 `[["А","а"],["М","м"]]` |
| order | `tokens` 按正确顺序填写，界面自动打乱 |
| oral | `checks` 自检清单、`reference` 参考回答 |
| input | `answers` 可接受答案数组，`mode` 输入方式 |

输入题示例：

```json
{
  "id": "d22-q01",
  "type": "input",
  "mode": "translate",
  "bucket": "键盘输入",
  "prompt": "输入“我来自中国”。",
  "answers": ["Я из Китая."],
  "hint": "Я + из + 国家的来源形式。",
  "explanation": "из后使用Китая，本课先记整句。",
  "normalization": {
    "caseSensitive": false,
    "punctuation": false,
    "strictYo": true
  }
}
```

`mode` 可用 `translate`、`cloze`、`copy`、`dictation`。`copy` 同时提供 `reference` 和 `practiceOnly: true`，表示看词输入热身；`dictation` 同时提供 `audio`、`reveal`，可选 `audioFile`。填空题的提示需明确输入空缺部分还是整句。

不要通过“相近就算正确”的模糊匹配放过拼写错误。需要接受另一种表达时，把它明确放进 `answers`。默认严格区分Е／Ё，某题确需容许Е代Ё时可设 `strictYo: false`。程序保留Й的短音符和Ё的两点，只移除教学重音U+0301。

`letters` 可复用 `alphabet.json` 中的字母对象；不教新字母时填空数组。`vocabulary` 为 `{ "ru": "俄语", "zh": "中文", "note": "用法" }` 数组；`phrases` 为 `{ "ru": "俄语句子", "zh": "中文" }` 数组。

维护者可在项目目录运行：

```sh
node --test tests/*.test.cjs
node scripts/build.mjs
```

构建会生成发布用 `site/` 与课程目录。网页上传者只上传新周JSON，GitHub Actions自动执行以上步骤。不要直接双击 `index.html` 测试JSON加载，应通过HTTP服务器或GitHub Pages访问。
