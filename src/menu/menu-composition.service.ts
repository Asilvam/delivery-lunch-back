import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Menu, MenuDocument } from './schemas/menu.schema';
import { Dish, DishDocument } from '../dishes/schemas/dish.schema';
import {
  LibraryDish,
  LibraryDishDocument,
} from '../dish-library/dish-library.schema';
import { DishLibraryService } from '../dish-library/dish-library.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { MenuCompositionDto } from './dto/menu-composition.dto';

export interface AdminMenuData {
  _id: unknown;
  fecha: string;
  precioBase: number;
  estado?: string;
  updatedAt?: Date;
  platos?: Dish[];
}

@Injectable()
export class MenuCompositionService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Menu.name) private readonly menus: Model<MenuDocument>,
    @InjectModel(Dish.name) private readonly dishes: Model<DishDocument>,
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(LibraryDish.name)
    private readonly library: Model<LibraryDishDocument>,
    private readonly libraryService: DishLibraryService,
  ) {}

  async list(fecha?: string): Promise<AdminMenuData[]> {
    if (fecha) {
      const menu = await this.menus.findOne({ fecha }).lean();
      const used = menu
        ? new Set(
            (
              await this.orders.distinct<'items.platoId', Types.ObjectId>(
                'items.platoId',
                {
                  menuId: menu._id,
                },
              )
            ).map(String),
          )
        : new Set<string>();
      return menu
        ? [
            {
              ...menu,
              platos: await this.dishes
                .find({ menuId: menu._id })
                .sort({ orden: 1, _id: 1 })
                .lean()
                .then((dishes) =>
                  dishes.map((dish) => ({
                    ...dish,
                    tienePedidos: used.has(String(dish._id)),
                  })),
                ),
            },
          ]
        : [];
    }
    return this.menus
      .find()
      .sort({ fecha: -1 })
      .limit(90)
      .select('fecha estado precioBase updatedAt')
      .lean();
  }

  async save(input: MenuCompositionDto, id?: string) {
    if (input.estado === 'publicado' && !input.platos.length)
      throw new BadRequestException(
        'Selecciona al menos un plato para publicar.',
      );
    if (
      new Set(input.platos.map((p) => p.catalogoId)).size !==
      input.platos.length
    )
      throw new BadRequestException('Un plato no puede repetirse en el menú.');
    await this.menus.init();
    try {
      return await this.connection.transaction(async (session) => {
        const existing = id
          ? await this.menus.findById(id).session(session).lean()
          : null;
        if (id && !existing) throw new NotFoundException('No existe el menú.');
        if (
          existing &&
          (existing.estado !== 'borrador' || existing.fecha !== input.fecha)
        )
          throw new ConflictException(
            'Solo puedes modificar la composición de un borrador y conservar su fecha.',
          );
        if (
          id &&
          (!input.expectedUpdatedAt ||
            new Date(input.expectedUpdatedAt).getTime() !==
              existing!.updatedAt.getTime())
        )
          throw new ConflictException(
            'El borrador cambió. Recárgalo antes de guardar.',
          );
        const catalog = await this.library
          .find({
            _id: {
              $in: input.platos.map((p) => new Types.ObjectId(p.catalogoId)),
            },
          })
          .session(session)
          .lean();
        const byId = new Map(catalog.map((p) => [String(p._id), p]));
        const snapshots = input.platos.map((row, orden) => {
          const dish = byId.get(row.catalogoId);
          if (!dish || !dish.activo)
            throw new BadRequestException(
              'Uno de los platos ya no está activo en la biblioteca. Revisa la selección.',
            );
          this.libraryService.assertImage(dish.imagenUrl, dish.imagenPublicId);
          if (input.estado === 'publicado' && row.stock < 1)
            throw new BadRequestException(
              'Cada plato publicado debe tener al menos una porción.',
            );
          const opciones = row.opcionesProteina ?? [];
          if (
            dish.esHipo &&
            ((input.estado === 'publicado' && !opciones.length) ||
              opciones.some((p) => !dish.opciones.includes(p)))
          )
            throw new BadRequestException(
              'Elige proteínas disponibles en la ficha del hipocalórico.',
            );
          if (!dish.esHipo && opciones.length)
            throw new BadRequestException(
              'Solo el hipocalórico permite elegir proteínas.',
            );
          const precioEspecial =
            row.precioEspecial == null ||
            row.precioEspecial === input.precioBase
              ? null
              : row.precioEspecial;
          return {
            catalogoId: dish._id,
            nombre: dish.nombre,
            descripcion: dish.descripcion,
            categoria: dish.categoria,
            imagen_url: dish.imagenUrl,
            imagenPublicId: dish.imagenPublicId,
            es_hipo: dish.esHipo,
            opciones,
            precio: precioEspecial ?? input.precioBase,
            precioEspecial,
            stock: row.stock,
            stockInicial: row.stock,
            orden,
          };
        });
        const { fecha, precioBase, estado, ensalada, pan, postre } = input;
        const values = { fecha, precioBase, estado, ensalada, pan, postre };
        const menu = existing
          ? await this.menus.findOneAndUpdate(
              {
                _id: existing._id,
                estado: 'borrador',
                updatedAt: existing.updatedAt,
              },
              { $set: values },
              { new: true, runValidators: true, session },
            )
          : (await this.menus.create([values], { session }))[0];
        if (!menu)
          throw new ConflictException(
            'El menú cambió. Recarga antes de guardar.',
          );
        if (existing)
          await this.dishes.deleteMany({ menuId: menu._id }).session(session);
        if (snapshots.length)
          await this.dishes.insertMany(
            snapshots.map((p) => ({ ...p, menuId: menu._id })),
            { session },
          );
        const platos = await this.dishes
          .find({ menuId: menu._id })
          .sort({ orden: 1, _id: 1 })
          .session(session)
          .lean();
        return { ...menu.toObject(), platos };
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      )
        throw new ConflictException(
          'Ya existe un menú para esa fecha. Ábrelo para revisarlo.',
        );
      throw error;
    }
  }
}
