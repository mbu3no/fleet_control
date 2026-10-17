-- =====================================================================
-- Visualizador pode criar reservas (excecao ao papel padrao)
-- Continua nao podendo editar nem excluir — so insert.
-- Caso de uso: usuario com perfil 'viewer' precisa solicitar reserva de
-- veiculo. Admin/editor aprovam/editam/excluem normalmente.
-- =====================================================================

DROP POLICY IF EXISTS reservations_insert ON public.reservations;

CREATE POLICY reservations_insert ON public.reservations
  FOR INSERT WITH CHECK (public.current_user_role() IS NOT NULL);

SELECT 'reservations: qualquer usuario com perfil ativo pode criar' AS status;
