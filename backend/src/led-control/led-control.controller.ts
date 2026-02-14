import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import {LedControlMode} from "@quiz/shared";
import axios, { AxiosError } from 'axios';

const modeToPathMap: Record<LedControlMode, string> = {
    [LedControlMode.ALL]: 'all',
    [LedControlMode.BLINK]: 'blink',
    [LedControlMode.ONE]: '1',
    [LedControlMode.TWO]: '2',
    [LedControlMode.THREE]: '3',
    [LedControlMode.OFF]: 'off',
    // Füge hier ggf. weitere Modi hinzu
};

@Controller('led-control')
export class LedControlController {

    private readonly LED_SERVICE_BASE_URL = 'http://192.168.0.20:80';

    @Put(':mode')
    async setMode(@Param('mode') mode: LedControlMode): Promise<boolean> {
        const targetUrl = `${this.LED_SERVICE_BASE_URL}/${modeToPathMap[mode]}`;

        try {
            const response = await axios.put(targetUrl);
            return response.status >= 200 && response.status < 300;
        } catch (error) {
            // Handle mögliche Fehler (Netzwerk, Timeout, 4xx/5xx-Antworten)
            if (axios.isAxiosError(error)) { // Typprüfung für AxiosError
                const axiosError = error as AxiosError; // Type assertion
                console.error(`AxiosError calling LED service at ${targetUrl}: ${axiosError.message}`, axiosError.stack);
                const status = axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
                const responseData = axiosError.response?.data;
                console.error(`Response status: ${status}, Data: ${JSON.stringify(responseData)}`);
                // Wirf einen NestJS HttpException
                throw new HttpException(`Failed to communicate with LED service: ${axiosError.message}`, status);
            } else {
                // Allgemeines Fehlerhandling für unerwartete Fehler
                console.error(`An unexpected error occurred while setting LED mode to '${mode}' via axios: ${error.message}`, error.stack);
                throw new HttpException('An internal error occurred', HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

}