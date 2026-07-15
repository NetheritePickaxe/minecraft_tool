// 基岩版 RakNet Unconnected Ping 实现
// 参考：https://wiki.vg/Raknet_Protocol
// 流程：UDP 发送 Unconnected Ping(0x01) -> 接收 Unconnected Pong(0x1C)
// Pong 负载为分号分隔字符串：MCPE;<name>;<protocol>;<version>;<online>;<max>;...

use std::io;
use std::net::UdpSocket;
use std::time::{Duration, Instant};

use super::types::MotdResult;

const DEFAULT_PORT: u16 = 19132;
const TIMEOUT: Duration = Duration::from_secs(5);
/// RakNet offline message magic (16 字节固定常量)
const MAGIC: [u8; 16] = [
    0x00, 0xFF, 0xFF, 0x00, 0xFE, 0xFE, 0xFE, 0xFE, 0xFD, 0xFD, 0xFD, 0xFD, 0x12, 0x34, 0x56, 0x78,
];

/// 查询基岩版服务器 MOTD
pub fn query_bedrock(host: &str, port: Option<u16>) -> io::Result<MotdResult> {
    let port = port.unwrap_or(DEFAULT_PORT);
    let addr = format!("{host}:{port}");

    let socket = UdpSocket::bind("0.0.0.0:0")?;
    socket.set_read_timeout(Some(TIMEOUT))?;
    socket.set_write_timeout(Some(TIMEOUT))?;

    let start = Instant::now();
    // Unconnected Ping 包：0x01 + time(u64 BE) + magic(16) + client GUID(u64 BE)
    let mut packet = Vec::with_capacity(33);
    packet.push(0x01);
    packet.extend_from_slice(&now_millis().to_be_bytes());
    packet.extend_from_slice(&MAGIC);
    packet.extend_from_slice(&1u64.to_be_bytes()); // 任意 client GUID

    socket.send_to(&packet, &addr)?;

    let mut buf = [0u8; 4096];
    let (len, _) = socket.recv_from(&mut buf)?;
    let latency_ms = start.elapsed().as_millis() as u64;

    parse_bedrock_response(&buf[..len], latency_ms)
}

/// 解析 Unconnected Pong 响应
fn parse_bedrock_response(data: &[u8], latency_ms: u64) -> io::Result<MotdResult> {
    if data.is_empty() || data[0] != 0x1C {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "not a RakNet Unconnected Pong",
        ));
    }
    // 跳过：id(1) + time(8) + server guid(8) + magic(16) = 33 字节
    if data.len() < 35 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "pong packet too short",
        ));
    }
    let motd_len = u16::from_be_bytes([data[33], data[34]]) as usize;
    let motd_end = 35 + motd_len;
    if data.len() < motd_end {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "pong MOTD length exceeds packet",
        ));
    }
    let motd_str = std::str::from_utf8(&data[35..motd_end])
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    let fields: Vec<&str> = motd_str.split(';').collect();

    // MCPE;<name>;<protocol>;<version>;<online>;<max>;...
    if fields.len() < 6 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("unexpected bedrock MOTD format: {motd_str}"),
        ));
    }

    Ok(MotdResult {
        edition: "bedrock".into(),
        description: fields.get(1).unwrap_or(&"").to_string(),
        online: fields.get(4).and_then(|s| s.parse().ok()).unwrap_or(0),
        max: fields.get(5).and_then(|s| s.parse().ok()).unwrap_or(0),
        version_name: fields.get(3).unwrap_or(&"").to_string(),
        protocol: fields.get(2).and_then(|s| s.parse().ok()).unwrap_or(0),
        favicon: None,
        players: Vec::new(),
        latency_ms,
    })
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
