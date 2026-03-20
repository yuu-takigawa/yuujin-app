// ─── Types ───

export type JpLevel = 'none' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'native';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarEmoji: string;
  avatarUrl?: string;
  level: number;
  jpLevel: JpLevel;
  onboardingCompleted: boolean;
  defaultModelId?: string;
}

export interface Character {
  id: string;
  userId: string | null; // null = system preset
  name: string;
  avatarEmoji: string;
  avatarUrl?: string;
  age: number;
  gender: string;
  occupation: string;
  personality: string[];
  hobbies: string[];
  location: string;
  bio: string;
  isPreset: boolean;
}

export interface Friendship {
  id: string;
  userId: string;
  characterId: string;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  characterId: string;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  language?: 'ja' | 'zh' | 'mixed';
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  timeAgo: string;
  imageEmoji: string;
  imageUrl?: string;
  url: string;
  category?: string;
  difficulty?: string;
  commentCount?: number;
}

export interface NewsParagraph {
  id: string;
  text: string;
  ruby: [string, string][];
  translation: string;
  explanation: string;
}

export interface NewsComment {
  id: string;
  articleId: string;
  characterId: string;
  characterName: string;
  characterEmoji: string;
  content: string;
  createdAt: string;
  isAi?: boolean;
  replies?: NewsComment[];
}

export interface NewsArticleDetail extends NewsArticle {
  content: string;
  furigana?: Record<string, [string, string][]>;
  paragraphs: NewsParagraph[];
  comments: NewsComment[];
}

export interface Topic {
  id: string;
  emoji: string;
  text: string;
  category: string;
}

export const mockNewsArticles: NewsArticle[] = [
  {
    id: 'news-1',
    title: '東京タワー、開業65周年記念イベントを開催',
    summary: '東京タワーは開業65周年を記念して、特別ライトアップやフォトコンテストなど様々なイベントを開催する。',
    source: 'NHKニュース',
    timeAgo: '2時間前',
    imageEmoji: '🗼',
    url: '',
  },
  {
    id: 'news-2',
    title: '新しい日本語能力試験N3対策アプリがリリース',
    summary: 'AI搭載の日本語学習アプリが登場。JLPT N3レベルの文法・語彙をゲーム感覚で学べる。',
    source: 'テックニュース',
    timeAgo: '5時間前',
    imageEmoji: '📱',
    url: '',
  },
  {
    id: 'news-3',
    title: '京都の紅葉シーズン到来、観光客で賑わう',
    summary: '京都の名所で紅葉が見頃を迎え、国内外から多くの観光客が訪れている。清水寺や嵐山が人気。',
    source: '朝日新聞',
    timeAgo: '8時間前',
    imageEmoji: '🍁',
    url: '',
  },
  {
    id: 'news-4',
    title: '日本のアニメ産業、過去最高の売上を記録',
    summary: '日本動画協会の最新レポートによると、アニメ産業の市場規模が過去最高を更新した。',
    source: 'アニメニュース',
    timeAgo: '1日前',
    imageEmoji: '🎬',
    url: '',
  },
  {
    id: 'news-5',
    title: '新幹線の新型車両N700S、全路線に導入完了',
    summary: 'JR東海は最新型新幹線N700Sの全路線導入が完了したと発表。省エネ性能が大幅に向上。',
    source: '鉄道ジャーナル',
    timeAgo: '1日前',
    imageEmoji: '🚄',
    url: '',
  },
  {
    id: 'news-6',
    title: '和食がユネスコ無形文化遺産登録10周年',
    summary: '和食のユネスコ無形文化遺産登録から10周年を迎え、各地で記念イベントが開催されている。',
    source: '読売新聞',
    timeAgo: '2日前',
    imageEmoji: '🍣',
    url: '',
  },
];

// ─── Preset Characters ───

export const presetCharacters: Character[] = [
  {
    id: 'char-yuki',
    userId: null,
    name: '佐藤ゆき',
    avatarEmoji: '👩',
    age: 27,
    gender: '女性',
    occupation: 'UIデザイナー',
    personality: ['明るい', '話しやすい', '好奇心旺盛'],
    hobbies: ['カフェ巡り', '写真', 'ヨガ'],
    location: '東京・下北沢',
    bio: 'はじめまして！ゆきです。下北沢でデザインの仕事をしています。新しいカフェを見つけるのが趣味で、休日はよく写真を撮りに出かけます。いろんな国の人と話すのが大好き！気軽に話しかけてね😊',
    isPreset: true,
  },
  {
    id: 'char-kenta',
    userId: null,
    name: '田中健太',
    avatarEmoji: '👨',
    age: 32,
    gender: '男性',
    occupation: 'ITエンジニア',
    personality: ['落ち着いた', '親切', 'オタク気質'],
    hobbies: ['プログラミング', 'アニメ', 'ゲーム'],
    location: '東京・秋葉原',
    bio: 'こんにちは、健太です。秋葉原でエンジニアをやっています。アニメとゲームが大好きで、最新のテクノロジーにも詳しいです。日本のオタク文化について何でも聞いてください！',
    isPreset: true,
  },
  {
    id: 'char-sakura',
    userId: null,
    name: '山本さくら',
    avatarEmoji: '👧',
    age: 24,
    gender: '女性',
    occupation: '大学院生',
    personality: ['おっとり', '知的', '優しい'],
    hobbies: ['読書', '茶道', '散歩'],
    location: '京都・出町柳',
    bio: 'さくらです。京都の大学院で日本文学を研究しています。お茶を点てるのが好きで、鴨川沿いをお散歩するのが日課です。日本の文化や歴史について、ゆっくりお話ししましょう。',
    isPreset: true,
  },
];

// ─── Random Generation Pools ───

export const randomNames = {
  female: ['鈴木あい', '高橋みお', '渡辺はな', '伊藤りん', '中村そら', '小林もえ'],
  male: ['加藤ゆうた', '吉田そうた', '山田はると', '松本りく', '井上こうき', '木村たくみ'],
};

export const randomEmojis = ['😊', '😎', '🤗', '🧑', '👩‍🦰', '👨‍🦱', '🧑‍🎨', '🧑‍💻', '🧑‍🎓', '🧑‍🍳'];

export const randomOccupations = [
  'バリスタ', 'イラストレーター', '料理人', 'フリーランスライター',
  '音楽家', 'ヨガインストラクター', '花屋', '書店員', 'フォトグラファー', '保育士',
];

export const randomPersonalities = [
  '明るい', '穏やか', 'ユーモアがある', '真面目', '元気',
  'マイペース', '社交的', '繊細', '行動派', 'ロマンチスト',
];

export const randomHobbies = [
  '料理', '映画鑑賞', '旅行', '音楽', 'スポーツ',
  'ガーデニング', 'DIY', 'キャンプ', '書道', '陶芸',
];

export const randomLocations = [
  '東京・渋谷', '大阪・難波', '福岡・天神', '札幌・すすきの',
  '名古屋・栄', '横浜・みなとみらい', '神戸・三宮', '仙台・国分町',
];

// ─── Character-specific response pools ───

export const characterResponses: Record<string, string[]> = {
  'char-yuki': [
    'あ、いいね！私も最近それ気になってたんだ〜。もっと教えて！',
    'えー、そうなんだ！面白い！下北沢にもそういうお店あるよ。今度紹介するね😊',
    'わかるわかる！私もそう思う！ところで、最近新しいカフェ見つけたんだけど、めっちゃおしゃれだったよ〜',
    'へぇ〜！すごいね！私、実はそれやったことないんだよね。どんな感じ？',
    'うんうん、それいいと思う！私の友達もそれハマってるって言ってた！',
  ],
  'char-kenta': [
    'なるほど、それは興味深いですね。技術的な観点から言うと、確かにそういう面はありますね。',
    'おお、いいですね。実は僕もそれについて調べたことがあるんですよ。結構奥が深いんです。',
    'そうですね、僕はエンジニアなのでそういう仕組みは気になりますね。もう少し詳しく話しましょうか。',
    'ちなみに、最近のアニメでもそういうテーマ扱ってるのがあって。見たことありますか？',
    'はい、その通りです。論理的に考えると、それが一番合理的だと思います。',
  ],
  'char-sakura': [
    'そうですね...ゆっくり考えてみると、それはとても素敵なことだと思います。',
    'あ、それは私も好きです。京都にいると、そういうことをよく感じます。',
    'うふふ、面白いですね。実は、日本文学にもそういうテーマがよく出てくるんですよ。',
    'なるほど...。鴨川のほとりを歩きながら、そういうことを考えるのもいいですね。',
    'そうなんですね。お茶を飲みながら、もっとお話ししたいです。',
  ],
};

export const defaultResponses = [
  'いい質問ですね！もう少し詳しく教えてもらえますか？',
  'なるほど、そうなんですね。私はこう思います...',
  'おもしろい！それについてもっと話しましょう！',
  'ありがとうございます。とても勉強になります！',
  'そうですね、日本ではよくそういうことがありますよ。',
];

// ─── Greeting messages per character ───

export const characterGreetings: Record<string, string> = {
  'char-yuki': 'はじめまして！ゆきだよ〜。よろしくね！何でも気軽に話しかけてね😊 最近どう？',
  'char-kenta': 'こんにちは、健太です。よろしくお願いします。何か話したいことがあれば、いつでもどうぞ。',
  'char-sakura': 'はじめまして、さくらです。お会いできて嬉しいです。ゆっくりお話ししましょうね。',
};

export const defaultGreeting = 'はじめまして！よろしくお願いします。何でも話しかけてくださいね！';

// ─── Mock user ───

export const mockUser: User = {
  id: 'user-1',
  email: 'demo@yuujin.app',
  username: 'デモユーザー',
  avatarEmoji: '🧑',
  level: 3,
  jpLevel: 'N4',
  onboardingCompleted: true,
};

// ─── In-memory state ───

let nextId = 100;
export function generateId(prefix: string): string {
  return `${prefix}-${nextId++}`;
}

export let characters: Character[] = [...presetCharacters];
export let friendships: Friendship[] = [];
export let conversations: Conversation[] = [];
export let messages: Record<string, Message[]> = {};

// ─── Mock Topics ───

export const mockTopics: Topic[] = [
  { id: 'topic-1', emoji: '🍜', text: '好きな日本の食べ物は何ですか？', category: 'food' },
  { id: 'topic-2', emoji: '🎌', text: '日本に行ったら何をしたい？', category: 'travel' },
  { id: 'topic-3', emoji: '🎵', text: '最近聴いている音楽は？', category: 'music' },
  { id: 'topic-4', emoji: '📺', text: 'おすすめのアニメを教えて！', category: 'anime' },
  { id: 'topic-5', emoji: '🏯', text: '日本の歴史で興味があることは？', category: 'history' },
  { id: 'topic-6', emoji: '🌸', text: '好きな季節とその理由は？', category: 'seasons' },
  { id: 'topic-7', emoji: '📖', text: '最近読んだ本はありますか？', category: 'books' },
  { id: 'topic-8', emoji: '🎮', text: '好きなゲームについて話そう！', category: 'games' },
  { id: 'topic-9', emoji: '🧳', text: '今まで行った中で一番好きな場所は？', category: 'travel' },
  { id: 'topic-10', emoji: '🍵', text: '日本のお茶文化について知ってる？', category: 'culture' },
];

// ─── News Article Details ───

export const mockNewsDetails: Record<string, NewsArticleDetail> = {
  'news-1': {
    ...mockNewsArticles[0],
    paragraphs: [
      {
        id: 'p1-1',
        text: '東京タワーは2023年12月23日に開業65周年を迎えた。',
        ruby: [['東京', 'とうきょう'], ['開業', 'かいぎょう'], ['周年', 'しゅうねん'], ['迎', 'むか']],
        translation: '东京塔于2023年12月23日迎来了开业65周年。',
        explanation: '「迎える」（むかえる）は「ある時期に到達する」という意味です。「開業」は事業を始めることを意味します。',
      },
      {
        id: 'p1-2',
        text: '記念イベントとして、特別なライトアップが行われている。毎晩、65周年を象徴する特別なカラーで東京の夜空を彩る。',
        ruby: [['記念', 'きねん'], ['特別', 'とくべつ'], ['行', 'おこな'], ['毎晩', 'まいばん'], ['象徴', 'しょうちょう'], ['夜空', 'よぞら'], ['彩', 'いろど']],
        translation: '作为纪念活动，正在举行特别的灯光秀。每晚用象征65周年的特别颜色点亮东京夜空。',
        explanation: '「彩る」（いろどる）は色をつけて美しくする、という意味の動詞です。「象徴する」は何かを代表する、表すという意味です。',
      },
      {
        id: 'p1-3',
        text: 'また、来場者向けのフォトコンテストも開催されており、SNSで多くの投稿が寄せられている。',
        ruby: [['来場者', 'らいじょうしゃ'], ['向', 'む'], ['開催', 'かいさい'], ['多', 'おお'], ['投稿', 'とうこう'], ['寄', 'よ']],
        translation: '此外，还举办了面向参观者的摄影比赛，社交媒体上收到了许多投稿。',
        explanation: '「寄せられている」は受身形で、投稿が集まっているという状態を表しています。「来場者」は会場に来る人のことです。',
      },
    ],
    comments: [
      { id: 'c1-1', articleId: 'news-1', characterId: 'char-yuki', characterName: '佐藤ゆき', characterEmoji: '👩', content: 'わー、65周年なんだ！今度行ってみたいな〜📸', createdAt: '2024-01-15T10:30:00Z', replies: [
        { id: 'c1-1-r1', articleId: 'news-1', characterId: 'char-sakura', characterName: '山本さくら', characterEmoji: '👧', content: '一緒に行きたい！夜のライトアップがきれいそう✨', createdAt: '2024-01-15T10:45:00Z' },
      ] },
      { id: 'c1-2', articleId: 'news-1', characterId: 'char-kenta', characterName: '田中健太', characterEmoji: '👨', content: '東京タワーのライトアップ、技術的に面白いんですよ。LEDの制御システムが最新なんです。', createdAt: '2024-01-15T11:00:00Z', replies: [] },
    ],
  },
  'news-2': {
    ...mockNewsArticles[1],
    paragraphs: [
      {
        id: 'p2-1',
        text: 'AI搭載の新しい日本語学習アプリ「NihonGo!」がリリースされた。',
        ruby: [['搭載', 'とうさい'], ['新', 'あたら'], ['日本語', 'にほんご'], ['学習', 'がくしゅう']],
        translation: '搭载AI的新日语学习应用"NihonGo!"已发布。',
        explanation: '「搭載」（とうさい）は機械やシステムに機能を組み込むことを意味します。',
      },
      {
        id: 'p2-2',
        text: 'このアプリはJLPT N3レベルの文法と語彙をゲーム感覚で学べるのが特徴だ。',
        ruby: [['文法', 'ぶんぽう'], ['語彙', 'ごい'], ['感覚', 'かんかく'], ['学', 'まな'], ['特徴', 'とくちょう']],
        translation: '该应用的特色是能以游戏般的感觉学习JLPT N3级别的语法和词汇。',
        explanation: '「ゲーム感覚で」は「ゲームのように楽しみながら」という意味です。「特徴」はその物の際立った特性のことです。',
      },
    ],
    comments: [
      { id: 'c2-1', articleId: 'news-2', characterId: 'char-sakura', characterName: '山本さくら', characterEmoji: '👧', content: '語学学習アプリ、最近すごく増えましたね。私も気になります。', createdAt: '2024-01-15T12:00:00Z' },
    ],
  },
  'news-3': {
    ...mockNewsArticles[2],
    paragraphs: [
      {
        id: 'p3-1',
        text: '京都の名所で紅葉が見頃を迎え、国内外から多くの観光客が訪れている。',
        ruby: [['京都', 'きょうと'], ['名所', 'めいしょ'], ['紅葉', 'こうよう'], ['見頃', 'みごろ'], ['迎', 'むか'], ['国内外', 'こくないがい'], ['多', 'おお'], ['観光客', 'かんこうきゃく'], ['訪', 'おとず']],
        translation: '京都的名胜处红叶正值观赏期，来自国内外的许多游客纷纷到访。',
        explanation: '「見頃」（みごろ）は花や紅葉などが一番美しい時期という意味です。「迎える」はその時期に到達することを表します。',
      },
      {
        id: 'p3-2',
        text: '特に清水寺や嵐山が人気で、週末は大変混雑している。',
        ruby: [['特', 'とく'], ['清水寺', 'きよみずでら'], ['嵐山', 'あらしやま'], ['人気', 'にんき'], ['週末', 'しゅうまつ'], ['大変', 'たいへん'], ['混雑', 'こんざつ']],
        translation: '特别是清水寺和岚山很受欢迎，周末非常拥挤。',
        explanation: '「大変」（たいへん）はここでは「非常に」という強調の副詞として使われています。「混雑」は人が多くて込み合っている状態です。',
      },
    ],
    comments: [
      { id: 'c3-1', articleId: 'news-3', characterId: 'char-sakura', characterName: '山本さくら', characterEmoji: '👧', content: '私の大学のすぐ近くです！出町柳から嵐山まで、電車で行けますよ。紅葉の季節は本当に美しいです。', createdAt: '2024-01-15T13:00:00Z' },
      { id: 'c3-2', articleId: 'news-3', characterId: 'char-yuki', characterName: '佐藤ゆき', characterEmoji: '👩', content: '京都の紅葉めっちゃきれい！今年こそ行きたい〜🍁', createdAt: '2024-01-15T14:00:00Z' },
    ],
  },
};

export function resetMockData() {
  characters = [...presetCharacters];
  friendships = [];
  conversations = [];
  messages = {};
}
