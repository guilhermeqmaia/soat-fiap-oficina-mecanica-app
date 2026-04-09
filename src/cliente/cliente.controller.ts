import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";

@Controller("clientes")
export class ClienteController {
  constructor(private readonly clienteService: ClienteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClienteDto) {
    return this.clienteService.create(dto);
  }

  @Get()
  findAll(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.clienteService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.clienteService.findById(id);
  }

  @Get("documento/:cpfCnpj")
  findByCpfCnpj(@Param("cpfCnpj") cpfCnpj: string) {
    return this.clienteService.findByCpfCnpj(cpfCnpj);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateClienteDto) {
    return this.clienteService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.clienteService.remove(id);
  }
}
