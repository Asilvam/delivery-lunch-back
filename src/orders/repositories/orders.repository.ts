import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus } from '../constants/order.constants';
import { CreateOrderDto } from '../dto/create-order.dto';
import { Order, OrderDocument } from '../schemas/order.schema';

@Injectable()
export class OrdersRepository {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    this.logger.log(
      `Insertando pedido para cliente: "${createOrderDto.cliente}"`,
    );
    const order = new this.orderModel({
      ...createOrderDto,
      menuId: new Types.ObjectId(createOrderDto.menuId),
      items: createOrderDto.items.map((item) => ({
        ...item,
        platoId: new Types.ObjectId(item.platoId),
        selecciones: item.selecciones ?? {},
      })),
    });
    return order.save();
  }

  async findById(id: string): Promise<OrderDocument | null> {
    this.logger.log(`Buscando pedido por id: ${id}`);
    return this.orderModel.findById(id).exec();
  }

  async findAll(estado?: OrderStatus): Promise<OrderDocument[]> {
    const filter = estado ? { estado } : {};
    this.logger.log(
      `Listando pedidos${estado ? ` con estado: ${estado}` : ''}`,
    );
    return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Retorna pedidos pendientes de validación por el admin.
   * Usado para replay SSE al reconectar al canal admin.
   */
  async findPendingAdminValidation(): Promise<OrderDocument[]> {
    this.logger.log('Buscando pedidos pendientes de validación admin');
    return this.orderModel
      .find({ validadoPorAdmin: false, estado: OrderStatus.PENDIENTE })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Retorna pedidos aprobados por admin que no han sido entregados/cancelados.
   * Usado para replay SSE al reconectar al canal de cocina.
   */
  async findPendingKitchen(): Promise<OrderDocument[]> {
    this.logger.log('Buscando pedidos pendientes en cocina');
    return this.orderModel
      .find({
        validadoPorAdmin: true,
        estado: { $in: [OrderStatus.PENDIENTE, OrderStatus.EN_PREPARACION] },
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async updateStatus(
    id: string,
    estado: OrderStatus,
  ): Promise<OrderDocument | null> {
    this.logger.log(`Actualizando estado pedido ${id} -> ${estado}`);
    return this.orderModel
      .findByIdAndUpdate(id, { $set: { estado } }, { new: true })
      .exec();
  }

  async validateByAdmin(id: string): Promise<OrderDocument | null> {
    this.logger.log(`Validando pedido por admin — id: ${id}`);
    return this.orderModel
      .findByIdAndUpdate(
        id,
        { $set: { validadoPorAdmin: true } },
        { new: true },
      )
      .exec();
  }
}
