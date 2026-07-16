// Java 版 Server List Ping (SLP) 协议实现
// 参考：https://wiki.vg/Server_List_Ping
// 流程：TCP 连接 -> Handshake(0x00) -> Status Request(0x00) -> 读取 JSON 响应

use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::{Duration, Instant};

use serde_json::Value;

use super::types::{MotdResult, PlayerSample};
use super::varint::{read_var_int, write_string, write_var_int};

const DEFAULT_PORT: u16 = 25565;
const TIMEOUT: Duration = Duration::from_secs(5);

/// 查询 Java 版服务器 MOTD
pub fn query_java(host: &str, port: Option<u16>) -> std::io::Result<MotdResult> {
    let port = port.unwrap_or(DEFAULT_PORT);
    // IPv6 字面量需用方括号包裹才能构成合法 SocketAddr
    let addr = if host.contains(':') {
        format!("[{host}]:{port}")
    } else {
        format!("{host}:{port}")
    };

    let start = Instant::now();
    let mut stream = TcpStream::connect_timeout(
        &addr
            .parse()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?,
        TIMEOUT,
    )?;
    stream.set_read_timeout(Some(TIMEOUT))?;
    stream.set_write_timeout(Some(TIMEOUT))?;

    // --- Handshake 包 (0x00) ---
    let mut handshake = Vec::new();
    write_var_int(&mut handshake, 0x00); // packet id
    write_var_int(&mut handshake, -1); // protocol version, -1 = status
    write_string(&mut handshake, host); // server host
    handshake.extend_from_slice(&port.to_be_bytes()); // server port (u16 big endian)
    write_var_int(&mut handshake, 1); // next state = status

    let mut frame = Vec::new();
    write_var_int(&mut frame, handshake.len() as i32);
    frame.extend_from_slice(&handshake);
    stream.write_all(&frame)?;

    // --- Status Request 包 (0x00)，无负载 ---
    let mut request = Vec::new();
    write_var_int(&mut request, 0x00); // packet id
    let mut req_frame = Vec::new();
    write_var_int(&mut req_frame, request.len() as i32);
    req_frame.extend_from_slice(&request);
    stream.write_all(&req_frame)?;

    // --- 读取响应 ---
    let _packet_len = read_var_int(&mut stream)?;
    let packet_id = read_var_int(&mut stream)?;
    if packet_id != 0x00 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("unexpected status packet id: {packet_id:#x}"),
        ));
    }
    let json_len = read_var_int(&mut stream)? as usize;
    let mut json_bytes = vec![0u8; json_len];
    stream.read_exact(&mut json_bytes)?;
    let latency_ms = start.elapsed().as_millis() as u64;

    let json: Value = serde_json::from_slice(&json_bytes)?;
    Ok(parse_java_response(json, latency_ms))
}

/// 将 Java 版 SLP JSON 响应解析为统一结构
fn parse_java_response(json: Value, latency_ms: u64) -> MotdResult {
    let version = &json["version"];
    let players = &json["players"];
    let description = json.get("description").cloned().unwrap_or(Value::Null);

    MotdResult {
        edition: "java".into(),
        description: chat_to_legacy(&description),
        online: players["online"].as_i64().unwrap_or(0) as i32,
        max: players["max"].as_i64().unwrap_or(0) as i32,
        version_name: version["name"].as_str().unwrap_or("").to_string(),
        protocol: version["protocol"].as_i64().unwrap_or(0) as i32,
        favicon: json["favicon"].as_str().map(String::from),
        players: players["sample"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .map(|p| PlayerSample {
                        name: p["name"].as_str().unwrap_or("").to_string(),
                        id: p["id"].as_str().unwrap_or("").to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default(),
        latency_ms,
    }
}

/// 将 JSON chat component 转为带 § 代码的 legacy 字符串
/// 支持纯字符串与 {text, color, bold, extra...} 对象结构
fn chat_to_legacy(value: &Value) -> String {
    let mut out = String::new();
    append_component(value, &mut out);
    out
}

fn append_component(value: &Value, out: &mut String) {
    match value {
        Value::String(s) => out.push_str(s),
        Value::Object(_) => {
            // 颜色代码前缀
            if let Some(color) = value["color"].as_str() {
                if let Some(code) = color_to_code(color) {
                    out.push('§');
                    out.push(code);
                }
            }
            // 格式代码前缀
            for (key, code) in [
                ("bold", 'l'),
                ("italic", 'o'),
                ("underlined", 'n'),
                ("strikethrough", 'm'),
                ("obfuscated", 'k'),
            ] {
                if value[key].as_bool() == Some(true) {
                    out.push('§');
                    out.push(code);
                }
            }
            if let Some(text) = value["text"].as_str() {
                out.push_str(text);
            }
            if let Some(extra) = value["extra"].as_array() {
                for child in extra {
                    append_component(child, out);
                }
            }
        }
        _ => {}
    }
}

/// 颜色名 -> § 代码字符
fn color_to_code(name: &str) -> Option<char> {
    match name {
        "black" => Some('0'),
        "dark_blue" => Some('1'),
        "dark_green" => Some('2'),
        "dark_aqua" => Some('3'),
        "dark_red" => Some('4'),
        "dark_purple" => Some('5'),
        "gold" => Some('6'),
        "gray" => Some('7'),
        "dark_gray" => Some('8'),
        "blue" => Some('9'),
        "green" => Some('a'),
        "aqua" => Some('b'),
        "red" => Some('c'),
        "light_purple" => Some('d'),
        "yellow" => Some('e'),
        "white" => Some('f'),
        _ => None,
    }
}
