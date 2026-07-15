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
    match query.edition.as_str() {
        "java" => java::query_java(&query.host, query.port).map_err(|e| classify(&query, e)),
        "bedrock" => {
            bedrock::query_bedrock(&query.host, query.port).map_err(|e| classify(&query, e))
        }
        other => Err(MotdError {
            kind: "invalid-host".into(),
            message: format!("unknown edition: {other}"),
        }),
    }
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
