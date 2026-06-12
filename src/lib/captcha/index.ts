/**
 * Captcha 子系统统一出口
 *
 *  - generator: 生成挑战 / 拼图形状
 *  - store    : Redis 存储
 *  - verifier : 校验逻辑 + 业务方法
 *  - types    : 共享类型
 */

export * from "./types";
export {
  generateChallenge,
  newChallengeId,
  svgToDataUrl,
  PIECE_SIZE,
} from "./generator";
export {
  saveChallenge,
  loadChallenge,
  deleteChallenge,
  consumeTicket,
  issueTicket,
  markLoggedIn,
  hasLoggedIn,
  CHALLENGE_TTL_SEC,
  TICKET_TTL_SEC,
  PWD_FAIL_THRESHOLD,
} from "./store";
export {
  verifySlider,
  isCaptchaRequired,
  getPwdFailStatus,
  onPwdFail,
  onPwdSuccess,
} from "./verifier";
