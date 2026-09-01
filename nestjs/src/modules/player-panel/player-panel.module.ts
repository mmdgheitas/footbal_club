import { Module } from '@nestjs/common';
import { PlayerPanelController } from './player-panel.controller';
import { PlayerPanelService } from './player-panel.service';
import { PlayersModule } from '../players/players.module';
import { AlertsModule } from '../alerts/alert.module';

@Module({
  imports: [PlayersModule, AlertsModule],
  controllers: [PlayerPanelController],
  providers: [PlayerPanelService],
})
export class PlayerPanelModule {}
