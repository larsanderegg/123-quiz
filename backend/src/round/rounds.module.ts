import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundsService } from './rounds.service.js';
import { RoundsController } from './rounds.controller.js';
import { Round, Question } from '@quiz/shared';
import {AnswersModule} from "../answers/answers.module.js"; // Pfad anpassen

@Module({
    imports: [
        TypeOrmModule.forFeature([Round, Question]), // Registriere Round und Question Repositories
        AnswersModule,
    ],
    controllers: [RoundsController],
    providers: [RoundsService],
    // Optional: Exportiere den Service, wenn er von anderen Modulen verwendet werden soll
    // exports: [RoundsService]
})
export class RoundsModule {}