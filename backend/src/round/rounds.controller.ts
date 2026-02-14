import { Controller, Get, Post, Body, Param, Delete, Put, ParseUUIDPipe, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { RoundsService } from './rounds.service.js';
import { Round } from '@quiz/shared'; // Pfad anpassen

@Controller('rounds') // Basis-Pfad für alle Routen in diesem Controller
export class RoundsController {
    constructor(private readonly roundsService: RoundsService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(ValidationPipe) createRound: Round): Promise<Round> {
        return this.roundsService.create(createRound);
    }

    @Get()
    findAll(): Promise<Round[]> {
        return this.roundsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Round> {
        // ParseUUIDPipe validiert, dass die ID eine UUID ist
        return this.roundsService.findOne(id);
    }

    @Put(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body(ValidationPipe) updateRound: Round
    ): Promise<Round> {
        return this.roundsService.update(id, updateRound);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT) // Standard-Antwort für erfolgreiches DELETE ohne Body
    remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.roundsService.remove(id);
    }
}