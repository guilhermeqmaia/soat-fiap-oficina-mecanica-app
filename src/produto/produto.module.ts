import { Module } from '@nestjs/common';
import { ProdutoService } from './application/produto.service';
import { MovimentacaoEstoqueService } from './application/movimentacao-estoque.service';
import { EstoqueBaixoListener } from './application/listeners/estoque-baixo.listener';
import { ProdutoController } from './infrastructure/produto.controller';
import { PrismaProdutoRepository } from './infrastructure/prisma-produto.repository';
import { PrismaMovimentacaoEstoqueRepository } from './infrastructure/prisma-movimentacao-estoque.repository';
import { PrismaEstoqueUnitOfWork } from './infrastructure/prisma-estoque-unit-of-work';
import { PRODUTO_REPOSITORY } from './domain/produto.repository';
import { MOVIMENTACAO_ESTOQUE_REPOSITORY } from './domain/movimentacao-estoque.repository';
import { ESTOQUE_UNIT_OF_WORK } from './domain/estoque-unit-of-work';

@Module({
  controllers: [ProdutoController],
  providers: [
    ProdutoService,
    MovimentacaoEstoqueService,
    EstoqueBaixoListener,
    {
      provide: PRODUTO_REPOSITORY,
      useClass: PrismaProdutoRepository,
    },
    {
      provide: MOVIMENTACAO_ESTOQUE_REPOSITORY,
      useClass: PrismaMovimentacaoEstoqueRepository,
    },
    {
      provide: ESTOQUE_UNIT_OF_WORK,
      useClass: PrismaEstoqueUnitOfWork,
    },
  ],
  exports: [ProdutoService, MovimentacaoEstoqueService, PRODUTO_REPOSITORY],
})
export class ProdutoModule {}
