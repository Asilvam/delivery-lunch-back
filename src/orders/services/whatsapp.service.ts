import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { OrderDocument } from '../schemas/order.schema';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly configService: ConfigService) {}

  async notifyOrder(order: OrderDocument): Promise<void> {
    const phone = this.configService.get<string>('WHATSAPP_NOTIFY_PHONE');
    const apiKey = this.configService.get<string>('CALLMEBOT_API_KEY');

    if (!phone || !apiKey) {
      this.logger.warn(
        'WHATSAPP_NOTIFY_PHONE o CALLMEBOT_API_KEY no configurados — notificacion omitida',
      );
      return;
    }

    const message = this.buildMessage(order);
    const encodedText = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedText}&apikey=${apiKey}`;

    this.logger.log(`Enviando WhatsApp a ${phone} para pedido ${order._id}`);

    return new Promise((resolve) => {
      https
        .get(url, (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => (body += chunk.toString()));
          res.on('end', () => {
            if (res.statusCode === 200) {
              this.logger.log(
                `WhatsApp enviado correctamente para pedido ${order._id}`,
              );
            } else {
              this.logger.error(
                `Error Callmebot [${res.statusCode}] pedido ${order._id}: ${body}`,
              );
            }
            resolve();
          });
        })
        .on('error', (err) => {
          this.logger.error(
            `Fallo de red al enviar WhatsApp pedido ${order._id}: ${err.message}`,
          );
          resolve(); // no bloquear el flujo principal
        });
    });
  }

  private buildMessage(order: OrderDocument): string {
    const lines: string[] = [
      `Nuevo pedido - ${order.cliente}`,
      `Telefono: ${order.telefono ?? 'no informado'}`,
      `Fecha: ${order.fecha}`,
      '--- * ---',
    ];

    for (const item of order.items) {
      lines.push(`${item.cantidad}x ${item.nombre}`);
      const sels = item.selecciones ?? {};
      for (const [key, value] of Object.entries(sels)) {
        lines.push(`  ${this.capitalize(key)}: ${value}`);
      }
    }

    lines.push('--- * ---');
    lines.push('Total: $  ' + new Intl.NumberFormat('es-CL').format(order.total));

    return lines.join('\n');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
