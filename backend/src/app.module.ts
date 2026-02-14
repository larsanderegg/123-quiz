import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question, Answer, Round, LedControlMode } from '@quiz/shared';
import { QuestionsModule } from './questions/questions.module.js';
import { AnswersModule } from './answers/answers.module.js';
import { RoundsModule } from './round/rounds.module.js';
import { LedControlModule } from './led-control/led-control.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [Round, Question, Answer],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    QuestionsModule,
    AnswersModule,
    RoundsModule,
    LedControlModule,
  ],
})
export class AppModule {}
