import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Criamos uma resposta inicial
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // No Next.js 16, o getUser() é o método mais seguro para validar a sessão no servidor
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  // A tela de redefinir senha precisa carregar sem sessão prévia: é lá que o
  // link de recuperação troca o código pelo acesso temporário.
  const isPublicPage = isLoginPage || request.nextUrl.pathname.startsWith('/redefinir-senha')

// LÓGICA DE BLOQUEIO
  if (!user && !isPublicPage) {
    // 1. Melhoramos o seu log no terminal para mostrar a rota exata
    console.log(`❌ Acesso negado: Tentativa de acessar [${request.nextUrl.pathname}] sem sessão.`);
    
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    
    // 2. O Pulo do Gato: Adicionamos um parâmetro na URL para avisar o frontend
    // Ex: o site vai redirecionar para /login?erro=sessao_expirada
    url.searchParams.set('erro', 'sessao_expirada')
    
    return NextResponse.redirect(url)
  }

  // LÓGICA DE PULO (Se já logado, sai do login)
  if (user && isLoginPage) {
    console.log("✅ Usuário já logado: Indo para a Home.")
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Agora o middleware ignora arquivos com final .png, .jpg, .svg e .ttf (fontes)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf)$).*)'],
}