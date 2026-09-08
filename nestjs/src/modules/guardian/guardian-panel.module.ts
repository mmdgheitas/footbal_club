import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { PaymentsModule } from '../payments/payments.module';
import { GuardianPanelController } from './guardian-panel.controller';
import { GuardianPanelService } from './guardian-panel.service';

@Module({
  imports: [DomainModule, PaymentsModule],
  controllers: [GuardianPanelController],
  providers: [GuardianPanelService],
})
export class GuardianPanelModule {}
