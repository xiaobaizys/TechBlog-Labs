/**
 * IP 归属地解析
 *
 * 使用 ip2region 离线库进行精确的 IP 地理位置查询。
 * 数据库文件位于 node_modules/ip2region/data/
 */

export interface IpLocation {
  country: string;
  province: string;
  city: string;
}

// 单例模式：延迟初始化 ip2region 实例
let ip2regionInstance: any = null;

function getIp2Region(): any {
  if (!ip2regionInstance) {
    // 用 eval('require') 阻止 webpack 打包，让 Node.js 在运行时动态加载
    // ip2region 有原生二进制数据文件，不能被 webpack 静态打包
    // eslint-disable-next-line no-eval
    const dynamicRequire = typeof require !== 'undefined' ? eval('require') : null;
    if (!dynamicRequire) return null;
    try {
      const ip2regionModule = dynamicRequire("ip2region");
      const IP2Region = ip2regionModule.default || ip2regionModule;
      ip2regionInstance = new IP2Region({
        disableIpv6: false,
      });
    } catch (err) {
      console.warn("[ip-location] ip2region 加载失败:", err);
      return null;
    }
  }
  return ip2regionInstance;
}

// 省份名称标准化映射（去掉"省"、"市"、"自治区"等后缀）
const PROVINCE_NORMALIZE: Record<string, string> = {
  "北京市": "北京",
  "天津市": "天津",
  "上海市": "上海",
  "重庆市": "重庆",
  "河北省": "河北",
  "山西省": "山西",
  "辽宁省": "辽宁",
  "吉林省": "吉林",
  "黑龙江省": "黑龙江",
  "江苏省": "江苏",
  "浙江省": "浙江",
  "安徽省": "安徽",
  "福建省": "福建",
  "江西省": "江西",
  "山东省": "山东",
  "河南省": "河南",
  "湖北省": "湖北",
  "湖南省": "湖南",
  "广东省": "广东",
  "海南省": "海南",
  "四川省": "四川",
  "贵州省": "贵州",
  "云南省": "云南",
  "陕西省": "陕西",
  "甘肃省": "甘肃",
  "青海省": "青海",
  "台湾省": "台湾",
  "内蒙古自治区": "内蒙古",
  "广西壮族自治区": "广西",
  "西藏自治区": "西藏",
  "宁夏回族自治区": "宁夏",
  "新疆维吾尔自治区": "新疆",
  "香港特别行政区": "香港",
  "澳门特别行政区": "澳门",
};

/**
 * 标准化省份名称
 */
function normalizeProvince(province: string): string {
  if (!province) return "未知";
  // 去掉"省"、"市"等后缀
  const cleaned = province.replace(/省$|市$|自治区$|壮族自治区$|回族自治区$|维吾尔自治区$|特别行政区$/, "");
  return PROVINCE_NORMALIZE[province] || cleaned || province;
}

/**
 * 从 IP 获取地理位置
 *
 * 策略：
 * 1. 本地 IP（127.0.0.1、::1）返回测试数据
 * 2. 优先从请求头获取（Cloudflare、Vercel 等 CDN 提供）
 * 3. 使用 ip2region 离线库查询
 * 4. 兜底返回"未知"
 */
export function getLocation(
  ip: string | null,
  headers?: Headers
): IpLocation {
  // 本地开发 IP
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1") {
    return {
      country: "中国",
      province: "广东",
      city: "深圳",
    };
  }

  // 尝试从 CDN 请求头获取地理位置
  if (headers) {
    const vercelCountry = headers.get("x-vercel-ip-country");
    const vercelCity = headers.get("x-vercel-ip-city");
    const vercelRegion = headers.get("x-vercel-ip-country-region");

    if (vercelCountry) {
      return {
        country: countryMap[vercelCountry] || vercelCountry,
        province: normalizeProvince(vercelRegion || ""),
        city: vercelCity ? decodeURIComponent(vercelCity) : "未知",
      };
    }

    const cfCountry = headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX") {
      return {
        country: countryMap[cfCountry] || cfCountry,
        province: "未知",
        city: "未知",
      };
    }
  }

  // 使用 ip2region 离线库查询
  try {
    const query = getIp2Region();
    if (!query) {
      console.warn("[ip-location] ip2region 未加载，跳过查询");
    } else {
      const result = query.search(ip);

      if (result && result.country) {
        return {
          country: result.country || "未知",
          province: normalizeProvince(result.province || ""),
          city: result.city || "未知",
        };
      }
    }
  } catch (error) {
    // ip2region 查询失败，降级处理
    console.warn("[ip-location] ip2region query failed:", error);
  }

  return { country: "未知", province: "未知", city: "未知" };
}

/**
 * 从请求对象提取客户端 IP
 */
export function extractIp(request: Request): string | null {
  // 优先从代理头获取
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    return ip || null;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // @ts-expect-error Next.js specific property
  return request.ip || null;
}

// 国家代码 → 中文名映射
const countryMap: Record<string, string> = {
  CN: "中国",
  US: "美国",
  JP: "日本",
  KR: "韩国",
  TW: "中国台湾",
  HK: "中国香港",
  MO: "中国澳门",
  SG: "新加坡",
  GB: "英国",
  DE: "德国",
  FR: "法国",
  RU: "俄罗斯",
  CA: "加拿大",
  AU: "澳大利亚",
  IN: "印度",
  BR: "巴西",
};
