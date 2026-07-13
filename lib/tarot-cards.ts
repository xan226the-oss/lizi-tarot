export type TarotOrientation = "upright" | "reversed";

export type TarotCard = {
  id: number;
  name_cn: string;
  name_en: string;
  arcana_type: "major" | "minor";
  suit: string | null;
  number: number | null;
  keywords: string[];
  meaning_upright: string;
  meaning_reversed: string;
};

const majorCards: Omit<TarotCard, "id" | "arcana_type" | "suit" | "number">[] = [
  {
    name_cn: "愚者",
    name_en: "The Fool",
    keywords: ["开始", "自由", "冒险"],
    meaning_upright: "新的道路正在打开，保持好奇，允许自己用更轻盈的方式迈出第一步。",
    meaning_reversed: "冲动会放大不确定性，今天适合先确认边界，再决定是否启程。"
  },
  {
    name_cn: "魔术师",
    name_en: "The Magician",
    keywords: ["行动", "资源", "显化"],
    meaning_upright: "你手上已有足够资源，关键是把想法落到一个清晰而具体的动作里。",
    meaning_reversed: "别急着证明能力，先辨认哪些承诺消耗过多，哪些工具真正可用。"
  },
  {
    name_cn: "女祭司",
    name_en: "The High Priestess",
    keywords: ["直觉", "静观", "秘密"],
    meaning_upright: "答案藏在安静处，减少外界噪音，你会听见更准确的内在提示。",
    meaning_reversed: "忽略直觉会让判断变钝，今天需要暂停迎合，回到自己的感受。"
  },
  {
    name_cn: "皇后",
    name_en: "The Empress",
    keywords: ["滋养", "丰盛", "创造"],
    meaning_upright: "把注意力放在滋养与创造上，温柔的持续投入会带来可见生长。",
    meaning_reversed: "过度付出会让能量失衡，先照顾自己的节奏，再照顾外部期待。"
  },
  {
    name_cn: "皇帝",
    name_en: "The Emperor",
    keywords: ["秩序", "责任", "边界"],
    meaning_upright: "建立清楚规则会让事情稳定推进，今天适合做决定和分配责任。",
    meaning_reversed: "僵硬控制可能制造阻力，试着用原则守边界，而不是用强硬压过变化。"
  },
  {
    name_cn: "教皇",
    name_en: "The Hierophant",
    keywords: ["传统", "学习", "信念"],
    meaning_upright: "向成熟经验借力，可靠的方法会帮你穿过暂时的混乱。",
    meaning_reversed: "并非所有旧规则都适合现在，今天可以温和地质疑惯性选择。"
  },
  {
    name_cn: "恋人",
    name_en: "The Lovers",
    keywords: ["选择", "关系", "一致"],
    meaning_upright: "重要选择需要与你真正珍视的东西对齐，关系也会因此更清楚。",
    meaning_reversed: "犹豫可能来自价值冲突，别只看表面选项，要看长期代价。"
  },
  {
    name_cn: "战车",
    name_en: "The Chariot",
    keywords: ["意志", "推进", "胜利"],
    meaning_upright: "保持方向感并集中力量，今天适合推进卡住已久的事务。",
    meaning_reversed: "用力过猛会偏离目标，先校准方向，再追求速度。"
  },
  {
    name_cn: "力量",
    name_en: "Strength",
    keywords: ["勇气", "柔韧", "自控"],
    meaning_upright: "真正的力量来自稳定的温柔，耐心会比对抗更有效。",
    meaning_reversed: "疲惫会让情绪变尖锐，今天需要保存体力，少把自己推到极限。"
  },
  {
    name_cn: "隐士",
    name_en: "The Hermit",
    keywords: ["独处", "洞察", "寻找"],
    meaning_upright: "给自己一点独处时间，慢下来会看见更深的线索。",
    meaning_reversed: "隔离太久会让问题变窄，适度求助能带来新的光。"
  },
  {
    name_cn: "命运之轮",
    name_en: "Wheel of Fortune",
    keywords: ["转机", "周期", "变化"],
    meaning_upright: "局势正在转动，顺势调整比固守计划更容易打开机会。",
    meaning_reversed: "变化未必按预期发生，今天先接受周期，再寻找可控的小动作。"
  },
  {
    name_cn: "正义",
    name_en: "Justice",
    keywords: ["公平", "判断", "因果"],
    meaning_upright: "清晰事实会带来清晰判断，今天适合核对承诺、规则与责任。",
    meaning_reversed: "偏见或信息不全会影响决定，先补齐证据，再给结论。"
  },
  {
    name_cn: "倒吊人",
    name_en: "The Hanged Man",
    keywords: ["暂停", "换位", "臣服"],
    meaning_upright: "暂停不是停滞，而是换角度的机会；先放松执念，答案会浮现。",
    meaning_reversed: "拖延可能伪装成等待，确认自己是真的观察，还是不愿行动。"
  },
  {
    name_cn: "死神",
    name_en: "Death",
    keywords: ["结束", "转化", "清理"],
    meaning_upright: "该结束的正在结束，腾出的空间会让新的生命力进入。",
    meaning_reversed: "抗拒改变会延长消耗，今天适合清理一个不再适合你的旧模式。"
  },
  {
    name_cn: "节制",
    name_en: "Temperance",
    keywords: ["调和", "疗愈", "平衡"],
    meaning_upright: "把不同节奏慢慢调匀，适度与耐心会让局面恢复流动。",
    meaning_reversed: "失衡来自过量或过急，今天适合减少刺激，回到温和中线。"
  },
  {
    name_cn: "恶魔",
    name_en: "The Devil",
    keywords: ["束缚", "欲望", "觉察"],
    meaning_upright: "看见束缚就是松动的开始，诚实面对欲望和依赖会带来力量。",
    meaning_reversed: "你正在脱离旧束缚，别被短暂反复否定已经发生的改变。"
  },
  {
    name_cn: "高塔",
    name_en: "The Tower",
    keywords: ["震动", "破除", "真相"],
    meaning_upright: "不稳固的结构会被看见，真相虽突然，却能清出更真实的道路。",
    meaning_reversed: "小裂缝需要被处理，别等到压力累积成不可忽视的爆发。"
  },
  {
    name_cn: "星星",
    name_en: "The Star",
    keywords: ["希望", "疗愈", "灵感"],
    meaning_upright: "希望正在恢复，今天适合相信长期愿景，并给自己一点温柔补给。",
    meaning_reversed: "信心暂时低落时，先照顾身体和基本节奏，光会慢慢回来。"
  },
  {
    name_cn: "月亮",
    name_en: "The Moon",
    keywords: ["梦境", "迷雾", "潜意识"],
    meaning_upright: "迷雾中不必急着定论，记录感受会比追逐答案更有帮助。",
    meaning_reversed: "隐藏的信息开始浮出水面，今天适合辨认真相和想象的边界。"
  },
  {
    name_cn: "太阳",
    name_en: "The Sun",
    keywords: ["明朗", "喜悦", "生命力"],
    meaning_upright: "事情会变得更明朗，坦率表达和积极行动会放大好运。",
    meaning_reversed: "快乐不需要完美条件，今天从一个简单而真实的满足开始。"
  },
  {
    name_cn: "审判",
    name_en: "Judgement",
    keywords: ["召唤", "复盘", "觉醒"],
    meaning_upright: "过去经验正在召唤你升级，诚实复盘会带来下一步方向。",
    meaning_reversed: "过度自责会遮住洞察，今天把复盘变成整理，而不是审判自己。"
  },
  {
    name_cn: "世界",
    name_en: "The World",
    keywords: ["完成", "整合", "展开"],
    meaning_upright: "一个阶段正在完整收束，认可自己的积累，然后准备展开新循环。",
    meaning_reversed: "完成感还差最后一块拼图，今天适合收尾，而不是急着开启更多。"
  }
];

const minorSuits = [
  {
    suit: "wands",
    cn: "权杖",
    en: "Wands",
    theme: "行动与热情",
    upright: "把热情落成行动，主动推进会让停滞的能量重新点燃。",
    reversed: "火候需要调整，过急或过散都会削弱原本的动力。"
  },
  {
    suit: "cups",
    cn: "圣杯",
    en: "Cups",
    theme: "情感与直觉",
    upright: "倾听情绪的流向，真诚回应会让关系和内在更柔软。",
    reversed: "情绪需要被安放，不必让一时波动替你做全部决定。"
  },
  {
    suit: "swords",
    cn: "宝剑",
    en: "Swords",
    theme: "思考与沟通",
    upright: "清晰表达和理性辨析会帮你切开问题的核心。",
    reversed: "念头可能过度拉扯，先放慢判断，避免被焦虑牵着走。"
  },
  {
    suit: "pentacles",
    cn: "星币",
    en: "Pentacles",
    theme: "现实与资源",
    upright: "关注现实资源和长期积累，稳定的小步会带来可靠回报。",
    reversed: "物质层面的压力需要排序，先处理最基础、最可控的一项。"
  }
] as const;

const ranks = [
  ["一", "Ace", "种子"],
  ["二", "Two", "权衡"],
  ["三", "Three", "协作"],
  ["四", "Four", "稳定"],
  ["五", "Five", "冲突"],
  ["六", "Six", "流动"],
  ["七", "Seven", "考验"],
  ["八", "Eight", "推进"],
  ["九", "Nine", "沉淀"],
  ["十", "Ten", "完成"],
  ["侍从", "Page", "讯息"],
  ["骑士", "Knight", "追寻"],
  ["皇后", "Queen", "滋养"],
  ["国王", "King", "掌握"]
] as const;

const minorCards: TarotCard[] = minorSuits.flatMap((suit, suitIndex) =>
  ranks.map(([rankCn, rankEn, rankTheme], rankIndex) => ({
    id: 23 + suitIndex * ranks.length + rankIndex,
    name_cn: `${suit.cn}${rankCn}`,
    name_en: `${rankEn} of ${suit.en}`,
    arcana_type: "minor" as const,
    suit: suit.suit,
    number: rankIndex + 1,
    keywords: [suit.theme, rankTheme],
    meaning_upright: `${rankTheme}正在通过${suit.theme}显现。${suit.upright}`,
    meaning_reversed: `${rankTheme}的课题暂时受阻。${suit.reversed}`
  }))
);

export const tarotCards: TarotCard[] = [
  ...majorCards.map((card, index) => ({
    ...card,
    id: index + 1,
    arcana_type: "major" as const,
    suit: null,
    number: index
  })),
  ...minorCards
];

export function getTarotCardById(id: number) {
  return tarotCards.find((card) => card.id === id) ?? null;
}
