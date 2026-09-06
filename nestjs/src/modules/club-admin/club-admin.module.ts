import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom, Player } from '../../database/entities';
import { DomainModule } from '../domain/domain.module';
import { ClubAdminController } from './club-admin.controller';
import { FinanceAdminController } from './finance-admin.controller';
import { StaffNotificationController } from './staff-notification.controller';

@Module({
  imports: [DomainModule, TypeOrmModule.forFeature([Player, Classroom])],
  controllers: [ClubAdminController, FinanceAdminController, StaffNotificationController],
})
export class ClubAdminModule {}
