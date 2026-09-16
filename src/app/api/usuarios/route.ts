// Arquivo: src/app/api/usuarios/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializa o Supabase com a CHAVE MESTRA (Seguro, pois roda no servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// LISTAR USUÁRIOS
export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data.users);
}

// CRIAR USUÁRIO (Vantagem: Não desloga você do sistema como o signUp normal faz!)
export async function POST(request: Request) {
  const { email, password, role } = await request.json();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Já confirma o email automaticamente
    user_metadata: { role }
  });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data.user);
}

// REDEFINIR SENHA (Admin troca a senha de um usuário sem precisar do e-mail dele)
export async function PATCH(request: Request) {
  const { id, password } = await request.json();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

// DELETAR USUÁRIO
export async function DELETE(request: Request) {
  const { id } = await request.json();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}