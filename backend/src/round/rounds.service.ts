import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round, Question } from '@quiz/shared';
import {AnswersService} from "../answers/answers.service.js";

@Injectable()
export class RoundsService {
    constructor(
        @InjectRepository(Round)
        private readonly roundRepository: Repository<Round>,
        private readonly answersService: AnswersService,
    ) {}

    async create(createRound: Round): Promise<Round> {
        const round = this.roundRepository.create(createRound);
        return this.roundRepository.save(round);
    }

    async findAll(): Promise<Round[]> {
        // Optional: Load related questions if needed by default
        // return this.roundRepository.find({ relations: ['questions'] });
        return this.roundRepository.find();
    }

    async findOne(id: string): Promise<Round> {
        const round = await this.roundRepository.findOne({
            where: { id },
        });
        if (!round) {
            throw new NotFoundException(`Round with ID "${id}" not found`);
        }
        return round;
    }

    async update(id: string, updateRound: Round): Promise<Round> {
        // preload sucht die Entität und merged die neuen Daten.
        // Gibt null zurück, wenn die ID nicht gefunden wird.
        const round = await this.roundRepository.preload({
            id: id,
            ...updateRound,
        });
        if (!round) {
            throw new NotFoundException(`Round with ID "${id}" not found`);
        }
        return this.roundRepository.save(round);
    }

    async remove(id: string): Promise<void> {
        // Optional: Prüfen, ob abhängige Fragen existieren und entscheiden, was passieren soll
        // Da cascade = false ist, werden Fragen NICHT automatisch gelöscht.
        // Du musst hier ggf. manuell prüfen oder die Fragen auf null setzen (wenn Relation nullable ist).

        const round = await this.findOne(id); // Stellt sicher, dass die Runde existiert
        // Füge hier Logik hinzu, falls Fragen behandelt werden müssen, bevor die Runde gelöscht wird.
        // z.B. Fragen auf round = null setzen oder Löschen verbieten, wenn Fragen existieren.

        const result = await this.roundRepository.delete(id);
        if (result.affected === 0) {
            // Sollte durch findOne schon abgefangen sein, aber zur Sicherheit
            throw new NotFoundException(`Round with ID "${id}" not found during delete`);
        }
    }
}