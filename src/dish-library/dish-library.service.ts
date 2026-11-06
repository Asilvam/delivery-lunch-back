import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { LibraryDish, LibraryDishDocument } from './dish-library.schema';
import { CreateLibraryDishDto, UpdateLibraryDishDto } from './dish-library.dto';
import { INITIAL_DISH_LIBRARY } from './data/initial-dish-library';

@Injectable()
export class DishLibraryService {
  constructor(
    @InjectModel(LibraryDish.name)
    private readonly dishes: Model<LibraryDishDocument>,
    private readonly config: ConfigService,
  ) {}

  list() {
    return this.dishes.find().sort({ nombre: 1 }).lean().exec();
  }

  assertImage(url: string, publicId: string) {
    const cloud = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    let valid = false;
    try {
      const parsed = new URL(url);
      const tail = parsed.pathname.split(`/${cloud}/image/upload/`)[1];
      valid =
        parsed.protocol === 'https:' &&
        parsed.hostname === 'res.cloudinary.com' &&
        Boolean(tail) &&
        tail.replace(/^v\d+\//, '').replace(/\.[^./]+$/, '') === publicId;
    } catch {
      /* Invalid URL is reported below. */
    }
    if (!valid)
      throw new BadRequestException(
        'Sube una fotografía a Cloudinary para este plato.',
      );
  }

  private validate(input: CreateLibraryDishDto) {
    this.assertImage(input.imagenUrl, input.imagenPublicId);
    const opciones = (input.opciones ?? [])
      .map((value) => value.trim())
      .filter(Boolean);
    if (!input.nombre.trim() || !input.categoria.trim())
      throw new BadRequestException('Completa el nombre y la categoría.');
    if (input.esHipo && !opciones.length)
      throw new BadRequestException(
        'Agrega al menos una proteína para el hipocalórico.',
      );
    if (!input.esHipo && opciones.length)
      throw new BadRequestException(
        'Solo el hipocalórico permite elegir proteína.',
      );
    if (new Set(opciones).size !== opciones.length)
      throw new BadRequestException('Las proteínas no pueden repetirse.');
    return {
      ...input,
      nombre: input.nombre.trim(),
      categoria: input.categoria.trim(),
      opciones,
    };
  }

  async create(input: CreateLibraryDishDto) {
    return this.dishes.create({ ...this.validate(input), clave: randomUUID() });
  }

  async update(id: string, input: UpdateLibraryDishDto) {
    const current = await this.dishes.findById(id).lean();
    if (!current)
      throw new NotFoundException('No existe el plato en la biblioteca.');
    const merged = this.validate({ ...current, ...input });
    // Only explicitly editable fields are written; the stable catalog key never changes.
    const {
      nombre,
      descripcion,
      categoria,
      imagenUrl,
      imagenPublicId,
      esHipo,
      opciones,
      activo,
      notaInterna,
    } = merged;
    return this.dishes
      .findByIdAndUpdate(
        id,
        {
          $set: {
            nombre,
            descripcion,
            categoria,
            imagenUrl,
            imagenPublicId,
            esHipo,
            opciones,
            activo,
            notaInterna,
          },
        },
        { new: true, runValidators: true },
      )
      .lean();
  }

  async importInitial() {
    for (const dish of INITIAL_DISH_LIBRARY) this.validate(dish);
    await this.dishes.init();
    const result = await this.dishes.bulkWrite(
      INITIAL_DISH_LIBRARY.map((dish) => ({
        updateOne: {
          filter: { clave: dish.clave },
          update: {
            $setOnInsert: {
              ...dish,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          timestamps: false,
          upsert: true,
        },
      })),
    );
    return {
      agregados: result.upsertedCount,
      existentes: INITIAL_DISH_LIBRARY.length - result.upsertedCount,
    };
  }
}
