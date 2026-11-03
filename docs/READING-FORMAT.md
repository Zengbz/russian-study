# 阅读理解：后续新增短句组

应用从 `reading/` 的每份 JSON 自动生成听读目录。已有八篇示例；新增一篇时，新建 `reading/airport-checkin.json`，并将每句真人 MP3 放入 `reading/audio/`。GitHub Pages Source 设为 **GitHub Actions**，提交后工作流自动校验、生成 `reading/catalog.json` 并发布。不要手改目录或首页代码。

```json
{
  "id": "airport-checkin",
  "order": 9,
  "title": "机场值机",
  "category": "旅行",
  "level": "A1 · 进阶",
  "description": "先听录音，再展开俄文和中文释义。",
  "segments": [
    {
      "ru": "Доброе утро!",
      "zh": "早上好！",
      "gloss": [
        {"ru": "утро", "zh": "早晨"}
      ],
      "audioFile": "reading/audio/123456.mp3",
      "source": {
        "sentenceId": 987654,
        "audioId": 123456,
        "speaker": "Inego",
        "license": "CC BY 4.0"
      }
    },
    {
      "ru": "Как дела?", "zh": "近况如何？",
      "gloss": [{"ru": "дела", "zh": "近况"}],
      "audioFile": "reading/audio/123457.mp3",
      "source": {"sentenceId": 987655, "audioId": 123457, "speaker": "Inego", "license": "CC BY 4.0"}
    }
  ]
}
```

示例展示结构，提交前须换成**至少两句**真实俄文、中文释义及相应 MP3；每句 `gloss.ru` 必须是原句中的原形或连续词组（大小写不限）。`id` 与 JSON 文件名一致；`order` 和音频编号在全目录中唯一；`category` 可自行填写，列表分类会自动出现。文件名用音频编号命名，例如 `reading/audio/123456.mp3`。本模块仅接受经过核验的 **CC BY 4.0** 录音，页面会显示作者、原句链接和许可；若换用其他来源或许可，需先修改校验与归属展示方式。

录音与句子可从 [Tatoeba 下载](https://tatoeba.org/en/downloads) 的 `sentences_with_audio`（含录音编号、作者、许可）及 `rus_sentences.tsv`（含句子编号与俄文）核对。**录音许可栏为空时不能在本网站复用**；不要只看俄文句子的文字许可就推定录音也可复用。录音下载地址是 `https://tatoeba.org/audio/download/录音编号`；下载后核对文件确为 MP3、句子编号与音频编号一致，并试听。每句的 `source` 会在第 3 步自动生成作者归属及 Tatoeba 原句链接。Tatoeba 文字为 [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/)；应用自行写中文释义。

部署前可运行 `node --test tests/*.test.cjs` 和 `node scripts/build.mjs`。构建会检查录音文件存在、MP3 文件头、重复编号和音文数据格式。新增的 JSON 与 MP3 会进入 GitHub Pages 产物；用户第一次在线打开新篇后，可以点“下载本篇录音”离线重听。每篇的三步进度只在当前打开期间保留，完成标记会存入同一份学习记录备份，不增加每日打卡天数。
