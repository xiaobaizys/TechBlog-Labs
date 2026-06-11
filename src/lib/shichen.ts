/**
 * 十二时辰数据（VitaLog 创新视觉语言）
 *
 *  - char       : 单字时辰（子丑寅卯辰巳午未申酉戌亥）
 *  - name       : 时辰名
 *  - range      : 对应现代时间段
 *  - tag        : 晨 / 午 / 暮 / 夜
 *  - quote      : 古文短注
 *  - body       : 原创文案
 *  - meta       : 节气 / 气温 / 心境
 *  - accent     : 当前主题下的强调色（CSS 变量名）
 *  - bg         : 滚动到此节时 body 的背景色（亮 / 暗双套）
 *  - deco       : SVG 装饰 key
 *  - href       : 此节对应的入口链接（落地的项目页 / 文章 / 生活 / 关于）
 */
export type ShichenMeta = {
  节气: string;
  气温: string;
  心境: string;
};

export type Shichen = {
  char: string;
  name: string;
  range: string;
  tag: "晨" | "午" | "暮" | "夜";
  quote: string;
  body: string;
  meta: ShichenMeta;
  accentVar: string; // e.g. "var(--c-dawn)"
  bg: { light: string; dark: string };
  deco: ShichenDeco;
  href: string; // 落地入口
  cta: string; // 行动按钮文字
  /** 时辰配图（资源在 public/image 下） */
  image?: string;
  /** 图片版式（仅在 image 存在时生效） */
  imagePos?: "left" | "right" | "bottom" | "wide";
};

export type ShichenDeco =
  | "moon"
  | "star"
  | "horizon"
  | "sunrise"
  | "steam"
  | "leaf"
  | "sun"
  | "wave"
  | "leaf-fall"
  | "sunset"
  | "lamp"
  | "moon-2";

export const SHICHEN: readonly Shichen[] = [
  {
    char: "子",
    name: "夜半",
    range: "23:00 — 01:00",
    tag: "夜",
    quote: "古称夜半，为十二辰之始。天地混沌，万物沉寂。",
    body: "一切已安静下来。窗外的风，也收了声。\n把这一天的最后一点体温，留在被窝里。",
    meta: { 节气: "冬至前后", 气温: "−2°C", 心境: "沉" },
    accentVar: "var(--c-night)",
    bg: { light: "#EEEAE2", dark: "#0F1219" },
    deco: "moon",
    href: "/blog",
    cta: "读一则晚安文",
    image: "/image/230239-177488295952b6.jpg",
    imagePos: "right",
  },
  {
    char: "丑",
    name: "鸡鸣",
    range: "01:00 — 03:00",
    tag: "夜",
    quote: "古称鸡鸣。荒鸡夜鸣，催人起耕。",
    body: "最深的夜里，偶有一声远远的鸡啼。\n那是世界在翻身，准备迎接新的一天。",
    meta: { 节气: "小寒", 气温: "−4°C", 心境: "守" },
    accentVar: "var(--c-night)",
    bg: { light: "#E6E8EA", dark: "#131826" },
    deco: "star",
    href: "/projects",
    cta: "看一些正在构建",
    image: "/image/220043-1775224843f816.jpg",
    imagePos: "left",
  },
  {
    char: "寅",
    name: "平旦",
    range: "03:00 — 05:00",
    tag: "晨",
    quote: "古称平旦。太阳将出未出，天地朦胧。",
    body: "天将明未明，是一日中最蓝的时刻。\n起身倒一杯温水，听水声，就是给自己的一封信。",
    meta: { 节气: "大寒", 气温: "−1°C", 心境: "醒" },
    accentVar: "var(--c-dawn)",
    bg: { light: "#EDE5DC", dark: "#1C1A2E" },
    deco: "horizon",
    href: "/blog",
    cta: "读一篇晨思",
    image: "/image/231637-1753197397e3a4.jpg",
    imagePos: "left",
  },
  {
    char: "卯",
    name: "日出",
    range: "05:00 — 07:00",
    tag: "晨",
    quote: "古称日出。晨光初露，万物苏醒。",
    body: "光一寸一寸地爬上窗台。\n开始有鸟叫，有风，有尘。\n把窗帘拉开一点点，\n让第一道光，先照到手背上。",
    meta: { 节气: "立春", 气温: "4°C", 心境: "启" },
    accentVar: "var(--c-dawn)",
    bg: { light: "#F2E6D6", dark: "#2A2533" },
    deco: "sunrise",
    href: "/life",
    cta: "看一眼生活",
    image: "/image/000754-17740228743e34.jpg",
    imagePos: "right",
  },
  {
    char: "辰",
    name: "食时",
    range: "07:00 — 09:00",
    tag: "晨",
    quote: "古称食时。朝食之际，宜静养。",
    body: "一碗热粥，一碟咸菜。\n吃饭这件事，本身就是一场小小的回归。",
    meta: { 节气: "雨水", 气温: "9°C", 心境: "食" },
    accentVar: "var(--c-dawn)",
    bg: { light: "#F4E3D0", dark: "#332B26" },
    deco: "steam",
    href: "/blog",
    cta: "读一篇短札",
  },
  {
    char: "巳",
    name: "隅中",
    range: "09:00 — 11:00",
    tag: "午",
    quote: "古称隅中。临近正午，阳气正盛。",
    body: "是日里最想做事的一段时间。\n不必贪多，只把一件事做好。\n剩下三件，午后再说。",
    meta: { 节气: "惊蛰", 气温: "14°C", 心境: "作" },
    accentVar: "var(--c-noon)",
    bg: { light: "#F5DFC1", dark: "#3D3324" },
    deco: "leaf",
    href: "/projects",
    cta: "看一个项目",
  },
  {
    char: "午",
    name: "日中",
    range: "11:00 — 13:00",
    tag: "午",
    quote: "古称日中。阳极而阴生。",
    body: "正午的太阳，是直直的、不带感情的。\n午饭后，闭眼十分钟，\n让眼睛也晒一晒太阳。",
    meta: { 节气: "春分", 气温: "18°C", 心境: "明" },
    accentVar: "var(--c-noon)",
    bg: { light: "#F6DCB6", dark: "#473B2A" },
    deco: "sun",
    href: "/blog",
    cta: "读一篇长文",
  },
  {
    char: "未",
    name: "日昳",
    range: "13:00 — 15:00",
    tag: "午",
    quote: "古称日昳。太阳偏西，光线始柔。",
    body: "下午是做事的好时候，\n但也要记得：走一走，站起来，\n看看窗外的云。",
    meta: { 节气: "清明", 气温: "20°C", 心境: "缓" },
    accentVar: "var(--c-noon)",
    bg: { light: "#F4D6B0", dark: "#4A3A2A" },
    deco: "wave",
    href: "/life",
    cta: "记一笔日常",
  },
  {
    char: "申",
    name: "晡时",
    range: "15:00 — 17:00",
    tag: "暮",
    quote: "古称晡时。夕阳将下，宜归家。",
    body: "光线开始发黄。\n走过那条熟悉的街，\n会发现：原来这棵银杏树，比昨天更黄了一点。",
    meta: { 节气: "谷雨", 气温: "21°C", 心境: "归" },
    accentVar: "var(--c-dusk)",
    bg: { light: "#EFD2B0", dark: "#3D2E22" },
    deco: "leaf-fall",
    href: "/projects",
    cta: "看今日成果",
  },
  {
    char: "酉",
    name: "日入",
    range: "17:00 — 19:00",
    tag: "暮",
    quote: "古称日入。太阳已入地平线。",
    body: "是日里最安静的一刻。\n家人坐定，灯火渐起。\n一锅热汤，一声招呼，\n就把一天的疲惫熨平了。",
    meta: { 节气: "立秋", 气温: "17°C", 心境: "暖" },
    accentVar: "var(--c-dusk)",
    bg: { light: "#E8C7AA", dark: "#332420" },
    deco: "sunset",
    href: "/life",
    cta: "回到生活",
  },
  {
    char: "戌",
    name: "黄昏",
    range: "19:00 — 21:00",
    tag: "夜",
    quote: "古称黄昏。一日将终，万物朦胧。",
    body: "灯下读书，最宜心远。\n读到喜欢的句子，就把它抄下来。\n字不必好看，\n但要慢。",
    meta: { 节气: "白露", 气温: "13°C", 心境: "思" },
    accentVar: "var(--c-night)",
    bg: { light: "#DCD0C9", dark: "#1F1C24" },
    deco: "lamp",
    href: "/blog",
    cta: "读一篇长评",
  },
  {
    char: "亥",
    name: "人定",
    range: "21:00 — 23:00",
    tag: "夜",
    quote: "古称人定。阴阳交合，宜安寝。",
    body: "把今天写完，把明天放下。\n关灯的时候，对自己说：\n辛苦了，明天见。",
    meta: { 节气: "秋分", 气温: "9°C", 心境: "息" },
    accentVar: "var(--c-night)",
    bg: { light: "#D8D0CC", dark: "#181622" },
    deco: "moon-2",
    href: "/about",
    cta: "关于我",
  },
] as const;

/**
 * 根据当前小时数返回对应时辰索引
 * 23→0, 1→2, 3→4 … 21→22
 */
export function currentShiIndex(hour: number = new Date().getHours()): number {
  return Math.floor((hour + 1) / 2) % 12;
}

/**
 * 每个时辰独有的极简 SVG 装饰。
 * 颜色由 currentColor 控制，可在父级覆盖。
 */
export const DECO_SVG: Record<ShichenDeco, string> = {
  moon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/><circle cx="58" cy="45" r="28" fill="currentColor" opacity="0.18"/><circle cx="38" cy="30" r="1" fill="currentColor" opacity="0.4"/><circle cx="70" cy="65" r="0.8" fill="currentColor" opacity="0.4"/></svg>`,
  star: `<svg viewBox="0 0 100 100"><g stroke="currentColor" stroke-width="0.3" fill="none" opacity="0.5"><circle cx="20" cy="30" r="0.5" fill="currentColor"/><circle cx="60" cy="20" r="0.4" fill="currentColor"/><circle cx="80" cy="50" r="0.6" fill="currentColor"/><circle cx="40" cy="70" r="0.4" fill="currentColor"/><circle cx="15" cy="80" r="0.5" fill="currentColor"/><circle cx="75" cy="85" r="0.4" fill="currentColor"/></g><path d="M30 50 L70 50 M50 30 L50 70" stroke="currentColor" stroke-width="0.2" opacity="0.3"/></svg>`,
  horizon: `<svg viewBox="0 0 100 100"><line x1="0" y1="60" x2="100" y2="60" stroke="currentColor" stroke-width="0.4" opacity="0.5"/><line x1="0" y1="62" x2="100" y2="62" stroke="currentColor" stroke-width="0.2" opacity="0.3"/><circle cx="50" cy="60" r="2" fill="currentColor" opacity="0.4"/><circle cx="50" cy="60" r="8" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.3"/></svg>`,
  sunrise: `<svg viewBox="0 0 100 100"><line x1="0" y1="70" x2="100" y2="70" stroke="currentColor" stroke-width="0.4"/><path d="M20 70 A 30 30 0 0 1 80 70" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/><line x1="50" y1="70" x2="50" y2="40" stroke="currentColor" stroke-width="0.3" opacity="0.4"/><line x1="35" y1="60" x2="40" y2="55" stroke="currentColor" stroke-width="0.3" opacity="0.3"/><line x1="65" y1="60" x2="60" y2="55" stroke="currentColor" stroke-width="0.3" opacity="0.3"/><line x1="22" y1="50" x2="30" y2="52" stroke="currentColor" stroke-width="0.3" opacity="0.3"/><line x1="78" y1="50" x2="70" y2="52" stroke="currentColor" stroke-width="0.3" opacity="0.3"/></svg>`,
  steam: `<svg viewBox="0 0 100 100"><path d="M30 70 Q 30 50 40 50 Q 40 30 30 30" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.5"/><path d="M50 70 Q 50 50 60 50 Q 60 30 50 30" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.5"/><path d="M70 70 Q 70 50 80 50 Q 80 30 70 30" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.5"/><line x1="20" y1="80" x2="80" y2="80" stroke="currentColor" stroke-width="0.3" opacity="0.4"/></svg>`,
  leaf: `<svg viewBox="0 0 100 100"><path d="M30 70 Q 30 30 70 30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/><path d="M35 65 Q 50 50 65 35" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.4"/><path d="M30 70 L 70 70" stroke="currentColor" stroke-width="0.3" opacity="0.4"/></svg>`,
  sun: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6"/><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.3"/><line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" stroke-width="0.4"/><line x1="50" y1="80" x2="50" y2="90" stroke="currentColor" stroke-width="0.4"/><line x1="10" y1="50" x2="20" y2="50" stroke="currentColor" stroke-width="0.4"/><line x1="80" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="0.4"/><line x1="22" y1="22" x2="29" y2="29" stroke="currentColor" stroke-width="0.4"/><line x1="71" y1="71" x2="78" y2="78" stroke="currentColor" stroke-width="0.4"/><line x1="78" y1="22" x2="71" y2="29" stroke="currentColor" stroke-width="0.4"/><line x1="29" y1="71" x2="22" y2="78" stroke="currentColor" stroke-width="0.4"/></svg>`,
  wave: `<svg viewBox="0 0 100 100"><path d="M0 50 Q 25 40 50 50 T 100 50" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.5"/><path d="M0 60 Q 25 50 50 60 T 100 60" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.4"/><path d="M0 70 Q 25 60 50 70 T 100 70" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.3"/></svg>`,
  "leaf-fall": `<svg viewBox="0 0 100 100">
    <!-- 远树剪影 -->
    <g fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.35">
      <path d="M5 85 Q 5 60 18 50 Q 14 70 22 85" />
      <path d="M85 85 Q 88 65 95 55 Q 90 75 96 85" />
    </g>
    <!-- 飘落叶片：多片不同位置、大小、角度 -->
    <g fill="none" stroke="currentColor" stroke-width="0.35" opacity="0.55">
      <path d="M30 30 Q 35 24 41 28 Q 38 36 30 30 Z" />
      <path d="M58 50 Q 64 45 70 49 Q 67 57 58 50 Z" />
      <path d="M20 70 Q 25 64 31 68 Q 28 76 20 70 Z" />
      <path d="M75 75 Q 80 70 86 74 Q 83 82 75 75 Z" />
      <path d="M45 14 Q 50 10 55 13 Q 52 19 45 14 Z" />
      <path d="M88 35 Q 92 32 96 35 Q 93 40 88 35 Z" />
      <path d="M10 50 Q 14 46 19 49 Q 16 54 10 50 Z" />
      <path d="M50 60 Q 55 56 60 60 Q 56 65 50 60 Z" />
    </g>
    <!-- 风线 -->
    <g fill="none" stroke="currentColor" stroke-width="0.2" opacity="0.3">
      <path d="M0 22 Q 25 19 50 22" />
      <path d="M30 65 Q 55 62 80 65" stroke-dasharray="2 2" />
    </g>
    <!-- 地面 -->
    <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" stroke-width="0.3" opacity="0.4" />
    <line x1="10" y1="92" x2="90" y2="92" stroke="currentColor" stroke-width="0.15" opacity="0.25" stroke-dasharray="1 3" />
  </svg>`,
  sunset: `<svg viewBox="0 0 100 100">
    <!-- 远山 -->
    <path d="M0 60 L 20 50 L 35 55 L 50 45 L 70 55 L 100 50 L 100 62 L 0 62 Z" fill="currentColor" opacity="0.08" />
    <!-- 太阳：落到地平线下 -->
    <path d="M20 60 A 30 30 0 0 0 80 60" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.6" />
    <circle cx="50" cy="60" r="2" fill="currentColor" opacity="0.5" />
    <!-- 地平线 -->
    <line x1="0" y1="60" x2="100" y2="60" stroke="currentColor" stroke-width="0.4" />
    <line x1="0" y1="62" x2="100" y2="62" stroke="currentColor" stroke-width="0.15" opacity="0.3" />
    <!-- 余晖光线 -->
    <g stroke="currentColor" stroke-width="0.3" opacity="0.25">
      <line x1="50" y1="60" x2="50" y2="32" />
      <line x1="35" y1="50" x2="40" y2="45" />
      <line x1="65" y1="50" x2="60" y2="45" />
      <line x1="22" y1="40" x2="30" y2="42" />
      <line x1="78" y1="40" x2="70" y2="42" />
      <line x1="15" y1="30" x2="22" y2="34" />
      <line x1="85" y1="30" x2="78" y2="34" />
    </g>
    <!-- 水中倒影：波纹 -->
    <g fill="none" stroke="currentColor" stroke-width="0.2" opacity="0.4">
      <path d="M28 70 Q 50 67 72 70" />
      <path d="M32 76 Q 50 73 68 76" />
      <path d="M38 82 Q 50 80 62 82" />
      <path d="M42 88 Q 50 86 58 88" />
    </g>
  </svg>`,
  lamp: `<svg viewBox="0 0 100 100">
    <!-- 背景星光 -->
    <g fill="currentColor" opacity="0.45">
      <circle cx="20" cy="15" r="0.5" />
      <circle cx="80" cy="20" r="0.4" />
      <circle cx="15" cy="40" r="0.3" />
      <circle cx="85" cy="45" r="0.4" />
      <circle cx="25" cy="80" r="0.3" />
      <circle cx="90" cy="85" r="0.35" />
    </g>
    <!-- 灯光：多层同心圆（晕） -->
    <circle cx="50" cy="60" r="44" fill="none" stroke="currentColor" stroke-width="0.15" opacity="0.1" />
    <circle cx="50" cy="60" r="36" fill="none" stroke="currentColor" stroke-width="0.2" opacity="0.18" />
    <circle cx="50" cy="60" r="28" fill="none" stroke="currentColor" stroke-width="0.25" opacity="0.28" />
    <circle cx="50" cy="60" r="20" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.4" />
    <!-- 灯笼体 -->
    <ellipse cx="50" cy="60" rx="10" ry="13" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.65" />
    <ellipse cx="50" cy="60" rx="10" ry="13" fill="currentColor" opacity="0.15" />
    <!-- 灯笼骨架 -->
    <line x1="50" y1="48" x2="50" y2="72" stroke="currentColor" stroke-width="0.3" opacity="0.45" />
    <line x1="41" y1="60" x2="59" y2="60" stroke="currentColor" stroke-width="0.3" opacity="0.45" />
    <path d="M44 55 Q 50 53 56 55" fill="none" stroke="currentColor" stroke-width="0.25" opacity="0.4" />
    <path d="M44 65 Q 50 67 56 65" fill="none" stroke="currentColor" stroke-width="0.25" opacity="0.4" />
    <!-- 顶部挂钩 -->
    <line x1="50" y1="10" x2="50" y2="47" stroke="currentColor" stroke-width="0.35" opacity="0.45" />
    <path d="M46 10 Q 50 5 54 10" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.5" />
    <!-- 灯笼底部流苏 -->
    <line x1="50" y1="73" x2="50" y2="80" stroke="currentColor" stroke-width="0.3" opacity="0.45" />
    <path d="M47 80 L 50 84 L 53 80" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.4" />
  </svg>`,
  "moon-2": `<svg viewBox="0 0 100 100">
    <!-- 大圆月 -->
    <circle cx="45" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.5" />
    <circle cx="45" cy="50" r="30" fill="currentColor" opacity="0.06" />
    <!-- 月相阴影 -->
    <circle cx="55" cy="42" r="25" fill="currentColor" opacity="0.18" />
    <!-- 月光晕 -->
    <circle cx="45" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="0.2" opacity="0.15" />
    <circle cx="45" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="0.15" opacity="0.08" />
    <!-- 星座星星 -->
    <g fill="currentColor" opacity="0.5">
      <circle cx="20" cy="20" r="0.5" />
      <circle cx="80" cy="25" r="0.4" />
      <circle cx="85" cy="80" r="0.5" />
      <circle cx="15" cy="75" r="0.3" />
      <circle cx="90" cy="50" r="0.3" />
      <circle cx="10" cy="45" r="0.35" />
      <circle cx="78" cy="12" r="0.3" />
      <circle cx="32" cy="85" r="0.3" />
    </g>
    <!-- 流星 -->
    <line x1="65" y1="20" x2="80" y2="35" stroke="currentColor" stroke-width="0.3" opacity="0.55" />
    <circle cx="80" cy="35" r="0.6" fill="currentColor" opacity="0.65" />
  </svg>`,
};
