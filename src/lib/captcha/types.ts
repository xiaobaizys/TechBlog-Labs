/**
 * 滑块验证码类型定义
 *
 * 整个 captcha 子系统的"合同"：
 *  - challenge：服务端下发的挑战（缺口位置、图片、过期时间）
 *  - ticket    ：通过验证后签发的"已通过"凭证（一次性）
 *  - verifyReq ：前端提交验证时的请求体
 */

/** 拼图缺口（puzzle piece）的几何信息 */
export type PuzzlePiece = {
  /** 在原图中的 X 坐标（缺口中心点） */
  x: number;
  /** 在原图中的 Y 坐标（缺口中心点） */
  y: number;
  /** 拼图块边长（正方形），单位 px */
  size: number;
  /** 用于绘制缺口 / 滑块的 SVG path d 属性 */
  pathD: string;
};

/** 服务端下发的挑战（GET challenge 接口的响应） */
export type CaptchaChallenge = {
  /** 挑战 ID（32 字节十六进制），校验时回传 */
  challengeId: string;
  /** 背景图（DataURL，image/svg+xml），前端直接 <img src> 渲染 */
  backgroundDataUrl: string;
  /** 滑块块图（DataURL，image/svg+xml），含拼图把手 */
  sliderDataUrl: string;
  /** 缺口在背景图中的 X 坐标（中心点） */
  targetX: number;
  /** 缺口在背景图中的 Y 坐标（中心点） */
  targetY: number;
  /** 拼图块边长（与 sliderDataUrl 等比一致），方便前端计算命中区域 */
  pieceSize: number;
  /** 背景图尺寸（宽 x 高），前端 <img> 需保持一致 */
  bgWidth: number;
  bgHeight: number;
  /** 挑战过期时间（Unix 毫秒时间戳） */
  expiresAt: number;
};

/** 前端提交验证时的请求体 */
export type CaptchaVerifyRequest = {
  challengeId: string;
  /** 滑块最终停下的 X 坐标（与 targetX 同坐标系，已扣除外边距） */
  finalX: number;
  /** 滑块最终 Y 坐标（可选，Y 方向允许一定浮动） */
  finalY?: number;
  /** 拖拽轨迹（采样点），用于行为分析；>= 8 个点 */
  track: Array<{ x: number; y: number; t: number }>;
};

/** 验证结果 */
export type CaptchaVerifyResult =
  | { success: true; ticket: string; expiresIn: number }
  | { success: false; reason: "expired" | "mismatch" | "behavior" | "missing" | "rate-limit" };

/** 密码错误计数查询结果 */
export type PwdFailStatus = {
  /** 当前错误次数（0~N） */
  count: number;
  /** 距离被要求滑块的阈值（>= threshold 即触发） */
  threshold: number;
  /** 是否需要滑块 */
  required: boolean;
};
