// Buscar si el usuario ya existe
// eslint-disable-next-line prefer-const
let { data: userData, error: usuarioError } = await client
  .from('usuarios')
  .select('id, email, nombre, auth_id')
  .eq('auth_id', auth_id);

if (usuarioError) {
  // eslint-disable-next-line no-useless-escape
  console.error('❌ [API Users Verify] Error buscando usuario:', usuarioError);
  throw usuarioError;
} 