import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { GuardianPanelController } from './guardian-panel.controller';
import { GuardianPanelService } from './guardian-panel.service';

@Module({
  imports: [DomainModule],
  controllers: [GuardianPanelController],
  providers: [GuardianPanelService],
})
export class GuardianPanelModule {}
