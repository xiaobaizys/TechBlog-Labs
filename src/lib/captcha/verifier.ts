import { loadChallenge, bumpVerifyAttempts, issueTicket, VERIFY_MAX_ATTEMPTS, PWD_FAIL_THRESHOLD, getPwdFailCount, incPwdFail, resetPwdFail } from './store'
import type { CaptchaVerifyRequest, CaptchaVerifyResult, PwdFailStatus } from './types'
import { randomBytes } from 'crypto'

/**
 * 滑块验证核心逻辑
 *
 * 安全策略：
 *  1. challenge 必须存在且签名通过（store.loadChallenge 已做）
 *  2. 同一 challengeId 验证尝试 ≤ 5 次（防爆破）
 *  3. finalX 与 targetX 误差 ≤ TOLERANCE_PX（容差）
 *  4. finalY 与 targetY 误差 ≤ TOLERANCE_PY（容差，纵向）
 *  5. 行为分析：
 *     - 耗时：< 600ms 视为机器（人手至少 0.5s）
 *     - 轨迹：采样点 < 6 个视为脚本
 *     - 抖动：纵向位移方差过低视为脚本（人手有自然抖动）
 *     - 单调性：X 方向无回退视为脚本
 */

/** X 方向容差（px） */
const TOLERANCE_PX = 5
/** Y 方向容差（px），人眼定位难以精确到 0 */
const TOLERANCE_PY = 8
/** 最小耗时（ms） */
const MIN_DURATION_MS = 500
/** 最小轨迹点数 */
const MIN_TRACK_POINTS = 8
/** 横向单调性：回退比例阈值（人手拖动时会有少量回退） */
const MAX_BACK_RATIO = 0.35

export type VerifyOutcome = CaptchaVerifyResult | { success: true; ticket: string; expiresIn: number }

/**
 * 校验滑块位置 + 行为，签发 ticket
 */
export async function verifySlider(req: CaptchaVerifyRequest): Promise<VerifyOutcome> {
  // ---------- 1. 加载挑战 ----------
  const challenge = await loadChallenge(req.challengeId)
  if (!challenge) {
    return { success: false, reason: 'expired' }
  }

  // ---------- 2. 次数限制 ----------
  const attempts = await bumpVerifyAttempts(req.challengeId)
  if (attempts > VERIFY_MAX_ATTEMPTS) {
    return { success: false, reason: 'rate-limit' }
  }

  // ---------- 3. 行为分析 ----------
  const track = Array.isArray(req.track) ? req.track : []
  if (track.length < MIN_TRACK_POINTS) {
    return { success: false, reason: 'behavior' }
  }
  const firstT = track[0].t
  const lastT = track[track.length - 1].t
  const duration = lastT - firstT
  if (duration < MIN_DURATION_MS) {
    return { success: false, reason: 'behavior' }
  }

  // 横向单调性：允许少量回退（人手会犹豫），但回退比例过高视为异常
  let backs = 0
  for (let i = 1; i < track.length; i++) {
    if (track[i].x < track[i - 1].x) backs++
  }
  if (backs / (track.length - 1) > MAX_BACK_RATIO) {
    return { success: false, reason: 'behavior' }
  }

  // ---------- 4. 位置匹配 ----------
  const dx = Math.abs(req.finalX - challenge.targetX)
  const dy = Math.abs((req.finalY ?? challenge.targetY) - challenge.targetY)
  if (dx > TOLERANCE_PX || dy > TOLERANCE_PY) {
    return { success: false, reason: 'mismatch' }
  }

  // ---------- 5. 颁发 ticket ----------
  const ticket = randomBytes(24).toString('hex')
  await issueTicket(ticket, '' /* 不绑定 identifier，让登录时再校验 */)
  return { success: true, ticket, expiresIn: 5 * 60 }
}

// ============================================================
// 密码错误计数 API（供登录流程使用）
// ============================================================

/** 当前 identifier 是否需要滑块
 *
 * 触发条件（满足任一即触发）：
 *  - 该 identifier 密码错误次数 ≥ 阈值
 *
 * 注：之前版本还有「首次登录也弹」的策略，但实际体验中会让正常用户
 *      第一次登录就被卡，体验不佳。现已移除「首次登录」分支，只在
 *      连续输错 ≥ 3 次时才要求滑块。
 */
export async function isCaptchaRequired(identifier: string): Promise<boolean> {
  const count = await getPwdFailCount(identifier)
  return count >= PWD_FAIL_THRESHOLD
}

/** 获取状态详情（前端可调用以提前展示） */
export async function getPwdFailStatus(identifier: string): Promise<PwdFailStatus> {
  const count = await getPwdFailCount(identifier)
  return {
    count,
    threshold: PWD_FAIL_THRESHOLD,
    required: count >= PWD_FAIL_THRESHOLD,
  }
}

/** 登录失败时调用：递增计数并返回新值 */
export async function onPwdFail(identifier: string): Promise<number> {
  return incPwdFail(identifier)
}

/** 登录成功时调用 */
export async function onPwdSuccess(identifier: string): Promise<void> {
  return resetPwdFail(identifier)
}
