export class VoiceGreetRequestDto {
  // 语音音色，例如 alloy
  voice: string;

  // 会话 ID，例如 sess-...
  sessionId: string;

  // 用户资料 JSON 字符串
  // 例如 {"name":"xxx","preferredName":"xxx","age":"25","health":"xxx"}
  profile?: string;
}
