// MOTD 查询统一返回结构
// Java 版与基岩版查询结果归一为此结构，供前端展示

use serde::Serialize;

/// 单个在线玩家信息（仅 Java 版有 sample）
#[derive(Debug, Clone, Serialize)]
pub struct PlayerSample {
    pub name: String,
    pub id: String,
}

/// MOTD 查询结果
#[derive(Debug, Clone, Serialize)]
pub struct MotdResult {
    /// 版本："java" 或 "bedrock"
    pub edition: String,
    /// 服务器描述（可能含 § 颜色/格式代码）
    pub description: String,
    /// 在线人数
    pub online: i32,
    /// 最大人数
    pub max: i32,
    /// 版本名（如 "1.20.4"）
    pub version_name: String,
    /// 协议号
    pub protocol: i32,
    /// 服务器图标（Java 版 data:image/png;base64,...，基岩版为 None）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
    /// 在线玩家列表（仅 Java 版部分服务器提供）
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub players: Vec<PlayerSample>,
    /// 往返延迟（毫秒）
    pub latency_ms: u64,
}
