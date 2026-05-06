import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class NotificationEventDto {
  @ApiProperty({
    description: 'Recipient chat id (Telegram chat or channel)',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({
    description: 'Message text to deliver',
    example: 'Hello from RabbitMQ!',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;

  @ApiProperty({
    description: 'Optional event subtype used for routing or analytics',
    example: 'system.alert',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;
}
