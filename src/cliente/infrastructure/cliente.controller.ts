import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ClienteService } from "../application/cliente.service";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";
import { QueryClienteDto } from "./dto/query-cliente.dto";
import { DuplicateCpfCnpjError } from "../domain/errors/duplicate-cpf-cnpj.error";
import { InvalidCpfCnpjError } from "../domain/errors/invalid-cpf-cnpj.error";
import { normalizeCpfCnpj } from "../domain/value-objects/cpf-cnpj.utils";
import { Roles } from "../../auth/infrastructure/decorators/roles.decorator";
import { Role } from "../../auth/domain/role.enum";

const CPF_CNPJ_DIGIT_PATTERN = /^\d{11}$|^\d{14}$/;

@ApiTags("Clientes")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Token JWT ausente ou invalido" })
@ApiForbiddenResponse({ description: "Role insuficiente" })
@Controller("clientes")
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cadastrar um novo cliente" })
  @ApiCreatedResponse({ description: "Cliente criado com sucesso" })
  @ApiConflictResponse({ description: "CPF/CNPJ ja cadastrado" })
  @ApiBadRequestResponse({
    description: "CPF/CNPJ invalido ou dados obrigatorios ausentes",
  })
  async create(@Body() dto: CreateClienteDto) {
    try {
      return this.toResponse(await this.service.create(dto));
    } catch (error) {
      if (error instanceof DuplicateCpfCnpjError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof InvalidCpfCnpjError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: "Listar clientes com paginacao e filtro" })
  @ApiOkResponse({ description: "Lista de clientes paginada" })
  async findAll(@Query() query: QueryClienteDto) {
    const result = await this.service.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      nome: query.nome,
    });

    return {
      data: result.data.map((c) => this.toResponse(c)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get("documento/:cpfCnpj")
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: "Buscar cliente por CPF ou CNPJ" })
  @ApiParam({
    name: "cpfCnpj",
    description:
      "CPF ou CNPJ do cliente. Aceita com ou sem formatacao. " +
      "Para CNPJ com barra '/', envie apenas digitos ou URL-encode a barra (%2F).",
    example: "52998224725",
  })
  @ApiOkResponse({ description: "Cliente encontrado" })
  @ApiNotFoundResponse({ description: "Cliente nao encontrado" })
  @ApiBadRequestResponse({ description: "CPF/CNPJ com formato invalido" })
  async findByCpfCnpj(@Param("cpfCnpj") cpfCnpj: string) {
    const cleaned = normalizeCpfCnpj(cpfCnpj);
    if (!CPF_CNPJ_DIGIT_PATTERN.test(cleaned)) {
      throw new BadRequestException(
        "CPF/CNPJ deve conter 11 (CPF) ou 14 (CNPJ) digitos",
      );
    }
    return this.toResponse(await this.service.findByCpfCnpj(cleaned));
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: "Buscar cliente por ID" })
  @ApiOkResponse({ description: "Cliente encontrado" })
  @ApiNotFoundResponse({ description: "Cliente nao encontrado" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.toResponse(await this.service.findById(id));
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: "Atualizar um cliente" })
  @ApiOkResponse({ description: "Cliente atualizado com sucesso" })
  @ApiNotFoundResponse({ description: "Cliente nao encontrado" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.toResponse(await this.service.update(id, dto));
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remover um cliente (soft delete — marca ativo=false)",
  })
  @ApiOkResponse({ description: "Cliente removido com sucesso" })
  @ApiNotFoundResponse({ description: "Cliente nao encontrado" })
  async delete(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  private toResponse(cliente: {
    id?: string;
    nome: string;
    cpfCnpj: { value: string };
    telefone: string;
    email?: string | null;
    ativo: boolean;
  }) {
    return {
      id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      telefone: cliente.telefone,
      email: cliente.email,
      ativo: cliente.ativo,
    };
  }
}
