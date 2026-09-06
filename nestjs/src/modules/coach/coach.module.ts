import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { CoachController } from './coach.controller';
import { GuardianPanelService } from '../guardian/guardian-panel.service';

@Module({
  imports: [DomainModule],
  controllers: [CoachController],
  providers: [GuardianPanelService],
})
export class CoachModule {}
