import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import type { HealthStatus } from './health.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    const healthStatus = await this.healthService.check();

    if (healthStatus.status === 'ok') {
      return healthStatus;
    }

    throw new HttpException(healthStatus, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
