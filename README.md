# Bumpling · 小芽孕期

Week-by-week pregnancy tracker (PWA). This repository is the deployable site root for GitHub Pages.

- Open the published URL in **Safari on iPhone** → Share → **Add to Home Screen**.
- All data stays on the device (local-only storage). No backend.
- Full source, tests and design notes: see the `bumpling-app-v1.2.zip` package.

## v1.2 additions

- **照片记录**：饮食/运动记录可拍照或从相册上传，照片自动出现在历史记录里（IndexedDB 本机存储，点缩略图看大图）。
- **拍照估算**（饮食页）：照片 → AI 识别食物，估算克重、蛋白质/碳水/脂肪/膳食纤维与卡路里；食物库自动匹配，可逐项修正后一键入账。食物库新增膳食纤维数据，营养卡片新增三大营养素供能比。
- **小芽AI 问答**（首页快捷 / 工具 / 我的）：文字、语音提问（Web Speech）、拍照提问；内置依据 ACOG / NHS / WHO / 中国 DRIs 整理的离线知识库，可在「我的 → AI 服务设置」接入自己的 OpenAI 兼容大模型获得个性化连续对话（Key 仅存本机）。
- **底栏优化**：底栏改为不透明、滚动留白加大，上下滑动时不再透出或遮挡文字。

