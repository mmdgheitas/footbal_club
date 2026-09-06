import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { PlayerAppController } from './player-app.controller';
import { GuardianPanelService } from '../guardian/guardian-panel.service';

@Module({
  imports: [DomainModule],
  controllers: [PlayerAppController],
  // GuardianPanelService holds the shared player read models (attendance
  // summary, player detail); reused here instead of duplicating the SQL.
  providers: [GuardianPanelService],
})
export class PlayerAppModule {}
