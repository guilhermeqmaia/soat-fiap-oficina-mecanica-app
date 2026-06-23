import { CriarUsuarioUseCase } from './criar-usuario.use-case';
import { BuscarUsuarioPorIdUseCase } from './buscar-usuario-por-id.use-case';
import { ListarUsuariosUseCase } from './listar-usuarios.use-case';
import { AtualizarUsuarioUseCase } from './atualizar-usuario.use-case';
import { DeletarUsuarioUseCase } from './deletar-usuario.use-case';
import { UsuarioNotFoundError } from '../../domain/errors/usuario-not-found.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { InvalidRoleError } from '../../domain/errors/invalid-role.error';
import { Role } from '../../../auth/domain/role.enum';
import { Usuario } from '../../../auth/domain/usuario.entity';

function makeHasher(hashValue = 'hashed_pw') {
  return { hash: jest.fn().mockResolvedValue(hashValue), compare: jest.fn() };
}

function fakeUsuario(overrides: Partial<{
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
  ativo: boolean;
}> = {}) {
  return Usuario.reconstitute({
    id: overrides.id ?? 'uuid-1',
    nome: overrides.nome ?? 'João',
    email: overrides.email ?? 'joao@test.com',
    senhaHash: overrides.senhaHash ?? 'hash',
    role: overrides.role ?? Role.MECANICO,
    ativo: overrides.ativo !== undefined ? overrides.ativo : true,
  });
}

function makeGateway(overrides: Record<string, any> = {}) {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    create: jest.fn((u) => Promise.resolve(u)),
    findAll: jest.fn(),
    update: jest.fn((u) => Promise.resolve(u)),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CriarUsuarioUseCase
// ---------------------------------------------------------------------------
describe('CriarUsuarioUseCase', () => {
  it('throws InvalidRoleError for invalid role', async () => {
    const gateway = makeGateway();
    const useCase = new CriarUsuarioUseCase(gateway as any, makeHasher() as any);
    await expect(
      useCase.execute({ nome: 'João', email: 'j@t.com', senha: '123', role: 'INVALIDO' }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('throws EmailAlreadyExistsError when email is taken', async () => {
    const gateway = makeGateway({ findByEmail: jest.fn().mockResolvedValue(fakeUsuario()) });
    const useCase = new CriarUsuarioUseCase(gateway as any, makeHasher() as any);
    await expect(
      useCase.execute({ nome: 'João', email: 'joao@test.com', senha: '123', role: 'MECANICO' }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it('creates user with hashed password and returns UsuarioOutput', async () => {
    const hasher = makeHasher('hashed_pw');
    const gateway = makeGateway();
    const useCase = new CriarUsuarioUseCase(gateway as any, hasher as any);
    const result = await useCase.execute({
      nome: 'João',
      email: 'joao@test.com',
      senha: 'senha123',
      role: 'MECANICO',
    });
    expect(hasher.hash).toHaveBeenCalledWith('senha123');
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(result.nome).toBe('João');
    expect(result.email).toBe('joao@test.com');
    expect(result.role).toBe('MECANICO');
    expect(result.ativo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BuscarUsuarioPorIdUseCase
// ---------------------------------------------------------------------------
describe('BuscarUsuarioPorIdUseCase', () => {
  it('throws UsuarioNotFoundError when not found', async () => {
    const gateway = makeGateway();
    const useCase = new BuscarUsuarioPorIdUseCase(gateway as any);
    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toBeInstanceOf(
      UsuarioNotFoundError,
    );
  });

  it('returns UsuarioOutput when found', async () => {
    const usuario = fakeUsuario({ id: 'uuid-1' });
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(usuario) });
    const useCase = new BuscarUsuarioPorIdUseCase(gateway as any);
    const result = await useCase.execute({ id: 'uuid-1' });
    expect(result.id).toBe('uuid-1');
    expect(result.nome).toBe('João');
    expect(result.email).toBe('joao@test.com');
    expect(result.ativo).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ListarUsuariosUseCase
// ---------------------------------------------------------------------------
describe('ListarUsuariosUseCase', () => {
  it('returns paginated UsuarioOutput', async () => {
    const usuario = fakeUsuario({ id: 'uuid-1' });
    const paginatedResult = { data: [usuario], total: 1, page: 1, limit: 10 };
    const gateway = makeGateway({ findAll: jest.fn().mockResolvedValue(paginatedResult) });
    const useCase = new ListarUsuariosUseCase(gateway as any);
    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('uuid-1');
  });

  it('returns empty paginated result', async () => {
    const paginatedResult = { data: [], total: 0, page: 1, limit: 10 };
    const gateway = makeGateway({ findAll: jest.fn().mockResolvedValue(paginatedResult) });
    const useCase = new ListarUsuariosUseCase(gateway as any);
    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AtualizarUsuarioUseCase
// ---------------------------------------------------------------------------
describe('AtualizarUsuarioUseCase', () => {
  it('throws UsuarioNotFoundError when usuario not found', async () => {
    const gateway = makeGateway();
    const useCase = new AtualizarUsuarioUseCase(gateway as any);
    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toBeInstanceOf(
      UsuarioNotFoundError,
    );
  });

  it('throws InvalidRoleError for invalid role', async () => {
    const usuario = fakeUsuario();
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(usuario) });
    const useCase = new AtualizarUsuarioUseCase(gateway as any);
    await expect(
      useCase.execute({ id: 'uuid-1', role: 'INVALIDO' }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('throws EmailAlreadyExistsError when new email belongs to another user', async () => {
    const usuario = fakeUsuario({ email: 'joao@test.com' });
    const outro = fakeUsuario({ id: 'uuid-2', email: 'maria@test.com' });
    const gateway = makeGateway({
      findById: jest.fn().mockResolvedValue(usuario),
      findByEmail: jest.fn().mockResolvedValue(outro),
    });
    const useCase = new AtualizarUsuarioUseCase(gateway as any);
    await expect(
      useCase.execute({ id: 'uuid-1', email: 'maria@test.com' }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
    expect(gateway.update).not.toHaveBeenCalled();
  });

  it('allows updating to the same email (no duplicate check)', async () => {
    const usuario = fakeUsuario({ id: 'uuid-1', email: 'joao@test.com' });
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(usuario) });
    const useCase = new AtualizarUsuarioUseCase(gateway as any);
    const result = await useCase.execute({ id: 'uuid-1', email: 'joao@test.com', nome: 'João Silva' });
    expect(gateway.findByEmail).not.toHaveBeenCalled();
    expect(result.email).toBe('joao@test.com');
  });

  it('updates and returns UsuarioOutput', async () => {
    const usuario = fakeUsuario({ id: 'uuid-1' });
    const updated = fakeUsuario({ id: 'uuid-1', nome: 'João Atualizado', ativo: false });
    const gateway = makeGateway({
      findById: jest.fn().mockResolvedValue(usuario),
      update: jest.fn().mockResolvedValue(updated),
    });
    const useCase = new AtualizarUsuarioUseCase(gateway as any);
    const result = await useCase.execute({ id: 'uuid-1', nome: 'João Atualizado', ativo: false });
    expect(result.nome).toBe('João Atualizado');
    expect(result.ativo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DeletarUsuarioUseCase
// ---------------------------------------------------------------------------
describe('DeletarUsuarioUseCase', () => {
  it('throws UsuarioNotFoundError when usuario not found', async () => {
    const gateway = makeGateway();
    const useCase = new DeletarUsuarioUseCase(gateway as any);
    await expect(useCase.execute({ id: 'nonexistent' })).rejects.toBeInstanceOf(
      UsuarioNotFoundError,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it('deletes usuario when found', async () => {
    const usuario = fakeUsuario({ id: 'uuid-1' });
    const gateway = makeGateway({ findById: jest.fn().mockResolvedValue(usuario) });
    const useCase = new DeletarUsuarioUseCase(gateway as any);
    await useCase.execute({ id: 'uuid-1' });
    expect(gateway.delete).toHaveBeenCalledWith('uuid-1');
  });
});
