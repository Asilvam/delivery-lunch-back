import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CustomerBlockDto, CustomerQueryDto } from './customers.dto';
import { CustomersService } from './customers.service';
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  @Get() list(@Query() query: CustomerQueryDto) {
    return this.customers.list(query);
  }
  @Patch(':googleId/block') block(
    @Param('googleId') googleId: string,
    @Body() input: CustomerBlockDto,
    @Req() req: { user: { username: string } },
  ) {
    return this.customers.setBlocked(googleId, input, req.user.username);
  }
}
