# 自由专题模块：文件格式与添加方法

模块不分“第几天”，由模块、分类、专题三层组织。主程序通用渲染讲解和练习；以后使用现有结构的模块可以只上传数据。语法专项是第一个实例，源文件位于 `modules/grammar/`。

## 1. 上传哪些文件

以新模块 `travel` 为例：

| 文件 | 用途 |
|---|---|
| `modules/travel/module.json` | 模块身份、首页标题、简介和排序 |
| `modules/travel/transport.json` | 一个分类，内含多个专题 |
| `modules/travel/hotel.json` | 另一个分类，可稍后追加 |
| `modules/travel/assets/…` | 可选的本模块固定录音 |

一个模块至少包含 `module.json` 和一个分类 JSON。分类文件名必须等于自己的 `id` 加 `.json`，例如 `transport.json` 对应 `id: "transport"`。模块文件夹名称必须等于 `module.json` 的 `id`。

仓库 Settings → Pages → Source 使用 **GitHub Actions**，并启用包内 `Publish Russian pocket course`。提交上述文件到默认分支后，构建自动生成 `modules/catalog.json`，首页自动出现入口。以后添加分类只需新增分类 JSON，添加专题只需更新该分类 JSON；不修改 `app.js`、`index.html`、`sw.js` 或其他模块。

`modules/catalog.json` 是构建生成的目录，不是手工登记列表。工作流只更新发布产物，不把生成结果提交回仓库。如果使用分支直接发布，需本地运行 `node scripts/build.mjs`，同时更新生成的目录及相应数据文件，或发布完整的 `site/` 静态产物。只上传新模块而不更新目录，在分支发布模式下不会自动发现。

每日课程仍独立放在 `courses/weekN-course.json`，不要改成这里的格式。

## 2. 模块说明 module.json

以下是可用示例：

```json
{
  "schemaVersion": 1,
  "kind": "learning-module",
  "id": "travel",
  "title": "旅行专项",
  "summary": "按交通和住宿场景自由练习。",
  "order": 20,
  "symbol": "Т"
}
```

`order` 为数字，越小越靠前；同值按 `id` 排序。`symbol` 可省略，是首页的简短文字标识，不是图片路径。标题和简介使用纯文本。

## 3. 一个可复制的分类文件

把下面保存为 `modules/travel/transport.json`，与上面的 `module.json` 一起上传即可形成一个有讲解和两道输入练习的模块。本例的两题仅用于演示格式，不是完整课程设计。

```json
{
  "schemaVersion": 1,
  "kind": "lesson-category",
  "moduleId": "travel",
  "id": "transport",
  "title": "交通",
  "summary": "先练买票的短句。",
  "order": 10,
  "lessons": [
    {
      "id": "ticket-request",
      "title": "买一张票",
      "goal": "用билет和пожалуйста提出简短请求。",
      "level": "基础",
      "prerequisites": [],
      "sections": [
        {
          "title": "怎么表达",
          "text": "可以用名词短语加пожалуйста提出请求。本节先练“一张票”。",
          "table": {
            "headers": ["俄语", "意思"],
            "rows": [["оди́н биле́т", "一张票"], ["пожа́луйста", "请"]]
          },
          "examples": [
            {"ru": "Оди́н биле́т, пожа́луйста.", "zh": "请给我一张票。"}
          ]
        }
      ],
      "questions": [
        {
          "id": "travel-ticket-q01",
          "type": "input",
          "mode": "cloze",
          "bucket": "词形输入",
          "prompt": "只填空缺词：Один ___, пожалуйста.（票）",
          "answers": ["билет"],
          "hint": "这里使用билет的基本形式。",
          "explanation": "一张票是один билет。"
        },
        {
          "id": "travel-ticket-q02",
          "type": "input",
          "mode": "translate",
          "bucket": "句型输入",
          "prompt": "按上面的例句输入：请给我一张票。",
          "answers": ["Один билет, пожалуйста."],
          "explanation": "本题练习指定短句Один билет, пожалуйста."
        }
      ]
    }
  ]
}
```

`level` 当前使用 `基础` 或 `进阶`。`prerequisites` 可省略，填写同一模块内的专题 `id`，仅作为建议先学链接，不锁课。专题按分类 JSON 的 `lessons` 数组顺序显示。分类按自己的 `order`、`id` 排序，自动分页，每页6个专题，没有最大专题数或页数。

## 4. 讲解结构

每个专题必须有 `sections` 和 `questions`，都至少一项。

每段讲解的 `title`、`text` 为必填纯文本。可加表格 `table` 和例句数组 `examples`。表格至少两列表头，每行列数必须一致，单元格用非空字符串。例句使用 `ru`、`zh` 字段，俄语旁自动生成系统朗读按钮。纯文本不执行 HTML、Markdown 或脚本。

超宽表格在自己的容器内横向滚动，俄语重音沿用单词整体换行。当前不包含新图片、视频或任意富文本组件；要增加这些显示结构，需要升级渲染器。

## 5. 六种现有题型

所有题目必须包含唯一的 `id`、`type`、`prompt`、`explanation`。`bucket` 是显示用分组名，建议填写。题号必须以模块编号加连字符开头，例如 `travel-…`，且与所有每日课程、其他模块题号都不重复。

| type | 需要的主要字段 | 行为 |
|---|---|---|
| `choice` | `options`、`answer` | 选项互异，正确答案必须出现在选项中 |
| `listen` | `audio`、`reveal`、`options`、`answer` | 先播放才开放作答；可用文字辅助并记听力待练 |
| `input` | `answers`；可选 `mode`、`hint` | 手机键盘输入，由本地程序匹配可接受答案 |
| `order` | `tokens` | 词块按数组目标顺序重组；含标点时把标点放进相应词块 |
| `match` | `pairs` | 二维数组，左右任一侧的标签都不可重复 |
| `oral` | `reference`、`checks` | 开口后自行选择独立、看提示、仍需练习；不自动识别语音 |

听写可用 `type: "input"`、`mode: "dictation"`，并提供 `audio` 和 `reveal`。看词输入热身可设 `practiceOnly: true`，不计独立答题正确率。所有输入题的 `answers` 可以列多个可接受答案；只匹配已列出的答案，不是自由俄语作文判卷。开放翻译要补充合理变体，或明确要求本节例句用词和语序。

默认忽略输入大小写、多余空格、学习用重音和句末句号、问号、叹号；默认仍区分 `е/ё`、`и/й`、`ь/ъ`。内部逗号、单词顺序仍按答案要求。`normalization.strictYo: false` 可按题目需要放宽 `е/ё`；`normalization.caseSensitive: true` 可严格大小写；`normalization.punctuation: true` 可严格标点。误混英文字母会先提示切换键盘，不记该次提交。

## 6. 固定录音

例句默认使用设备俄语语音。听力题也可提供 `audioFile`：

```json
{
  "audio": "Один билет, пожалуйста.",
  "reveal": "Один билет, пожалуйста.",
  "audioFile": "modules/travel/assets/ticket.mp3"
}
```

上面是附加字段示例，仍需与具体题型的其他必填字段合并。音频须位于自己的 `modules/<模块id>/assets/`，引用从应用根目录算起，不用外部 URL、`../` 或 `./modules/…`。文件需随 JSON 一起上传。构建检查文件存在，分类下载保存所引用音频；声音的授权与许可由内容作者一并提供。

## 7. 编号与学习记录

模块、分类、专题编号均使用小写英文字母开头，后面可用小写字母、数字、连字符，最多64字符；不用 `constructor`、`prototype`、`__proto__`。分类编号 `all` 保留给“全部”页，不可使用。

同一模块内专题编号唯一，可与其他模块的专题编号相同，因为学习记录按模块隔离。题号则全站唯一。以后增加或改讲解时，保留已发布的模块、专题和题目编号，避免已有记录失去对应关系；换一套题目应给新题号或新专题号。

专题记录位于备份的 `modules.<模块id>.lessons.<专题id>`。每日进度仍在 `days`、`dates`，专项不向每日复习队列插入错项。每个模块有自己的继续位置与上次分类分页，重练保留首次完成记录。数据中不填写 `day`，也不按90课编号。

移除文件不会主动删除用户设备上的旧学习记录，但移除的专题不再显示或可打开。不要用旧的整个模块文件夹覆盖后来添加的分类。

## 8. 上传前核对

本地可运行：

```sh
node --test tests/*.test.cjs
node scripts/build.mjs
```

构建扫描每日课程和所有模块，检查路径、版本、格式、重号与音频存在性，并输出目录和静态文件。新模块格式错误会让本次发布失败，已发布站点继续使用前一个成功版本；修正出错文件后重新提交。网页设置中“检查新课程与应用更新”会同时检查每日和模块目录。

本次自动检查包含“只添加新模块文件夹和分类JSON，原程序及语法文件不变仍能生成目录”的隔离场景。未来新增题型或任意可执行功能仍需程序更新，不属于纯数据模块能力。
