// Minecraft VarInt 编解码
// 用于 Java 版 SLP 协议的数据包长度与字段编码

use std::io::{self, Read, Write};

/// 将 i32 编码为 VarInt 写入缓冲区
pub fn write_var_int(buf: &mut Vec<u8>, mut value: i32) {
    while (value & !0x7F) != 0 {
        buf.push(((value & 0x7F) as u8) | 0x80);
        value >>= 7;
    }
    buf.push(value as u8);
}

/// 从读取器解析一个 VarInt（最多 5 字节）
pub fn read_var_int<R: Read>(reader: &mut R) -> io::Result<i32> {
    let mut result = 0i32;
    for shift in (0..35).step_by(7) {
        let mut byte = [0u8; 1];
        reader.read_exact(&mut byte)?;
        result |= ((byte[0] & 0x7F) as i32) << shift;
        if byte[0] & 0x80 == 0 {
            return Ok(result);
        }
    }
    Err(io::Error::new(
        io::ErrorKind::InvalidData,
        "VarInt too large",
    ))
}

/// 写入一个带 VarInt 长度前缀的字符串（UTF-8）
pub fn write_string(buf: &mut Vec<u8>, s: &str) {
    let bytes = s.as_bytes();
    write_var_int(buf, bytes.len() as i32);
    buf.extend_from_slice(bytes);
}
