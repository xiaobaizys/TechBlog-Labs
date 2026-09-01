/**
 * A/B 测试系统
 *
 * 支持页面版本对比，帮助优化用户体验。
 * 功能：
 * - 创建实验（Experiment）
 * - 分配变体（Variant）
 * - 跟踪转化（Conversion）
 * - 统计分析（Statistics）
 */

// ============================================================
// 类型定义
// ============================================================

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: Variant[];
  targetPages: string[]; // 目标页面路径模式
  startDate: Date;
  endDate?: Date;
  trafficAllocation: number; // 0-100，参与实验的流量百分比
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number; // 权重，用于流量分配
  changes: VariantChange[]; // 该变体的修改内容
}

export interface VariantChange {
  type: "text" | "style" | "element" | "redirect";
  selector?: string; // CSS 选择器
  content?: string; // 新内容
  styles?: Record<string, string>; // 新样式
  redirectUrl?: string; // 重定向 URL
}

export interface ConversionEvent {
  experimentId: string;
  variantId: string;
  visitorId: string;
  event: string; // 事件名称，如 "click", "submit", "purchase"
  value?: number; // 事件值
  timestamp: Date;
}

export interface ExperimentStats {
  experimentId: string;
  variants: VariantStats[];
  totalVisitors: number;
  totalConversions: number;
  confidence: number; // 统计置信度
}

export interface VariantStats {
  variantId: string;
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  averageValue: number;
}

// ============================================================
// 内存存储（生产环境建议使用数据库）
// ============================================================

const experiments: Map<string, Experiment> = new Map();
const conversions: ConversionEvent[] = [];
const assignments: Map<string, Map<string, string>> = new Map(); // visitorId -> experimentId -> variantId

// ============================================================
// 示例实验
// ============================================================

const EXAMPLE_EXPERIMENT: Experiment = {
  id: "hero-section-test",
  name: "首页 Hero 区域测试",
  description: "测试不同的 Hero 区域文案对点击率的影响",
  status: "running",
  variants: [
    {
      id: "control",
      name: "控制组",
      description: "原始版本",
      weight: 50,
      changes: [],
    },
    {
      id: "variant-a",
      name: "变体 A",
      description: "新文案：简洁有力",
      weight: 50,
      changes: [
        {
          type: "text",
          selector: ".hero-title",
          content: "探索技术的无限可能",
        },
        {
          type: "text",
          selector: ".hero-subtitle",
          content: "分享前沿技术见解，记录成长历程",
        },
      ],
    },
  ],
  targetPages: ["/"],
  startDate: new Date(),
  trafficAllocation: 100,
};

// 初始化示例实验
experiments.set(EXAMPLE_EXPERIMENT.id, EXAMPLE_EXPERIMENT);

// ============================================================
// 核心函数
// ============================================================

/**
 * 获取或创建实验
 */
export function getExperiment(experimentId: string): Experiment | null {
  return experiments.get(experimentId) || null;
}

/**
 * 获取所有实验
 */
export function getAllExperiments(): Experiment[] {
  return Array.from(experiments.values());
}

/**
 * 创建新实验
 */
export function createExperiment(experiment: Experiment): Experiment {
  experiments.set(experiment.id, experiment);
  return experiment;
}

/**
 * 更新实验状态
 */
export function updateExperimentStatus(
  experimentId: string,
  status: Experiment["status"]
): boolean {
  const experiment = experiments.get(experimentId);
  if (experiment) {
    experiment.status = status;
    if (status === "completed") {
      experiment.endDate = new Date();
    }
    return true;
  }
  return false;
}

/**
 * 为访客分配变体
 *
 * 使用一致性哈希确保同一访客始终看到相同变体。
 */
export function assignVariant(
  experimentId: string,
  visitorId: string
): Variant | null {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "running") {
    return null;
  }

  // 检查是否已分配
  const visitorAssignments = assignments.get(visitorId);
  if (visitorAssignments?.has(experimentId)) {
    const variantId = visitorAssignments.get(experimentId)!;
    return experiment.variants.find((v) => v.id === variantId) || null;
  }

  // 检查流量分配
  if (Math.random() * 100 > experiment.trafficAllocation) {
    return null;
  }

  // 根据权重分配变体
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of experiment.variants) {
    random -= variant.weight;
    if (random <= 0) {
      // 记录分配
      if (!assignments.has(visitorId)) {
        assignments.set(visitorId, new Map());
      }
      assignments.get(visitorId)!.set(experimentId, variant.id);

      return variant;
    }
  }

  // 兜底：返回第一个变体
  return experiment.variants[0];
}

/**
 * 记录转化事件
 */
export function trackConversion(
  experimentId: string,
  variantId: string,
  visitorId: string,
  event: string,
  value?: number
): void {
  conversions.push({
    experimentId,
    variantId,
    visitorId,
    event,
    value,
    timestamp: new Date(),
  });
}

/**
 * 获取实验统计
 */
export function getExperimentStats(experimentId: string): ExperimentStats | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) return null;

  const experimentConversions = conversions.filter(
    (c) => c.experimentId === experimentId
  );

  // 计算每个变体的统计
  const variantStats: VariantStats[] = experiment.variants.map((variant) => {
    const variantAssignments = Array.from(assignments.values()).filter(
      (visitorMap) => visitorMap.get(experimentId) === variant.id
    );

    const visitors = variantAssignments.length;
    const variantConversions = experimentConversions.filter(
      (c) => c.variantId === variant.id
    );
    const conversionsCount = variantConversions.length;
    const conversionRate = visitors > 0 ? (conversionsCount / visitors) * 100 : 0;
    const totalValue = variantConversions.reduce((sum, c) => sum + (c.value || 0), 0);
    const averageValue = conversionsCount > 0 ? totalValue / conversionsCount : 0;

    return {
      variantId: variant.id,
      name: variant.name,
      visitors,
      conversions: conversionsCount,
      conversionRate,
      averageValue,
    };
  });

  // 计算总统计
  const totalVisitors = variantStats.reduce((sum, v) => sum + v.visitors, 0);
  const totalConversions = variantStats.reduce((sum, v) => sum + v.conversions, 0);

  // 计算统计置信度（简化版，使用卡方检验）
  const confidence = calculateConfidence(variantStats);

  return {
    experimentId,
    variants: variantStats,
    totalVisitors,
    totalConversions,
    confidence,
  };
}

/**
 * 计算统计置信度（简化版卡方检验）
 */
function calculateConfidence(variants: VariantStats[]): number {
  if (variants.length < 2) return 0;

  const totalVisitors = variants.reduce((sum, v) => sum + v.visitors, 0);
  const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);

  if (totalVisitors === 0 || totalConversions === 0) return 0;

  const expectedRate = totalConversions / totalVisitors;

  // 计算卡方值
  let chiSquare = 0;
  for (const variant of variants) {
    const expectedConversions = variant.visitors * expectedRate;
    const expectedNonConversions = variant.visitors * (1 - expectedRate);

    if (expectedConversions > 0 && expectedNonConversions > 0) {
      chiSquare +=
        Math.pow(variant.conversions - expectedConversions, 2) / expectedConversions +
        Math.pow(
          (variant.visitors - variant.conversions) - expectedNonConversions,
          2
        ) / expectedNonConversions;
    }
  }

  // 转换为置信度（简化）
  // 自由度 = variants.length - 1
  const df = variants.length - 1;

  // 使用简化的 p 值计算
  // 当 chiSquare > 3.841 时，p < 0.05（95% 置信度）
  // 当 chiSquare > 6.635 时，p < 0.01（99% 置信度）
  if (chiSquare > 6.635) return 99;
  if (chiSquare > 3.841) return 95;
  if (chiSquare > 2.706) return 90;
  if (chiSquare > 1.642) return 80;

  return Math.min(80, Math.max(0, chiSquare * 20));
}

/**
 * 检查页面是否参与实验
 */
export function getActiveExperimentsForPage(pagePath: string): Experiment[] {
  return Array.from(experiments.values()).filter((exp) => {
    if (exp.status !== "running") return false;

    return exp.targetPages.some((pattern) => {
      // 简单的路径匹配
      if (pattern === "*") return true;
      if (pattern.endsWith("*")) {
        return pagePath.startsWith(pattern.slice(0, -1));
      }
      return pagePath === pattern;
    });
  });
}

/**
 * 获取变体的修改内容
 */
export function getVariantChanges(
  experimentId: string,
  variantId: string
): VariantChange[] {
  const experiment = experiments.get(experimentId);
  if (!experiment) return [];

  const variant = experiment.variants.find((v) => v.id === variantId);
  return variant?.changes || [];
}
