import type {
  NormalSpread,
  NormalSpreadId,
  NormalSpreadSlot
} from "./types.ts";

function slot(
  id: string,
  label: string,
  description: string,
  x: number,
  y: number
): NormalSpreadSlot {
  return { id, label, description, x, y };
}

function circleSlots(
  definitions: Array<[string, string, string]>,
  radiusX = 34,
  radiusY = 38
) {
  return definitions.map(([id, label, description], index) => {
    const angle = -Math.PI / 2 + (index / definitions.length) * Math.PI * 2;
    return slot(
      id,
      label,
      description,
      Math.round((50 + Math.cos(angle) * radiusX) * 100) / 100,
      Math.round((50 + Math.sin(angle) * radiusY) * 100) / 100
    );
  });
}

export const NORMAL_SPREADS: NormalSpread[] = [
  {
    id: "single-guidance",
    name: "单牌指引",
    cardCount: 1,
    useFor: "快速确认一个明确问题的核心提示",
    sigil: "single",
    slots: [slot("guidance", "核心指引", "此刻最值得看见的核心信息", 50, 50)]
  },
  {
    id: "three-time",
    name: "三牌时光",
    cardCount: 3,
    useFor: "梳理一件事从过去到未来的发展脉络",
    sigil: "arc",
    slots: [
      slot("past", "过去", "形成当前局面的背景", 20, 60),
      slot("present", "现在", "此刻正在发生的核心", 50, 34),
      slot("future", "未来", "按当前趋势可能抵达的方向", 80, 60)
    ]
  },
  {
    id: "four-seasons",
    name: "四季牌阵",
    cardCount: 4,
    useFor: "观察项目、关系或个人周期的四个阶段",
    sigil: "circle",
    slots: circleSlots([
      ["germination", "萌芽", "最初的动机与种子"],
      ["bloom", "盛放", "能量最充分的表达"],
      ["harvest", "收获", "可以带走的成果"],
      ["rest", "沉潜", "需要休整与保留的部分"]
    ])
  },
  {
    id: "relationship",
    name: "关系牌阵",
    cardCount: 5,
    useFor: "理解双方状态、互动阻力与关系走向",
    sigil: "circle",
    slots: circleSlots([
      ["self", "你的状态", "你在关系中的真实位置"],
      ["other", "对方状态", "对方在关系中的真实位置"],
      ["core", "关系核心", "把双方连接起来的主题"],
      ["obstacle", "主要阻力", "当前最需要看清的张力"],
      ["direction", "发展方向", "按当前互动可能形成的走向"]
    ])
  },
  {
    id: "decision",
    name: "决策牌阵",
    cardCount: 5,
    useFor: "比较两个明确选项的机会、代价与判断原则",
    sigil: "fork",
    slots: [
      slot("a-opportunity", "A 的机会", "选择 A 可能打开的空间", 24, 28),
      slot("a-cost", "A 的代价", "选择 A 需要承担的成本", 18, 72),
      slot("principle", "判断原则", "真正应该用来判断的标准", 50, 50),
      slot("b-opportunity", "B 的机会", "选择 B 可能打开的空间", 76, 28),
      slot("b-cost", "B 的代价", "选择 B 需要承担的成本", 82, 72)
    ]
  },
  {
    id: "cross",
    name: "十字牌阵",
    cardCount: 5,
    useFor: "拆解一个有阻力的问题并寻找行动方向",
    sigil: "cross",
    slots: [
      slot("core", "问题核心", "真正需要处理的核心", 50, 50),
      slot("obstacle", "主要阻碍", "让局面难以推进的力量", 50, 18),
      slot("resource", "可用资源", "已经拥有或可以借用的支持", 18, 50),
      slot("advice", "行动建议", "下一步更有效的做法", 82, 50),
      slot("outcome", "可能结果", "延续当前选择可能形成的结果", 50, 82)
    ]
  },
  {
    id: "horseshoe",
    name: "马蹄铁阵",
    cardCount: 7,
    useFor: "追踪复杂事件的变化、外力与可能结果",
    sigil: "arc",
    slots: [
      slot("past", "过去", "事件的来处", 10, 70),
      slot("present", "现在", "当下关键状态", 22, 42),
      slot("hidden", "隐性影响", "尚未被充分看见的因素", 36, 24),
      slot("obstacle", "主要阻碍", "当前最大的阻力", 50, 18),
      slot("environment", "外部环境", "他人与环境带来的影响", 64, 24),
      slot("advice", "建议", "更值得采取的方向", 78, 42),
      slot("outcome", "可能结果", "按当前趋势发展的结果", 90, 70)
    ]
  },
  {
    id: "moon-phase",
    name: "月相牌阵",
    cardCount: 8,
    useFor: "审视情绪周期、习惯改变与阶段性成长",
    sigil: "circle",
    slots: circleSlots([
      ["intention", "意图", "这一周期真正想启动的事"],
      ["germination", "萌芽", "正在形成的新线索"],
      ["action", "行动", "需要投入的实际动作"],
      ["manifestation", "显化", "已经开始变得可见的成果"],
      ["awareness", "看见", "需要诚实面对的信息"],
      ["release", "释放", "不再适合继续携带的部分"],
      ["integration", "整合", "需要重新放回生活的经验"],
      ["renewal", "更新", "下个周期可以带走的方向"]
    ])
  },
  {
    id: "soul-exploration",
    name: "灵魂探索",
    cardCount: 9,
    useFor: "深入理解内在模式、阴影与成长课题",
    sigil: "grid",
    slots: [
      slot("persona", "外在人格", "你向外呈现的样子", 20, 22),
      slot("desire", "核心渴望", "内心真正想靠近的事", 50, 22),
      slot("shadow", "阴影", "容易被忽略或压抑的部分", 80, 22),
      slot("fear", "恐惧", "限制行动的深层担忧", 20, 50),
      slot("gift", "天赋", "可以信任和发展的力量", 50, 50),
      slot("pattern", "重复模式", "反复出现的选择与反应", 80, 50),
      slot("lesson", "当前课题", "这一阶段正在学习的事", 20, 78),
      slot("integration", "整合方向", "让内外重新一致的方法", 50, 78),
      slot("next", "下一步", "可以立刻开始的行动", 80, 78)
    ]
  },
  {
    id: "celtic-cross",
    name: "凯尔特十字",
    cardCount: 10,
    useFor: "多角度拆解长期且相互牵连的复杂问题",
    sigil: "cross",
    slots: [
      slot("present", "现状", "问题当前的核心状态", 38, 50),
      slot("challenge", "挑战", "横在核心之上的挑战", 38, 39),
      slot("foundation", "根基", "局面深处的原因", 38, 80),
      slot("past", "过去", "正在退出的影响", 12, 50),
      slot("possibility", "可能性", "意识层面的目标与可能", 38, 18),
      slot("near-future", "近期发展", "即将进入局面的变化", 64, 50),
      slot("self", "自我", "你在问题中的位置", 84, 82),
      slot("environment", "环境", "他人与外界的影响", 84, 62),
      slot("hopes-fears", "希望与恐惧", "期待与担忧交织的地方", 84, 42),
      slot("outcome", "可能结果", "按当前选择可能形成的方向", 84, 22)
    ]
  },
  {
    id: "annual-zodiac",
    name: "年度十二宫",
    cardCount: 12,
    useFor: "观察未来一年十二个生活领域的主题",
    sigil: "circle",
    slots: circleSlots([
      ["self", "自我", "身份、身体与个人方向"],
      ["resources", "资源", "金钱、价值与可支配资源"],
      ["communication", "沟通", "学习、表达与近距离连接"],
      ["home", "家庭", "家庭、根基与内在安全感"],
      ["creativity", "创造", "创造力、快乐与自我表达"],
      ["daily-health", "日常与健康", "日常秩序、服务与身体照顾"],
      ["relationship", "关系", "伴侣、合作与一对一关系"],
      ["transformation", "共享与转化", "共享资源、亲密与深层改变"],
      ["belief-travel", "信念与远行", "信念、远行与视野扩展"],
      ["career", "事业", "事业方向、责任与社会位置"],
      ["community", "社群", "朋友、群体与长期愿景"],
      ["subconscious", "潜意识", "休息、梦境与未言明的部分"]
    ])
  },
  {
    id: "career-growth",
    name: "事业发展",
    cardCount: 6,
    useFor: "梳理职业现状、优势、阻力与下一步行动",
    sigil: "rise",
    slots: [
      slot("present", "职业现状", "当前职业位置与状态", 12, 78),
      slot("strength", "核心优势", "最值得继续发挥的能力", 28, 62),
      slot("blind-spot", "盲点", "容易忽视的限制", 42, 68),
      slot("opportunity", "机会", "正在出现的可用空间", 58, 44),
      slot("obstacle", "阻力", "需要正面处理的挑战", 72, 34),
      slot("next", "下一步行动", "最实际的推进方式", 88, 16)
    ]
  }
];

export function getNormalSpread(id: string | null | undefined) {
  return NORMAL_SPREADS.find((spread) => spread.id === id) ?? null;
}

export function isNormalSpreadId(value: string): value is NormalSpreadId {
  return NORMAL_SPREADS.some((spread) => spread.id === value);
}
