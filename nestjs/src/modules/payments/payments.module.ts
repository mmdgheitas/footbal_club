import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, PaymentTransaction } from '../../database/entities';
import { DomainModule } from '../domain/domain.module';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { PaymentAdminController } from './payment-admin.controller';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';
import { MockPaymentGateway } from './gateways/mock.gateway';
import { ZarinpalGateway } from './gateways/zarinpal.gateway';

/**
 * درگاه پرداخت آنلاین.
 *
 * The drivers are plain providers, so a new gateway is: one class implementing
 * PaymentGateway, one entry in this `providers` list, one line in
 * PaymentGatewayFactory. Nothing else in the application changes.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentTransaction]), DomainModule],
  controllers: [PaymentsController, PaymentAdminController],
  providers: [
    PaymentService,
    PaymentGatewayFactory,
    MockPaymentGateway,
    ZarinpalGateway,
  ],
  exports: [PaymentService, PaymentGatewayFactory],
})
export class PaymentsModule {}
