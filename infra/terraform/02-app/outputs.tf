# Stage 02 — App: outputs.

output "app_namespace" {
  description = "Namespace onde a app deve ser deployada (US-F2-05)."
  value       = kubernetes_namespace.app.metadata[0].name
}

output "database_endpoint" {
  description = "host:port do banco (Service DNS do Postgres no cluster kind)."
  value       = local.database_endpoint
}

output "database_url" {
  description = "DATABASE_URL completa. Recupere com: terraform output -raw database_url"
  value       = local.database_url
  sensitive   = true
}

output "db_secret_name" {
  description = "Nome do Secret com a DATABASE_URL — referenciado pelos manifestos da US-F2-05."
  value       = kubernetes_secret.db.metadata[0].name
}

output "kubeconfig_path" {
  description = "Caminho do kubeconfig (passthrough do stage 01)."
  value       = pathexpand(var.kubeconfig_path)
}

output "connect_command" {
  description = "Comando para conectar o kubectl (vindo do stage 01)."
  value       = data.terraform_remote_state.cluster.outputs.connect_command
}
