import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LedControlController } from './led-control.controller.js';

@Module({
  imports: [
    HttpModule, // Füge HttpModule zu den Imports hinzu
  ],
  controllers: [LedControlController],
})
export class LedControlModule {}
