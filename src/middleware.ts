import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/server/cookies'
import { verifySessionToken } from '@/server/jwt'

/**
 * 未ログインのアクセスをログイン画面へ送る（Edge ランタイムで動く）。
 *
 * ここで確認するのは JWT の署名と有効期限だけ。ユーザーの存在・失効の確認は DB が必要なため、
 * 各ページ・API（`getSessionUser` / `requireAuth`）で行う（middleware だけに頼らない）。
 * 逆方向（ログイン済みで /login を開いたら一覧へ）は、失効済みのトークンで遷移を繰り返さないよう、
 * DB で確認できるログイン画面のページ側で行う。
 */
const PUBLIC_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token && (await verifySessionToken(token)).ok) return NextResponse.next()

  // Server Action などの POST はリダイレクトできないため、401 を返す
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse(null, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''

  const original = request.nextUrl.clone()
  original.searchParams.delete('_rsc') // Next.js 内部のクエリは遷移先に含めない
  const target = original.pathname + original.search
  if (target !== '/') loginUrl.searchParams.set('redirect', target)

  const response = NextResponse.redirect(loginUrl)
  // 期限切れ・不正な Cookie が残り続けないよう削除する
  if (token) response.cookies.delete(SESSION_COOKIE)
  return response
}

export const config = {
  // API（Route Handler が自分で認証する）と静的ファイルは対象外
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
