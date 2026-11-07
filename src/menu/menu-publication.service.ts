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
import { UpdateMenuPublicationDto } from './dto/menu-publication.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { MenuWithDishes } from './types/menu-with-dishes.type';

@Injectable()
export class MenuPublicationService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Menu.name) private readonly menus: Model<MenuDocument>,
    @InjectModel(Dish.name) private readonly dishes: Model<DishDocument>,
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(LibraryDish.name)
    private readonly library: Model<LibraryDishDocument>,
    private readonly libraryService: DishLibraryService,
  ) {}

  async update(
    id: string,
    input: UpdateMenuPublicationDto,
  ): Promise<MenuWithDishes> {
    const ids = input.platos.flatMap((p) => (p.id ? [p.id] : []));
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Un plato no puede repetirse en el menú.');
    return this.connection.transaction(async (session) => {
      const menu = await this.menus.findById(id).session(session).lean();
      if (!menu) throw new NotFoundException('No existe el menú.');
      if (menu.estado === 'borrador')
        throw new BadRequestException(
          'Guarda este menú desde el editor de borradores.',
        );
      if (
        menu.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime()
      )
        throw new ConflictException(
          'El menú cambió. Recárgalo antes de guardar.',
        );
      const current = await this.dishes
        .find({ menuId: menu._id })
        .session(session)
        .lean();
      const removing = current.filter(
        (dish) => !dish.retirado && !ids.includes(String(dish._id)),
      );
      if (
        removing.length &&
        (await this.orders
          .exists({
            menuId: menu._id,
            'items.platoId': { $in: removing.map((dish) => dish._id) },
          })
          .session(session))
      )
        throw new ConflictException({
          code: 'DISH_HAS_ORDERS',
          message:
            'No puedes retirar un plato que ya tiene pedidos, incluso cancelados. Conserva el plato y pon su stock en 0 para marcarlo agotado.',
        });
      const byId = new Map(current.map((p) => [String(p._id), p]));
      const catalogIds = [
        ...new Set(
          input.platos.flatMap((p) => {
            const linked =
              p.catalogoId ??
              (p.id ? byId.get(p.id)?.catalogoId?.toString() : undefined);
            return linked ? [linked] : [];
          }),
        ),
      ];
      const catalog = await this.library
        .find({
          _id: { $in: catalogIds.map((value) => new Types.ObjectId(value)) },
        })
        .session(session)
        .lean();
      const byCatalogId = new Map(catalog.map((p) => [String(p._id), p]));
      const retained: Types.ObjectId[] = [];
      const usedCatalog = new Set<string>();
      for (const [orden, row] of input.platos.entries()) {
        const old = row.id ? byId.get(row.id) : undefined;
        if (row.id && !old)
          throw new BadRequestException(
            'Uno de los platos no pertenece a este menú.',
          );
        if (
          old?.catalogoId &&
          row.catalogoId &&
          String(old.catalogoId) !== row.catalogoId
        )
          throw new BadRequestException(
            'No puedes cambiar la asociación de un plato existente.',
          );
        const catalogId = old?.catalogoId?.toString() ?? row.catalogoId;
        const source = catalogId ? byCatalogId.get(catalogId) : undefined;
        if (catalogId) {
          if (usedCatalog.has(catalogId))
            throw new BadRequestException(
              'Un plato de biblioteca no puede repetirse.',
            );
          usedCatalog.add(catalogId);
        }
        if ((!old || old.retirado) && (!source || !source.activo))
          throw new BadRequestException(
            'Elige un plato activo de la biblioteca para agregarlo.',
          );
        const name = (old?.nombre ?? source?.nombre ?? '').trim();
        if (!name)
          throw new BadRequestException('Completa el nombre del plato.');
        const isHipo = old?.es_hipo ?? source!.esHipo;
        if (source && !old?.catalogoId && old && old.es_hipo !== source.esHipo)
          throw new BadRequestException(
            'La ficha seleccionada no corresponde al tipo de plato.',
          );
        const proteins = row.opcionesProteina ?? old?.opciones ?? [];
        const allowed = new Set([
          ...(old?.opciones ?? []),
          ...(source?.opciones ?? []),
        ]);
        if (
          (isHipo &&
            (!proteins.length || proteins.some((p) => !allowed.has(p)))) ||
          (!isHipo && proteins.length)
        )
          throw new BadRequestException(
            'Revisa las proteínas del hipocalórico.',
          );
        const image = old?.imagen_url ?? source?.imagenUrl;
        const publicId = old?.imagenPublicId ?? source?.imagenPublicId;
        if (!old) this.libraryService.assertImage(image!, publicId!);
        let stock = old?.stock;
        let stockInicial = old?.stockInicial;
        if (!old && row.stock == null)
          throw new BadRequestException(
            'Indica las porciones disponibles del nuevo plato.',
          );
        if (row.stock != null) {
          if (
            old &&
            (row.expectedStock == null || row.expectedStock !== old.stock)
          )
            throw new ConflictException({
              code: 'STOCK_CHANGED',
              message: `El stock de ${old.nombre} cambió mientras editabas. Recarga el menú antes de ajustar las porciones.`,
            });
          stock = row.stock;
          stockInicial = old
            ? Math.max(
                row.stock,
                (old.stockInicial ?? old.stock) + row.stock - old.stock,
              )
            : row.stock;
          if (!Number.isSafeInteger(stockInicial))
            throw new BadRequestException(
              'La cantidad de porciones es demasiado grande.',
            );
        }
        const special =
          row.precioEspecial == null || row.precioEspecial === input.precioBase
            ? null
            : row.precioEspecial;
        const values = {
          ...(catalogId ? { catalogoId: new Types.ObjectId(catalogId) } : {}),
          nombre: name,
          descripcion: old?.descripcion ?? source?.descripcion ?? '',
          categoria: old?.categoria ?? source?.categoria,
          imagen_url: image,
          imagenPublicId: publicId,
          es_hipo: isHipo,
          opciones: proteins,
          precio: special ?? input.precioBase,
          precioEspecial: special,
          orden,
          retirado: false,
          ...(!old || row.stock != null ? { stock, stockInicial } : {}),
        };
        if (old) {
          await this.dishes.updateOne(
            { _id: old._id, menuId: menu._id },
            { $set: values },
            { session, runValidators: true },
          );
          retained.push(old._id);
        } else {
          const [created] = await this.dishes.create(
            [{ ...values, menuId: menu._id }],
            { session },
          );
          retained.push(created._id);
        }
      }
      // Retain the original IDs and stock so old orders can still be cancelled safely.
      await this.dishes.updateMany(
        { menuId: menu._id, _id: { $nin: retained }, retirado: { $ne: true } },
        { $set: { retirado: true } },
        { session },
      );
      const updated = await this.menus
        .findOneAndUpdate(
          { _id: menu._id, updatedAt: menu.updatedAt },
          { $set: { precioBase: input.precioBase } },
          { new: true, session, runValidators: true },
        )
        .lean();
      if (!updated)
        throw new ConflictException(
          'El menú cambió. Recárgalo antes de guardar.',
        );
      const platos = await this.dishes
        .find({ menuId: menu._id })
        .sort({ orden: 1, _id: 1 })
        .session(session)
        .lean<(Dish & { _id: Types.ObjectId })[]>();
      const used = new Set(
        (
          await this.orders
            .distinct<'items.platoId', Types.ObjectId>('items.platoId', {
              menuId: menu._id,
            })
            .session(session)
        ).map(String),
      );
      return {
        ...updated,
        platos: platos.map((dish) => ({
          ...dish,
          tienePedidos: used.has(String(dish._id)),
        })),
      };
    });
  }
}
