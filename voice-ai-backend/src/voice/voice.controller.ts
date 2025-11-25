import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { VoiceService } from './voice.service';
import { SttService } from '../ai/stt/stt.service';
import { ChatService } from '../ai/chat/chat.service';
import { TtsService } from '../ai/tts/tts.service';
import { VoiceChatRequestDto } from '../common/dto/voice-chat-request.dto';
import { VoiceChatResponseDto } from '../common/dto/voice-chat-response.dto';

@Controller('voice')
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly sttService: SttService,
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService, // ✅ 新增
  ) {}

  /**
   * STT 调试接口：POST /voice/debug/stt
   */
  @Post('debug/stt')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async debugStt(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('audio');
    }

    const text = await this.sttService.transcribeAudio(file.buffer);
    return { text };
  }

  /**
   * Chat 调试接口：POST /voice/debug/chat
   */
  @Post('debug/chat')
  async debugChat(
    @Body() body: { text?: string; sessionId?: string; context?: string },
  ): Promise<{ replyText: string }> {
    if (!body.text) {
      throw new BadRequestException('text');
    }

    const replyText = await this.chatService.generateReply(
      body.text,
      body.sessionId,
      body.context,
    );

    return { replyText };
  }

  /**
   * TTS 调试接口：POST /voice/debug/tts
   *
   * Body(JSON):
   *   { "text": "你好", "voice": "alloy" }
   *
   * Res(JSON):
   *   { "audioBase64": "..." }
   */
  @Post('debug/tts')
  async debugTts(
    @Body() body: { text?: string; voice?: string },
  ): Promise<{ audioBase64: string }> {
    if (!body.text) {
      throw new BadRequestException('text');
    }
    if (!body.voice) {
      throw new BadRequestException('voice');
    }

    const audioBuffer = await this.ttsService.synthesizeSpeech(
      body.text,
      body.voice,
    );

    const audioBase64 = audioBuffer.toString('base64');
    return { audioBase64 };
  }

  /**
   * 正式语音聊天接口：POST /voice/chat
   */
  @Post('chat')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async chat(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: VoiceChatRequestDto,
  ): Promise<VoiceChatResponseDto> {
    if (!file) {
      throw new BadRequestException('audio');
    }

    if (!body.voice) {
      throw new BadRequestException('voice');
    }

    const result = await this.voiceService.handleVoiceChat({
      audioBuffer: file.buffer,
      voice: body.voice,
      sessionId: body.sessionId,
    });

    return result;
  }
}
