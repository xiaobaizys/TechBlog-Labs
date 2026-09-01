/**
 * 通知服务
 *
 * 支持多种通知渠道：
 * - 邮件（使用 Nodemailer）
 * - Slack（使用 Webhook）
 * - 企业微信（使用 Webhook）
 * - 控制台日志（开发环境）
 */

// ============================================================
// 类型定义
// ============================================================

export interface NotificationConfig {
  email?: EmailConfig;
  slack?: SlackConfig;
  wecom?: WeComConfig;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
}

export interface WeComConfig {
  webhookUrl: string;
}

export interface NotificationMessage {
  title: string;
  body: string;
  level: "info" | "warning" | "error";
  timestamp?: Date;
  metadata?: Record<string, any>;
}

// ============================================================
// 默认配置（从环境变量读取）
// ============================================================

function getConfig(): NotificationConfig {
  const config: NotificationConfig = {};

  // 邮件配置
  if (process.env.SMTP_HOST) {
    config.email = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
      to: (process.env.ALERT_EMAIL_TO || "").split(",").filter(Boolean),
    };
  }

  // Slack 配置
  if (process.env.SLACK_WEBHOOK_URL) {
    config.slack = {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || "#alerts",
      username: process.env.SLACK_USERNAME || "VitaLog Bot",
    };
  }

  // 企业微信配置
  if (process.env.WECOM_WEBHOOK_URL) {
    config.wecom = {
      webhookUrl: process.env.WECOM_WEBHOOK_URL,
    };
  }

  return config;
}

// ============================================================
// 通知发送函数
// ============================================================

/**
 * 发送邮件通知
 */
async function sendEmail(
  config: EmailConfig,
  message: NotificationMessage
): Promise<boolean> {
  try {
    // 动态导入 nodemailer（可选依赖）
    let nodemailer: any;
    try {
      // @ts-ignore - nodemailer 是可选依赖
      nodemailer = await import("nodemailer");
    } catch {
      console.warn("[Notification] nodemailer not installed, skipping email");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    const levelEmoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "🚨",
    };

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${message.level === "error" ? "#ef4444" : message.level === "warning" ? "#f59e0b" : "#3b82f6"}">
          ${levelEmoji[message.level]} ${message.title}
        </h2>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <pre style="margin: 0; white-space: pre-wrap;">${message.body}</pre>
        </div>
        ${message.metadata ? `
          <div style="margin-top: 16px;">
            <h3>详细信息</h3>
            <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 12px;">${JSON.stringify(message.metadata, null, 2)}</pre>
          </div>
        ` : ""}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #666; font-size: 12px;">
          发送时间: ${(message.timestamp || new Date()).toLocaleString("zh-CN")}
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: config.from,
      to: config.to.join(", "),
      subject: `[${message.level.toUpperCase()}] ${message.title}`,
      html,
    });

    console.log("[Notification] Email sent successfully");
    return true;
  } catch (error) {
    console.error("[Notification] Email failed:", error);
    return false;
  }
}

/**
 * 发送 Slack 通知
 */
async function sendSlack(
  config: SlackConfig,
  message: NotificationMessage
): Promise<boolean> {
  try {
    const levelColor = {
      info: "#3b82f6",
      warning: "#f59e0b",
      error: "#ef4444",
    };

    const payload = {
      channel: config.channel,
      username: config.username,
      attachments: [
        {
          color: levelColor[message.level],
          title: message.title,
          text: message.body,
          fields: message.metadata
            ? Object.entries(message.metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
          footer: "VitaLog Alert System",
          ts: Math.floor((message.timestamp || new Date()).getTime() / 1000),
        },
      ],
    };

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log("[Notification] Slack sent successfully");
    return true;
  } catch (error) {
    console.error("[Notification] Slack failed:", error);
    return false;
  }
}

/**
 * 发送企业微信通知
 */
async function sendWeCom(
  config: WeComConfig,
  message: NotificationMessage
): Promise<boolean> {
  try {
    const levelEmoji = {
      info: "ℹ️",
      warning: "⚠️",
      error: "🚨",
    };

    const payload = {
      msgtype: "markdown",
      markdown: {
        content: `
## ${levelEmoji[message.level]} ${message.title}

${message.body}

${message.metadata ? `**详细信息:**\n\`\`\`json\n${JSON.stringify(message.metadata, null, 2)}\n\`\`\`` : ""}

> 发送时间: ${(message.timestamp || new Date()).toLocaleString("zh-CN")}
        `.trim(),
      },
    };

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`WeCom API error: ${response.status}`);
    }

    console.log("[Notification] WeCom sent successfully");
    return true;
  } catch (error) {
    console.error("[Notification] WeCom failed:", error);
    return false;
  }
}

/**
 * 发送控制台日志
 */
function sendConsole(message: NotificationMessage): void {
  const levelFn = {
    info: console.info,
    warning: console.warn,
    error: console.error,
  };

  levelFn[message.level](
    `[Alert] ${message.title}\n${message.body}`,
    message.metadata || ""
  );
}

// ============================================================
// 主发送函数
// ============================================================

/**
 * 发送通知到所有配置的渠道
 */
export async function sendNotification(
  message: NotificationMessage,
  channels?: ("email" | "slack" | "wecom" | "console")[]
): Promise<{
  success: boolean;
  results: Record<string, boolean>;
}> {
  const config = getConfig();
  const targetChannels = channels || ["console"];
  const results: Record<string, boolean> = {};

  // 总是发送到控制台
  sendConsole(message);

  // 发送到其他渠道
  for (const channel of targetChannels) {
    switch (channel) {
      case "email":
        if (config.email) {
          results.email = await sendEmail(config.email, message);
        }
        break;

      case "slack":
        if (config.slack) {
          results.slack = await sendSlack(config.slack, message);
        }
        break;

      case "wecom":
        if (config.wecom) {
          results.wecom = await sendWeCom(config.wecom, message);
        }
        break;

      case "console":
        // 已经发送过了
        results.console = true;
        break;
    }
  }

  const success = Object.values(results).some((v) => v);

  return { success, results };
}

/**
 * 发送告警通知
 */
export async function sendAlertNotification(
  alert: {
    ruleName: string;
    message: string;
    metric: string;
    currentValue: number;
    threshold: number;
  },
  channels?: ("email" | "slack" | "wecom" | "console")[]
): Promise<void> {
  const message: NotificationMessage = {
    title: `告警: ${alert.ruleName}`,
    body: alert.message,
    level: "warning",
    metadata: {
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
    },
  };

  await sendNotification(message, channels);
}
