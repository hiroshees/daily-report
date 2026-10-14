'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormError } from '@/components/common/form-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api-client'
import { LoginRequestSchema, type LoginRequest } from '@/schemas/auth'

const GENERIC_ERROR = 'ログインに失敗しました。時間をおいてもう一度お試しください。'

type LoginFormProps = {
  /** ログイン成功後の遷移先（サーバー側で安全なパスに絞り込み済みのもの） */
  redirectTo: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  // 成功後、画面遷移が終わるまでボタンを押せないままにする
  const [redirecting, setRedirecting] = useState(false)

  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    // 入力のたびに検証し、不正な間はログインボタンを押せないようにする
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })
  const { isSubmitting, isValid } = form.formState

  async function onSubmit(values: LoginRequest) {
    setFormError(null)
    try {
      const { response, error } = await apiClient.POST('/auth/login', { body: values })

      if (response.ok) {
        setRedirecting(true)
        router.replace(redirectTo)
        router.refresh()
        return
      }

      if (response.status === 401) {
        // メールアドレスの有無は区別されない。パスワードは入力し直してもらう
        setFormError(error?.error.message ?? GENERIC_ERROR)
        form.resetField('password')
        form.setFocus('password')
        return
      }

      if (response.status === 400 && error?.error.details?.length) {
        for (const { field, message } of error.error.details) {
          if (field === 'email' || field === 'password') form.setError(field, { message })
        }
        return
      }

      setFormError(GENERIC_ERROR)
    } catch {
      setFormError(GENERIC_ERROR)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">営業日報システム</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          {/* ブラウザ標準の検証メッセージではなく、画面定義書のメッセージを表示する */}
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormError message={formError} />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>パスワード</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isSubmitting || redirecting}
            >
              {isSubmitting || redirecting ? 'ログイン中…' : 'ログイン'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
