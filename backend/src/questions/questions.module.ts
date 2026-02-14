import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import {Round, Question, Answer} from '@quiz/shared';

@Module({
  imports: [TypeOrmModule.forFeature([Round, Question, Answer])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
