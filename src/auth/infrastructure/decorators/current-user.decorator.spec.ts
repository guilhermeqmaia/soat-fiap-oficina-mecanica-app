import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';
import { Usuario } from '../../domain/usuario.entity';
import { Role } from '../../domain/role.enum';

const ROUTE_ARGS_METADATA = '__routeArguments__';

function getDecoratorFactory(decorator: () => ParameterDecorator) {
  class TestController {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test(@(decorator()) _value: any) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'test');
  return args[Object.keys(args)[0]].factory;
}

describe('CurrentUser decorator', () => {
  const factory = getDecoratorFactory(CurrentUser as any);

  it('should extract user from request', () => {
    const mockUser = Usuario.reconstitute({
      id: 'user-123',
      nome: 'Test',
      email: 'test@example.com',
      senhaHash: 'hash',
      role: Role.ATENDENTE,
      ativo: true,
    });

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as ExecutionContext;

    const result = factory(undefined, mockContext);

    expect(result).toBe(mockUser);
  });

  it('should return undefined when no user in request', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    } as ExecutionContext;

    const result = factory(undefined, mockContext);

    expect(result).toBeUndefined();
  });
});
