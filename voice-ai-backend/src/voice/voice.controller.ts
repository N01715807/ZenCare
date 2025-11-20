import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { VoiceChatRequestDto } from '../common/dto/voice-chat-request.dto';
import { VoiceChatResponseDto } from '../common/dto/voice-chat-response.dto';

/**
 * 这个控制器专门处理 “语音聊天” 的 HTTP 请求
 *
 * 路由前缀是 /voice
 * 所以所有方法最终都会是 /voice/xxx
 */
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  /**
   * 语音聊天 API 的入口
   *
   * 前端会调用 POST /voice/chat 来发起一次语音对话。
   *
   * 前端必须用 form-data 上传（multipart/form-data）：
   *
   *   audio: 录音文件（二进制）
   *   voice: 用哪种声音来合成 TTS（文本字段）
   *   sessionId: 可选，用来保持上下文
   *
   * 当用户按下“录音 → 发送”时，前端就会访问这个接口。
   */
  @Post('chat')
  @UseInterceptors(
    /**
     * FileInterceptor('audio'):
     *
     * - 告诉 Nest：前端会上传一个名为 audio 的文件
     * - 使用 Multer 自动解析 multipart/form-data
     * - file 会自动放到 @UploadedFile() 的参数里
     *
     * 不加这个，就无法在后端接收到文件。
     */
    FileInterceptor('audio'),
  )
  async chat(
    /**
     * 接收解析好的“文件对象”
     * file.buffer 就是录音的二进制数据（最重要的部分）
     */
    @UploadedFile() file: Express.Multer.File,

    /**
     * 解析 form-data 里除 audio 外的所有普通字段
     * 会自动映射到 VoiceChatRequestDto
     * 例如：
     *   body.voice
     *   body.sessionId
     */
    @Body() body: VoiceChatRequestDto,
  ): Promise<VoiceChatResponseDto> {
    /**
     * ------- 参数校验 -------
     * audio 是必选参数，没有音频就无法 STT
     */
    if (!file) {
      // 400 错误：前端没有上传音频
      throw new BadRequestException('audio');
    }

    /**
     * voice 也是必选参数
     * 因为 TTS 需要知道“用哪种声音朗读 AI 回复”
     */
    if (!body.voice) {
      // 400 错误：没传 voice
      throw new BadRequestException('voice');
    }

    /**
     * ------- 调用核心逻辑 -------
     *
     * 现在把用户上传的：
     * - file.buffer（录音数据）
     * - voice（合成声音类型）
     * - sessionId（保持上下文）
     *
     * 全部交给 VoiceService.handleVoiceChat
     *
     * VoiceService 会做 3 件事：
     * 1) STT：录音 → 用户文字
     * 2) Chat：用户文字 → AI 回复文字
     * 3) TTS：AI 回复文字 → AI 语音（base64）
     */
    const result = await this.voiceService.handleVoiceChat({
      audioBuffer: file.buffer, // 录音数据（必须）
      voice: body.voice,        // TTS 的声音类型
      sessionId: body.sessionId // 可选：保持上下文对话
    });

    /**
     * VoiceService 已经生成了所有内容：
     *
     * {
     *   sessionId: "xxx",
     *   userText: "你说的话",
     *   replyText: "AI 回复的文本",
     *   audioBase64: "base64 音频"
     * }
     *
     * Controller 不需要做任何加工，直接返回给前端即可。
     */
    return result;
  }
}
