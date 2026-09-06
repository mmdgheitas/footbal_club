import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { CardsController } from './cards.controller';
import { GuardianPanelService } from '../guardian/guardian-panel.service';

@Module({
  imports: [DomainModule],
  controllers: [CardsController],
  providers: [GuardianPanelService],
})
export class CardsModule {}
