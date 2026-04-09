import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { Cliente } from "./cliente.entity";
import { ClienteRepository, PaginatedResult } from "./cliente.repository";
import { CreateClienteDto } from "./dto/create-cliente.dto";
import { UpdateClienteDto } from "./dto/update-cliente.dto";

@Injectable()
export class ClienteService {
  constructor(
    @Inject("ClienteRepository")
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async create(dto: CreateClienteDto): Promise<Cliente> {
    const existing = await this.clienteRepository.findByCpfCnpj(dto.cpfCnpj);
    if (existing) {
      throw new ConflictException("CPF/CNPJ ja cadastrado");
    }

    try {
      const cliente = Cliente.create({
        nome: dto.nome,
        cpfCnpj: dto.cpfCnpj,
        telefone: dto.telefone,
        email: dto.email,
        endereco: dto.endereco,
      });

      return this.clienteRepository.create(cliente);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Dados invalidos";
      throw new BadRequestException(message);
    }
  }

  async findAll(page = 1, limit = 10): Promise<PaginatedResult<Cliente>> {
    return this.clienteRepository.findAll({ page, limit });
  }

  async findById(id: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado");
    }
    return cliente;
  }

  async findByCpfCnpj(cpfCnpj: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findByCpfCnpj(cpfCnpj);
    if (!cliente) {
      throw new NotFoundException("Cliente nao encontrado");
    }
    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto): Promise<Cliente> {
    await this.findById(id);
    return this.clienteRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    const hasActiveOS =
      await this.clienteRepository.hasActiveOrdemDeServico(id);
    if (hasActiveOS) {
      throw new ConflictException(
        "Nao e possivel remover cliente com Ordem de Servico em andamento",
      );
    }

    await this.clienteRepository.softDelete(id);
  }
}
