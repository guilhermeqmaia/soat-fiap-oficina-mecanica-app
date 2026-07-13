# Stage 02 — App: le o estado do stage 01 (cluster kind local). A leitura deste
# estado garante a ordem: o stage 01 precisa ter sido aplicado antes do 02.
data "terraform_remote_state" "cluster" {
  backend = "local"
  config = {
    path = var.cluster_state_path
  }
}
