import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { CreateDishDto } from '../dto/create-dish.dto';
import { UpdateDishDto } from '../dto/update-dish.dto';
import { Dish, DishDocument } from '../schemas/dish.schema';

@Injectable()
export class DishesRepository {
  private readonly logger = new Logger(DishesRepository.name);

  constructor(
    @InjectModel(Dish.name)
    private readonly dishModel: Model<DishDocument>,
  ) {}

  async create(createDishDto: CreateDishDto): Promise<DishDocument> {
    const dish = new this.dishModel({
      ...createDishDto,
      menuId: new Types.ObjectId(createDishDto.menuId),
    });
    return dish.save();
  }

  async findByMenuId(menuId: string, session?: ClientSession): Promise<Dish[]> {
    this.logger.log(`Buscando platos para menuId: ${menuId}`);
    const dishes = await this.dishModel
      .find({ menuId: new Types.ObjectId(menuId) })
      .session(session ?? null)
      .sort({ orden: 1, _id: 1 })
      .lean<Dish[]>();
    return dishes;
  }

  async findById(id: string): Promise<Dish | null> {
    return this.dishModel.findById(id).lean<Dish>();
  }

  async update(id: string, updateDishDto: UpdateDishDto): Promise<Dish | null> {
    return this.dishModel
      .findByIdAndUpdate(id, { $set: updateDishDto }, { new: true })
      .lean<Dish>();
  }

  async reserveStock(
    id: string,
    menuId: string,
    quantity: number,
    session: ClientSession,
  ): Promise<Dish | null> {
    return this.dishModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          menuId: new Types.ObjectId(menuId),
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { new: true, session },
      )
      .lean<Dish>();
  }

  async restoreStock(
    id: string,
    quantity: number,
    session: ClientSession,
  ): Promise<void> {
    await this.dishModel.updateOne(
      { _id: id },
      { $inc: { stock: quantity } },
      { session },
    );
  }

  async updateStock(id: string, stock: number): Promise<Dish | null> {
    return this.dishModel
      .findByIdAndUpdate(id, { $set: { stock } }, { new: true })
      .lean<Dish>();
  }

  async remove(id: string): Promise<Dish | null> {
    return this.dishModel.findByIdAndDelete(id).lean<Dish>();
  }

  async removeByMenuId(menuId: string): Promise<void> {
    await this.dishModel.deleteMany({ menuId: new Types.ObjectId(menuId) });
  }

  async copyToMenu(
    fromMenuId: string,
    toMenuId: string,
    session?: ClientSession,
  ): Promise<void> {
    const dishes = await this.findByMenuId(fromMenuId, session);
    const copies = dishes.map((dish) => ({
      menuId: new Types.ObjectId(toMenuId),
      catalogoId: dish.catalogoId,
      nombre: dish.nombre,
      descripcion: dish.descripcion,
      categoria: dish.categoria,
      imagen_url: dish.imagen_url,
      imagenPublicId: dish.imagenPublicId,
      precio: dish.precio,
      precioEspecial: dish.precioEspecial,
      es_hipo: dish.es_hipo,
      opciones: dish.opciones,
      orden: dish.orden,
      stock: 0,
      stockInicial: 0,
    }));
    if (copies.length) await this.dishModel.insertMany(copies, { session });
  }
}
