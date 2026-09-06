import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardianUser, OtpCode, Player, User } from '../../database/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpAuthController } from './otp-auth.controller';
import { OtpService } from './otp.service';
import { IdentityService } from './identity.service';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Player, GuardianUser, OtpCode]),
    SmsModule,
  ],
  // OtpAuthController is registered first so the OTP routes take precedence
  // over anything the legacy controller might match.
  controllers: [OtpAuthController, AuthController],
  providers: [AuthService, OtpService, IdentityService],
  exports: [AuthService, OtpService, IdentityService],
})
export class AuthModule {}
