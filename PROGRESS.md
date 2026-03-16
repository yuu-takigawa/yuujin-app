# Yuujin App 重构进度

## 重构目标

将传统 AI 对话界面重构为社交化日语学习 App（LINE 风格），核心理念："打开 App 的感觉是我有几个日本朋友"。

---

## 2026-03-13 完成内容

### 已完成：Phase 1 全量功能框架搭建

#### Step 1: 数据层 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `services/mock/data.ts` | ✅ 重写 | 新 types（Character/Friendship/Conversation/Message）、3 预设角色、随机属性池、角色回复池 |
| `services/mock/characters.ts` | ✅ 新建 | 角色 CRUD + 随机生成 + 单字段随机 |
| `services/mock/friends.ts` | ✅ 新建 | 好友管理 + 自动创建会话 + greeting 消息 |
| `services/mock/conversations.ts` | ✅ 重写 | 关联 characterId、hasUnread、markAsRead、clearMessages |
| `services/mock/chat.ts` | ✅ 重写 | 按角色性格选择不同回复池 |
| `services/mock/auth.ts` | ✅ 修改 | 新用户 onboardingCompleted=false |
| `services/api.ts` | ✅ 重写 | 导出全部新接口 |

#### Step 2: Store 层 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `stores/characterStore.ts` | ✅ 新建 | 角色卡 CRUD + 随机生成 |
| `stores/friendStore.ts` | ✅ 新建 | 好友关系 + 会话列表 + 置顶/免打扰 |
| `stores/chatStore.ts` | ✅ 重构 | 加 characterId、clearChat |
| `stores/authStore.ts` | ✅ 修改 | 加 jpLevel、onboardingCompleted、completeOnboarding |
| `stores/settingsStore.ts` | ✅ 修改 | 加 darkMode、jpLevel |

#### Step 3: 组件层 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `components/common/Avatar.tsx` | ✅ 新建 | emoji 圆形头像 |
| `components/common/UnreadDot.tsx` | ✅ 新建 | 红点 |
| `components/common/SwipeableRow.tsx` | ✅ 新建 | 左滑删除 |
| `components/chat/ConversationCard.tsx` | ✅ 新建 | 会话列表行（头像+名字+预览+时间+红点） |
| `components/chat/MessageBubble.tsx` | ✅ 改造 | AI 侧加头像、长按回调、主题适配 |
| `components/chat/StreamingText.tsx` | ✅ 改造 | 加头像、主题适配 |
| `components/chat/TypingIndicator.tsx` | ✅ 改造 | 加头像、主题适配 |
| `components/chat/ChatInput.tsx` | ✅ 改造 | 主题适配 |
| `components/chat/CharacterHeader.tsx` | ✅ 新建 | 对话页顶栏（返回+头像+名字+汉堡菜单） |
| `components/chat/HamburgerMenu.tsx` | ✅ 新建 | 角色详情/免打扰/置顶/清空/删除 |
| `components/chat/BubbleMenu.tsx` | ✅ 新建 | 翻译/解析/复制（翻译解析为占位） |
| `components/character/CharacterCard.tsx` | ✅ 新建 | 横滑卡片 + AddCharacterCard |
| `components/character/CharacterForm.tsx` | ✅ 新建 | 创建表单 + 每字段骰子随机 + 全随机 |
| `components/character/CharacterDetail.tsx` | ✅ 新建 | 角色详情展示 |
| `components/character/DiceButton.tsx` | ✅ 新建 | 骰子按钮 |

#### Step 4: 页面 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `app/(main)/(chat)/index.tsx` | ✅ 新建 | 会话列表（置顶排序+左滑删除+空状态） |
| `app/(main)/(chat)/add-friend.tsx` | ✅ 新建 | 从角色卡库选人加好友 |
| `app/(main)/(chat)/[conversationId].tsx` | ✅ 新建 | 对话页（流式+气泡菜单+汉堡菜单） |
| `app/(main)/(friends)/index.tsx` | ✅ 新建 | 角色卡横滑列表 |
| `app/(main)/(friends)/create.tsx` | ✅ 新建 | 创建角色表单 |
| `app/(main)/(friends)/[characterId].tsx` | ✅ 新建 | 角色详情页 |
| `app/(main)/(news)/index.tsx` | ✅ 新建 | MVP 占位 |
| `app/(main)/(profile)/index.tsx` | ✅ 新建 | 用户中心 |
| `app/(main)/(profile)/settings.tsx` | ✅ 新建 | 设置页（暗色模式+日语水平+占位项） |

#### Step 5: 布局 & 导航 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `app/(main)/_layout.tsx` | ✅ 重写 | 4 Tab + 子页面自动隐藏 tab bar |
| `app/(main)/(chat)/_layout.tsx` | ✅ 新建 | Chat Stack |
| `app/(main)/(friends)/_layout.tsx` | ✅ 新建 | Friends Stack |
| `app/(main)/(news)/_layout.tsx` | ✅ 新建 | News Stack |
| `app/(main)/(profile)/_layout.tsx` | ✅ 新建 | Profile Stack |
| `app/(auth)/onboarding.tsx` | ✅ 新建 | 选水平 → 赠ゆき → 加好友 → 进对话 |
| `app/(auth)/login.tsx` | ✅ 改造 | 主题适配、导航更新 |
| `app/(auth)/register.tsx` | ✅ 改造 | 主题适配、注册后走 onboarding |
| `app/index.tsx` | ✅ 改造 | 根据 token + onboarding 状态重定向 |

#### Step 6: 主题 & 暗色模式 ✅
| 文件 | 状态 | 说明 |
|------|------|------|
| `constants/theme.ts` | ✅ 扩展 | lightColors + darkColors 两套色值 |
| `hooks/useTheme.ts` | ✅ 新建 | 根据 settingsStore.darkMode 返回对应色值 |
| 全组件 | ✅ | 均通过 useTheme() 动态取色 |

#### 已删除旧文件
- `app/(main)/chat.tsx` → 被 `(chat)/index.tsx` + `[conversationId].tsx` 替代
- `app/(main)/history.tsx` → 合并到 `(chat)/index.tsx`
- `app/(main)/profile.tsx` → 被 `(profile)/index.tsx` 替代

#### Bug 修复
- `mockGetMessages` 返回数组副本而非直接引用，修复重复消息 + duplicate key 问题

---

## 已验证
- [x] `npx expo export --platform web` 编译通过（783 modules, 0 error）
- [x] `npx expo start --web` 启动正常
- [x] 登录 → 会话列表 → 加好友 → 对话 → 流式回复 基本流程跑通
- [x] 暗色模式可切换

---

## 2026-03-14 完成内容

### PRD v1.1 前端对齐
| 改动 | 文件 | 说明 |
|------|------|------|
| 加号右移+品牌 Logo | `(chat)/index.tsx` | 导航栏: [spacer] [Yuujin logo] [＋], Cormorant Garamond 粗体 |
| 空列表设计 | `(chat)/index.tsx` | 留白风: 友人 + yuujin + 分隔线 + 引导文案 |
| Tab 图标 | `(main)/_layout.tsx` | emoji → Ionicons 矢量图标 |
| Google Fonts | `_layout.tsx` | 加载 Cormorant Garamond + Josefin Sans |
| 气泡菜单 | `BubbleMenu.tsx` | 新增「多選」「分享」两项 |
| 移除加好友按钮 | `CharacterDetail.tsx`, `[characterId].tsx` | PRD 规定友達页不能加好友 |
| 会员菜单 | `(profile)/index.tsx` | "収藏表達" → "会員プラン" |
| 搜索图标 | `CharacterHeader.tsx`, `[conversationId].tsx` | 对话页导航栏加搜索按钮 |
| 新闻页 | `NewsCard.tsx`, `data.ts`, `api.ts`, `(news)/index.tsx` | FlatList 新闻卡片列表 |
| ChatInput LINE 风格 | `ChatInput.tsx` | [＋] [📷] [输入框(AI)] [🎤/▲] + 展开面板 |

### 设计稿对齐 (.pen)
- Login / Register / Chat List (Empty) / Add Friend 页面品牌 Logo → "Yuujin · 友人" Shippori Mincho 700
- 所有返回按钮文字加粗 (fontWeight 600)，箭头保持细体 (300)
- Add Friend 页: 全宽搜索框 + 创建角色按钮 + 加载动画 + 加载完成提示 "もう誰もいないよ〜 👀"

### いらすとや (Irasutoya) 头像集成
角色头像使用 [いらすとや](https://www.irasutoya.com/) 免费插画替代 emoji。

**素材对应关系:**
| 角色 | 插画 | URL |
|------|------|-----|
| 佐藤ゆき | カフェの店員（女性） | `job_cafe_tenin_woman.png` |
| 田中健太 | プログラミングをする人（男性） | `computer_programming_man.png` |
| 山本さくら | 大学生（女性） | `daigakusei_woman.png` |

**集成方案（待实现）:**
- Character 接口新增 `avatarUrl?: string` 字段
- 新建 `services/irasutoya.ts` 模块: 搜索 irasutoya.com 获取插画 URL
- 创建角色时可搜索 irasutoya 插画作为头像
- Avatar 组件支持 `avatarUrl` 优先于 `avatarEmoji` 显示

### 设计稿迭代 (.pen) — 对话页
- 消息气泡：头像与气泡顶部对齐（alignItems: start）
- 气泡方向：非对称圆角 AI[4,18,18,18] / 用户[18,4,18,18]
- 打字指示器：品牌色 angular 渐变描边（流动效果）
- 移除已读状态（既読）—— AI 对话不需要
- 日期分隔符间距优化
- 输入栏 LINE 风格：[＋border] [输入框(🎤)] [AI border]
- 展开面板 4 项：カメラ / アルバム / 話題 / ニュース
- 输入栏 4 种状态设计：默认 / 输入中 / AI模式 / 录音中

### 设计稿迭代 (.pen) — 友達页
- 扑克手牌式卡片 Swiper（底部汇聚扇形堆叠）
- 卡片内容：圆形头像 + 名字年龄 + 职业地点 + 性格标签 + 自我介绍

---

## 2026-03-14 新需求实现（已完成）

### Onboarding & 设置 ✅
- [x] Onboarding 页面加「無経験」选项（`JpLevel` 增加 `'none'`）
- [x] 设置页日语水平加「無経験」（显示 🔰）

### 友達页（角色管理）✅
- [x] 角色卡 Swiper 全屏居中单卡布局 + pagingEnabled
- [x] 卡片底部主按钮：已添加→绿色「チャットを始める」/ 未添加→「詳細を見る」
- [x] 角色标签：区分「公式」（红色）/「カスタム」（绿色）badge
- [x] 加号卡片：放在 Swiper 最后，虚线边框 + 品牌色图标
- [x] 导航栏加号按钮：跳转创建角色页面
- [x] 角色详情页：加「チャットを始める」CTA 按钮（带图标）
- [x] 自定义角色详情页：编辑 + 删除并排按钮（带图标）
- [x] 编辑角色页面 `edit.tsx`：复用 CharacterForm，预填现有数据
- [x] Page indicator dots + 计数器
- [x] CharacterStore 新增 `updateCharacter` 方法

### 新闻页 ✅
- [x] 新闻详情二级页 `[articleId].tsx`
- [x] 所有汉字标注假名注音（ruby 行：小字读音 + 大字汉字）
- [x] Feeds 流每条新闻右下角分享按钮
- [x] 新闻详情导航栏：音量播放 + 分享按钮
- [x] 文章按段落划分，每段后加「翻訳」「解説」toggle 按钮
- [x] 展开翻译/解说面板（背景色区分）
- [x] 文章底部评论区：角色朋友评论 + 评论输入框
- [x] 分享弹窗 `ShareModal.tsx`：半屏选择会话
- [x] mock 数据：3 篇文章完整段落/ruby/翻译/解说/评论

### 个人页 ✅
- [x] 重新设计：渐变 banner + 负 margin 头像 + 用户卡片
- [x] 会员广告卡片：CTA「プランを見る」
- [x] 菜单项带 Ionicons 图标 + chevron 箭头
- [x] ログアウト按钮
- [x] 会員プラン页面：hero + 月额（おすすめ badge + 特性列表）+ 年额（2ヶ月分お得）+ フリープラン

### 对话页 ✅
- [x] ChatInput LINE 风格：[＋] [📷] [输入框(AI)] [🎤/▲]
- [x] 展开面板：🎲 話題抽卡 / 📰 ニュース引用 / ⋯ 準備中
- [x] ChatInput 回调：onTopicDraw / onNewsPicker
- [x] 话题抽卡弹窗 `TopicDrawModal.tsx`：半屏卡片堆叠 + シャッフル + 送信
- [x] 新闻引用弹窗 `NewsPickerModal.tsx`：半屏紧凑型新闻列表 + 送信
- [x] ConversationScreen 集成两个弹窗，发送 topic/news 到聊天
- [x] CharacterHeader 搜索图标（占位）

### 新增文件
| 文件 | 说明 |
|------|------|
| `components/common/HalfScreenModal.tsx` | 可复用半屏弹窗（drag handle + 圆角） |
| `components/common/ShareModal.tsx` | 分享到会话弹窗 |
| `components/chat/TopicDrawModal.tsx` | 话题抽卡弹窗（卡片堆叠 + 10 话题） |
| `components/chat/NewsPickerModal.tsx` | 新闻引用弹窗 |
| `app/(main)/(news)/[articleId].tsx` | 新闻详情页 |
| `app/(main)/(profile)/membership.tsx` | 会员套餐页 |
| `app/(main)/(friends)/edit.tsx` | 编辑角色页 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `services/mock/data.ts` | 新增 JpLevel/NewsParagraph/NewsComment/Topic 等类型 + mock 数据 |
| `services/mock/characters.ts` | 新增 updateCharacter 方法 |
| `services/api.ts` | 导出新类型和数据 |
| `stores/characterStore.ts` | 新增 updateCharacter 方法 |
| `stores/settingsStore.ts` | JpLevel 类型更新 |
| `app/(auth)/onboarding.tsx` | 新增「無経験」选项 |
| `app/(main)/(profile)/settings.tsx` | 新增「無経験」选项 |
| `app/(main)/(chat)/index.tsx` | ＋按钮左移 |
| `app/(main)/(chat)/[conversationId].tsx` | 集成 TopicDrawModal + NewsPickerModal |
| `app/(main)/(friends)/index.tsx` | 全屏卡片 Swiper + page dots |
| `app/(main)/(friends)/[characterId].tsx` | chat CTA + 编辑跳转 |
| `app/(main)/(friends)/_layout.tsx` | 注册 edit 路由 |
| `app/(main)/(news)/index.tsx` | 新闻卡片列表 + 分享 |
| `app/(main)/(profile)/index.tsx` | 渐变 banner 重设计 |
| `app/(main)/_layout.tsx` | hideTabBar 加 articleId/edit/membership |
| `components/character/CharacterCard.tsx` | 全屏 Swiper 卡片 + CTA + badge |
| `components/character/CharacterDetail.tsx` | chat 按钮 + 编辑/删除并排 |
| `components/character/CharacterForm.tsx` | submitLabel prop |
| `components/chat/ChatInput.tsx` | onTopicDraw/onNewsPicker 回调 |
| `components/news/NewsCard.tsx` | 分享按钮 |

---

## 已验证（2026-03-14）
- [x] `npx expo export --platform web` 编译通过（0 error）
- [x] Playwright 逐页截图验证：
  - チャット页：＋在左上
  - 友達页：卡片 Swiper + 公式/カスタム badge + CTA + page dots
  - 角色详情：チャットを始める 按钮 + 公式/カスタム badge
  - ニュース列表：6 条新闻 + 分享按钮
  - ニュース详情：ruby 注音 + 翻訳/解説 toggle + コメント区
  - マイページ：渐変 banner + 会員広告 + メニュー
  - 会員プラン：おすすめ月額 + 年額 + フリープラン
  - 対話页：LINE 風 input + 展開パネル
  - 話題抽卡弾窗：カード堆積 + シャッフル + 送信
  - ニュース引用弾窗：コンパクト一覧 + 送信

---

## 2026-03-14 后端开发 + 前后端对接

### 后端 (yuujin-server) ✅
| 模块 | 状态 | 端点 |
|------|------|------|
| Auth | ✅ | POST /auth/login, /auth/register, /auth/refresh |
| User | ✅ | GET/PUT /users/me |
| Character | ✅ | CRUD /characters/ + /characters/:id |
| Conversation | ✅ | GET /conversations/, GET/DELETE /conversations/:id, POST /conversations/:id/read, DELETE /conversations/:id/messages, GET /conversations/:id/search |
| Chat SSE | ✅ | POST /chat (Server-Sent Events 流式) |
| Friend | ✅ | GET/POST /friends/, PUT/DELETE /friends/:characterId |
| News | ✅ 新建 | GET /news/, GET /news/:id, POST /news/:id/read |
| AI | ✅ | Claude + Qianwen 双 provider |

**新建文件:**
| 文件 | 说明 |
|------|------|
| `app/module/news/NewsService.ts` | 新闻 CRUD + 阅读状态 + 6 条 seed 数据 |
| `app/module/news/NewsController.ts` | 新闻 REST 端点 |

**修改文件:**
| 文件 | 说明 |
|------|------|
| `app/module/conversation/ConversationService.ts` | 新增 clearMessages 方法 |
| `app/module/conversation/ConversationController.ts` | 新增 DELETE /:id/messages 端点 |
| `scripts/seed.ts` | 新增 6 条新闻 seed 数据 |

### 前后端对接层 ✅
| 文件 | 说明 |
|------|------|
| `services/http.ts` | HTTP 客户端（JWT 认证、base URL 自适应） |
| `services/real/auth.ts` | 真实认证 API |
| `services/real/characters.ts` | 真实角色 API + 服务端字段映射 |
| `services/real/friends.ts` | 真实好友 API |
| `services/real/conversations.ts` | 真实会话 API |
| `services/real/chat.ts` | 真实 SSE 流式聊天 |
| `services/real/news.ts` | 真实新闻 API |
| `services/api.ts` | Mock 模式（默认） |
| `services/api-real.ts` | 真实模式（重命名为 api.ts 即可切换） |
| `stores/authStore.ts` | 登录/注册时同步 HTTP token |

---

## 2026-03-14 动画 & 交互打磨

### Animation & Motion Polish ✅

基于 React Native `Animated` API，无新依赖，所有动画 ≤300ms，尽可能使用 `useNativeDriver: true`。

| 动画 | 文件 | 说明 |
|------|------|------|
| 消息气泡入场 | `MessageBubble.tsx` | opacity 0→1 + translateY 12→0, 280ms, mount-only |
| 流式文本入场 | `StreamingText.tsx` | 同上，与 MessageBubble 保持一致 |
| ChatInput 展开面板 | `ChatInput.tsx` | 面板 maxHeight 0→100 + opacity, ＋图标旋转 0→45°, 条件渲染防止 ghost items |
| 搜索栏滑出 | `[conversationId].tsx` | height 0→44 + opacity, 200ms |
| BubbleMenu 弹入 | `BubbleMenu.tsx` | scale 0.85→1 + opacity, spring 弹簧 |
| HamburgerMenu 侧滑 | `HamburgerMenu.tsx` | translateX 300→0 spring + overlay opacity 0→0.4 |
| 话题卡洗牌 | `TopicDrawModal.tsx` | scale 1→0.9 + opacity 120ms → 换文本 → scale 0.9→1 120ms |
| 个人页渐入 | `(profile)/index.tsx` | 4 区域 stagger 入场（80ms 间隔），opacity + translateY |

### Bug 修复 ✅

| 问题 | 文件 | 修复方案 |
|------|------|----------|
| AI 流式结束闪烁 | `MessageBubble.tsx`, `[conversationId].tsx` | `skipEntrance` prop + 初始化 `Animated.Value(skipEntrance ? 1 : 0)` 消除首帧 opacity:0 闪烁 |
| 发送按钮未还原设计 | `ChatInput.tsx` | 文本 ▲ → Ionicons arrow-up 圆形按钮 (24×24, brand 背景, 白色图标) |
| 展开面板 ghost items | `ChatInput.tsx` | 新增 `showPanel` state, 关闭动画完成后再卸载组件 |
| 新闻导航栏不一致 | `[articleId].tsx` | 还原为 ‹ 文本 brand 色, 68px 宽返回区域, 居中标题, 32px 图标按钮 |
| 评论输入框 focus outline | `[articleId].tsx` | 添加 `Platform.select({ web: { outlineStyle: 'none' } })` |
| 半屏弹窗 mask 跟随滑动 | `HalfScreenModal.tsx` | `animationType="slide"` → `"none"` + 自定义动画: overlay 淡入淡出(250ms) + content translateY 滑入(300ms) 独立运行 |
| 半屏弹窗 mask 样式 | `HalfScreenModal.tsx` | 改为深色毛玻璃效果: `rgba(0,0,0,0.45)` + `backdropFilter: blur(8px)` |

### 修改文件
| 文件 | 说明 |
|------|------|
| `components/chat/MessageBubble.tsx` | 入场动画 + skipEntrance + Platform import |
| `components/chat/StreamingText.tsx` | 入场动画 |
| `components/chat/ChatInput.tsx` | 展开面板动画 + 发送按钮修复 + showPanel 条件渲染 |
| `components/chat/BubbleMenu.tsx` | scale pop-in 动画 |
| `components/chat/HamburgerMenu.tsx` | 侧滑 + overlay 淡入动画 |
| `components/chat/TopicDrawModal.tsx` | 卡片洗牌动画 |
| `components/common/HalfScreenModal.tsx` | 重写: overlay 淡入淡出 + content 滑入 + 毛玻璃效果 |
| `app/(main)/(chat)/[conversationId].tsx` | 搜索栏动画 + 流式→消息过渡跟踪 |
| `app/(main)/(profile)/index.tsx` | stagger 入场动画 |
| `app/(main)/(news)/[articleId].tsx` | 导航栏还原 + 评论输入 outline 修复 |

---

## 2026-03-16 完成内容

### PWA 部署 & iOS 适配 ✅

前端已构建为 PWA 部署到 ECS，nginx 直接提供静态文件。

| 改动 | 文件 | 说明 |
|------|------|------|
| PWA 模板 | `web/index.html` | 自定义 HTML：viewport `user-scalable=no, viewport-fit=cover`、Apple PWA meta tags、manifest link |
| iOS 全屏 | `web/index.html` | `apple-mobile-web-app-capable=yes` + `apple-mobile-web-app-status-bar-style=default` 隐藏 Safari 工具栏 |
| 防缩放 | `web/index.html` | `minimum-scale=1, maximum-scale=1` + `overscroll-behavior: none` + `body { position: fixed; overflow: hidden }` |
| 部署流程 | 手动 | `npx expo export --platform web` → 注入自定义 index.html → `scp` 上传 `/opt/yuujin/web/` |

### 用户默认 AI 模型持久化 ✅

用户在设置页选择默认模型后存储到服务端 `settings.defaultModelId`，重启 App 后保留选择。

**三级优先策略（后端 validateChatCredits）**：
1. API 请求参数 `modelId`（保留作为覆盖接口）
2. 用户 `settings.defaultModelId`
3. 回退：用户等级可用的最高级模型

| 文件 | 说明 |
|------|------|
| `services/mock/data.ts` | User interface 新增 `defaultModelId?: string` |
| `services/real/auth.ts` | ServerUser.settings 增加 `defaultModelId`，mapFullUser 映射 |
| `stores/creditStore.ts` | 新增 `setDefaultModel()`：更新选中 + 调 API 持久化 + 同步 authStore + AsyncStorage |
| `stores/creditStore.ts` | `loadModels()` 优先从 `authStore.user.defaultModelId` 初始化 |
| `components/chat/ModelSelectorModal.tsx` | `handleSelect()` 改调 `setDefaultModel()` 替代 `setSelectedModel()` |
| `app/(main)/(profile)/settings.tsx` | 新增默认模型选择行：显示当前模型名 + 点击打开 ModelSelectorModal |

### 动画性能优化（PWA 移动端）✅

修复 PWA 在移动设备上的动画卡顿问题。

| 问题 | 文件 | 修复方案 |
|------|------|----------|
| 半屏弹窗动画卡顿 | `HalfScreenModal.tsx` | 全部改为 `useNativeDriver: true`（opacity + translateY），移除 `backdropFilter: blur(8px)` |
| 半屏弹窗缺少手势关闭 | `HalfScreenModal.tsx` | 新增 PanResponder 向下滑动关闭手势（handle 区域触发） |
| 角色卡 Swiper 卡顿 | `(friends)/index.tsx` | 移除 CSS `filter: blur()` 效果（移动端 GPU 开销大） |
| Swiper 动画冲突 | `(friends)/index.tsx` | `onPanResponderGrant` 中添加 `scrollX.stopAnimation()` |
| Swiper 弹簧参数 | `(friends)/index.tsx` | tension 68→100, friction 12→14, velocity threshold 0.5→0.3 |

---

## 2026-03-16 API 域名切换

### 生产 API 地址变更
- **之前**：`/api`（相对路径，nginx 同域反代）
- **现在**：`https://api.yuujin.cc`（独立 HTTPS API 域名）

### 变更文件
| 文件 | 变更 |
|------|------|
| `services/http.ts` | 生产环境 `API_BASE_URL` 从 `/api` 改为 `https://api.yuujin.cc` |

### 说明
- 开发环境仍使用 `http://localhost:7001`（不变）
- `api.yuujin.cc` 直接反代到 Egg.js:7001，无需 `/api` 前缀
- 所有 API 调用路径不变（`/auth/login`、`/chat` 等）
- CORS 已配置允许 `*`，跨域无问题

---

## 待优化 / 已知问题

### 功能层面
- [ ] BubbleMenu 的「翻訳」「解析」为占位，需接入实际翻译/语法解析逻辑
- [ ] 收藏表达列表为占位
- [ ] 设置页多数选项为占位（AI 模型切换、界面语言、通知、账号管理等）
- [ ] 消息搜索功能未实现（CharacterHeader 预留了但未接入）
- [ ] 相机、语音、AI 辅助均为占位

### 体验层面
- [ ] SwipeableRow 在 web 端体验一般，需测试移动端手势
- [ ] 会话列表没有下拉刷新
- [ ] 对话页没有上拉加载历史消息
- [ ] 角色头像目前用 emoji 占位，未来需支持图片
- [ ] 长按气泡菜单的定位（目前是居中弹窗，理想是贴近气泡）

### 技术层面
- [ ] 所有数据存在内存中，刷新页面丢失（需接入持久化 / 后端 API）
- [ ] 无错误边界（Error Boundary）
- [ ] 无 loading skeleton
- [ ] Tab bar 隐藏逻辑基于 `useSegments` 字符串匹配，较脆弱

---

## 文件统计
- 总源文件数：56
- 新建文件：39
- 修改文件：20
- 删除文件：3
