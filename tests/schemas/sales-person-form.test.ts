import {
  EMPTY_SALES_PERSON,
  SalesPersonCreateFormSchema,
  SalesPersonEditFormSchema,
  toCreateRequest,
  toUpdateRequest,
} from '@/schemas/sales-person-form'
import {
  SalesPersonCreateRequestSchema,
  SalesPersonUpdateRequestSchema,
} from '@/schemas/sales-person'

const valid = {
  name: '山田太郎',
  email: 'yamada@example.com',
  password: 'Test1234!',
  department: '営業1課',
  is_manager: false,
}
const messagesOf = (schema: typeof SalesPersonCreateFormSchema, values: Partial<typeof valid>) => {
  const result = schema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('SalesPersonCreateFormSchema', () => {
  it('必須項目をすべて入力すれば有効', () => {
    expect(messagesOf(SalesPersonCreateFormSchema, {})).toEqual([])
  })

  it('氏名・部署・メール・パスワードは必須', () => {
    expect(messagesOf(SalesPersonCreateFormSchema, { name: '' })).toEqual(['氏名は必須項目です'])
    expect(messagesOf(SalesPersonCreateFormSchema, { department: ' ' })).toEqual([
      '部署は必須項目です',
    ])
    expect(messagesOf(SalesPersonCreateFormSchema, { email: '' })).toEqual([
      'メールアドレスは必須項目です',
    ])
    expect(messagesOf(SalesPersonCreateFormSchema, { password: '' })).toEqual([
      'パスワードは必須項目です',
    ])
  })

  it('メールの形式とパスワードの 8 文字以上を検証する', () => {
    expect(messagesOf(SalesPersonCreateFormSchema, { email: 'abc' })).toEqual([
      'メールアドレスの形式が正しくありません',
    ])
    expect(messagesOf(SalesPersonCreateFormSchema, { password: '1234567' })).toEqual([
      'パスワードは8文字以上で入力してください',
    ])
    expect(messagesOf(SalesPersonCreateFormSchema, { password: '12345678' })).toEqual([])
  })

  it('氏名・部署は 100 文字まで', () => {
    expect(messagesOf(SalesPersonCreateFormSchema, { name: 'あ'.repeat(101) })).toEqual([
      '氏名は100文字以内で入力してください',
    ])
    expect(messagesOf(SalesPersonCreateFormSchema, { department: 'あ'.repeat(101) })).toEqual([
      '部署は100文字以内で入力してください',
    ])
  })
})

describe('SalesPersonEditFormSchema', () => {
  it('パスワードが空でも有効（編集 API はパスワードを受け取らない）', () => {
    expect(messagesOf(SalesPersonEditFormSchema, { password: '' })).toEqual([])
  })
})

describe('リクエストへの変換', () => {
  it('登録: 前後の空白を除き、パスワードはそのまま送る。API のスキーマで有効', () => {
    const request = toCreateRequest({
      ...valid,
      name: ' 山田太郎 ',
      department: ' 営業1課 ',
      email: ' yamada@example.com ',
      password: ' pass word ',
    })

    expect(request).toEqual({
      name: '山田太郎',
      email: 'yamada@example.com',
      password: ' pass word ',
      department: '営業1課',
      is_manager: false,
    })
    expect(SalesPersonCreateRequestSchema.safeParse(request).success).toBe(true)
  })

  it('更新: パスワードを含めない。API のスキーマで有効', () => {
    const request = toUpdateRequest({ ...valid, is_manager: true })

    expect(request).toEqual({
      name: '山田太郎',
      email: 'yamada@example.com',
      department: '営業1課',
      is_manager: true,
    })
    expect(request).not.toHaveProperty('password')
    expect(SalesPersonUpdateRequestSchema.safeParse(request).success).toBe(true)
  })

  it('初期値は一般権限・空の入力', () => {
    expect(EMPTY_SALES_PERSON).toEqual({
      name: '',
      email: '',
      password: '',
      department: '',
      is_manager: false,
    })
  })
})

describe('API のスキーマとの整合', () => {
  it.each([
    ['name', 100],
    ['department', 100],
  ] as const)('%s の上限（%i 文字）はフォームと API で一致する', (key, max) => {
    for (const length of [max, max + 1]) {
      const values = { ...valid, [key]: 'あ'.repeat(length) }
      const formOk = SalesPersonCreateFormSchema.safeParse(values).success
      const apiOk = SalesPersonCreateRequestSchema.safeParse(toCreateRequest(values)).success
      expect(formOk).toBe(apiOk)
    }
  })
})
