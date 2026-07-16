// MOTD 查询模块入口
// 统一暴露 query_motd 命令，按 edition 分发到 Java SLP 或 Bedrock RakNet

mod bedrock;
mod java;
mod types;
mod varint;

use serde::Deserialize;

pub use types::MotdResult;

/// Tauri command 入参
#[derive(Debug, Deserialize)]
pub struct MotdQuery {
    /// "java" 或 "bedrock"
    pub edition: String,
    /// 服务器主机名/IP
    pub host: String,
    /// 端口，None 时按 edition 取默认值（Java 25565 / Bedrock 19132）
    pub port: Option<u16>,
}

/// 执行 MOTD 查询，错误以 { kind, message } 形式返回，便于前端按类型展示
pub fn run(query: MotdQuery) -> Result<MotdResult, MotdError> {
    // 统一解析 host 字段：支持 host / host:port / [ipv6] / [ipv6]:port / ipv6
    let (host, port) = parse_host_port(&query.host, query.port);

    let resolved_query = MotdQuery {
        edition: query.edition.clone(),
        host,
        port,
    };

    match query.edition.as_str() {
        "java" => java::query_java(&resolved_query.host, resolved_query.port)
            .map_err(|e| classify(&resolved_query, e)),
        "bedrock" => bedrock::query_bedrock(&resolved_query.host, resolved_query.port)
            .map_err(|e| classify(&resolved_query, e)),
        other => Err(MotdError {
            kind: "invalid-host".into(),
            message: format!("unknown edition: {other}"),
        }),
    }
}

/// 解析输入地址，分离 host 与 port
///
/// 支持格式：
/// - `example.com` → ("example.com", None)
/// - `example.com:25565` → ("example.com", Some(25565))
/// - `[::1]` → ("::1", None)
/// - `[::1]:25565` → ("::1", Some(25565))
/// - `::1`（纯 IPv6 无方括号）→ ("::1", None)
/// - `::1:25565`（IPv6 末段恰好是端口数字）→ ("::1", Some(25565))
///
/// 当 input 与 fallback_port 都有端口时，input 中的端口优先。
fn parse_host_port(input: &str, fallback_port: Option<u16>) -> (String, Option<u16>) {
    let input = input.trim();
    if input.is_empty() {
        return (String::new(), fallback_port);
    }

    // 情况 1：[ipv6] 或 [ipv6]:port
    if input.starts_with('[') {
        if let Some(close) = input.find(']') {
            let host = &input[1..close];
            let rest = &input[close + 1..];
            let port = rest
                .strip_prefix(':')
                .and_then(|s| s.parse::<u16>().ok())
                .or(fallback_port);
            return (host.to_string(), port);
        }
        // 方括号未闭合，原样返回
        return (input.to_string(), fallback_port);
    }

    // 情况 2：纯 IPv6（无方括号，含多个冒号）
    // 判断标准：冒号数量 >= 2，且不以方括号开头
    let colon_count = input.chars().filter(|&c| c == ':').count();
    if colon_count >= 2 {
        // 可能是纯 IPv6，或 IPv6 + 端口（如 ::1:25565）
        // 规则：取最后一个冒号后的部分，若能解析为 u16 且剩余部分仍像 IPv6，则视为端口
        if let Some(last_colon) = input.rfind(':') {
            let maybe_port = &input[last_colon + 1..];
            let maybe_host = &input[..last_colon];
            // 剩余部分必须仍含至少一个冒号才算 IPv6
            if maybe_host.contains(':') {
                if let Ok(port) = maybe_port.parse::<u16>() {
                    return (maybe_host.to_string(), Some(port));
                }
            }
        }
        // 无法分离端口，当作纯 IPv6 host
        return (input.to_string(), fallback_port);
    }

    // 情况 3：普通 host 或 host:port（最多一个冒号）
    if let Some((h, p)) = input.rsplit_once(':') {
        if let Ok(port) = p.parse::<u16>() {
            return (h.to_string(), Some(port));
        }
    }

    (input.to_string(), fallback_port)
}

/// 将 io::Error 分类为面向前端的错误类型
fn classify(query: &MotdQuery, e: std::io::Error) -> MotdError {
    let kind = match e.kind() {
        std::io::ErrorKind::TimedOut => "timeout",
        std::io::ErrorKind::ConnectionRefused
        | std::io::ErrorKind::ConnectionReset
        | std::io::ErrorKind::ConnectionAborted
        | std::io::ErrorKind::NotConnected
        | std::io::ErrorKind::AddrNotAvailable => "unreachable",
        std::io::ErrorKind::InvalidInput | std::io::ErrorKind::InvalidData => "invalid-host",
        _ => {
            // 兜底：超时类（部分系统表现为 WouldBlock 或带 timeout 语义）
            if e.to_string().to_lowercase().contains("timed out") {
                "timeout"
            } else {
                "unknown"
            }
        }
    };
    // 主机为空直接判为 invalid-host
    let kind = if query.host.trim().is_empty() {
        "invalid-host"
    } else {
        kind
    };
    MotdError {
        kind: kind.into(),
        message: e.to_string(),
    }
}

/// 面向前端的错误结构
#[derive(Debug, serde::Serialize)]
pub struct MotdError {
    pub kind: String,
    pub message: String,
}
