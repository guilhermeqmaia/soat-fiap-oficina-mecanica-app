import app from './app';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Oficina API rodando em http://localhost:${PORT}`);
  console.log('\nRotas disponíveis:');
  console.log('  POST   /ordens-servico/:id/produtos');
  console.log('  DELETE /ordens-servico/:id/produtos/:produtoId');
});
